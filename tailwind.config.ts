import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      boxShadow: {
        glow: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px -10px rgba(99,102,241,0.22)",
        "glow-lg":
          "0 1px 2px rgba(15,23,42,0.05), 0 12px 32px -12px rgba(15,23,42,0.18), 0 6px 18px -10px rgba(99,102,241,0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
