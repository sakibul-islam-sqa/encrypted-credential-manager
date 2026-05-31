import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Static security headers. The dynamic Content-Security-Policy is built per-build
// by buildCsp() below so its script-src hashes always match the emitted HTML.
const STATIC_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

function buildCsp(scriptHashes: string[]): string {
  const scriptSrc = [
    "'self'",
    ...scriptHashes.map((h) => `'${h}'`),
    "https://apis.google.com",
    "https://accounts.google.com",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.googleusercontent.com https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://accounts.google.com",
    "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Emits a Netlify `_headers` file into the build output. The CSP `script-src`
 * sha256 hashes are derived from the inline <script> blocks in the *built*
 * index.html, so they stay in sync automatically — no manual hash regeneration
 * when the inline anti-FOUC theme script changes.
 */
function cspHeaders(): Plugin {
  let root = process.cwd();
  let outDir = "dist";

  return {
    name: "csp-headers",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dir = resolve(root, outDir);
      const html = readFileSync(resolve(dir, "index.html"), "utf8");

      // Hash every inline <script> (one without a src attribute) exactly as the
      // browser does: over the raw text between the script tags.
      const hashes: string[] = [];
      const scriptRe = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
      for (const match of html.matchAll(scriptRe)) {
        const attrs = match[1] ?? "";
        if (/\bsrc\s*=/.test(attrs)) continue; // external script — no hash needed
        const digest = createHash("sha256").update(match[2], "utf8").digest("base64");
        hashes.push(`sha256-${digest}`);
      }

      const headers = { ...STATIC_HEADERS, "Content-Security-Policy": buildCsp(hashes) };
      const file =
        "/*\n" +
        Object.entries(headers)
          .map(([key, value]) => `  ${key}: ${value}`)
          .join("\n") +
        "\n";

      writeFileSync(resolve(dir, "_headers"), file, "utf8");
      this.info(`generated ${outDir}/_headers (${hashes.length} CSP script hash(es))`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspHeaders()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
