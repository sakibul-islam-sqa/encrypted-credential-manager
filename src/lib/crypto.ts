export function generatePassword(
  length = 20,
  opts: {
    upper?: boolean;
    lower?: boolean;
    digits?: boolean;
    symbols?: boolean;
  } = {}
): string {
  const upper = opts.upper ?? true;
  const lower = opts.lower ?? true;
  const digits = opts.digits ?? true;
  const symbols = opts.symbols ?? true;

  const pools: string[] = [];
  if (upper) pools.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
  if (lower) pools.push("abcdefghijkmnopqrstuvwxyz");
  if (digits) pools.push("23456789");
  if (symbols) pools.push("!@#$%^&*()-_=+[]{};:,.?/");
  if (pools.length === 0) pools.push("abcdefghijklmnopqrstuvwxyz");

  const all = pools.join("");
  const out: string[] = [];

  for (const p of pools) {
    out.push(p[secureRandomInt(p.length)]);
  }
  while (out.length < length) {
    out.push(all[secureRandomInt(all.length)]);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, length).join("");
}

function secureRandomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}
