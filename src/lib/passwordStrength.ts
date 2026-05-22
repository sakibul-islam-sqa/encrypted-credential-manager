export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
  score: StrengthScore;
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  entropyBits: number;
  suggestions: string[];
  warning: string | null;
}

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "p@ssword",
  "p@ssw0rd",
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "asdfgh",
  "zxcvbn",
  "letmein",
  "welcome",
  "admin",
  "administrator",
  "root",
  "iloveyou",
  "monkey",
  "dragon",
  "master",
  "abc123",
  "111111",
  "000000",
  "trustno1",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "superman",
  "batman",
]);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

function hasSequentialRun(pw: string, minRun = 4): boolean {
  const lower = pw.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i <= row.length - minRun; i++) {
      const slice = row.slice(i, i + minRun);
      if (lower.includes(slice) || lower.includes([...slice].reverse().join(""))) {
        return true;
      }
    }
  }
  for (let i = 0; i <= lower.length - minRun; i++) {
    let asc = true;
    let desc = true;
    for (let j = 1; j < minRun; j++) {
      const d = lower.charCodeAt(i + j) - lower.charCodeAt(i + j - 1);
      if (d !== 1) asc = false;
      if (d !== -1) desc = false;
    }
    if (asc || desc) return true;
  }
  return false;
}

function hasRepeats(pw: string, minRun = 3): boolean {
  let run = 1;
  for (let i = 1; i < pw.length; i++) {
    if (pw[i] === pw[i - 1]) {
      run += 1;
      if (run >= minRun) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

function charPoolSize(pw: string): number {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/\d/.test(pw)) size += 10;
  if (/[^A-Za-z0-9]/.test(pw)) size += 33;
  return size || 1;
}

export function estimateStrength(pw: string): StrengthResult {
  if (!pw) {
    return {
      score: 0,
      label: "Very weak",
      entropyBits: 0,
      suggestions: ["Enter a master password to see its strength."],
      warning: null,
    };
  }

  const uniqueChars = new Set(pw).size;
  const effectiveLength = Math.min(pw.length, uniqueChars * 2);
  const pool = charPoolSize(pw);
  let entropy = effectiveLength * Math.log2(pool);

  const suggestions: string[] = [];
  let warning: string | null = null;

  if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
    entropy = Math.min(entropy, 8);
    warning = "This is one of the most-used passwords in the world.";
  }

  if (hasSequentialRun(pw)) {
    entropy -= 12;
    suggestions.push("Avoid keyboard rows or sequences like `qwerty` or `1234`.");
  }
  if (hasRepeats(pw)) {
    entropy -= 8;
    suggestions.push("Avoid repeated characters like `aaa`.");
  }
  if (pw.length < 12) {
    suggestions.push("Use at least 12 characters - the longer, the better.");
  }
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw)) {
    suggestions.push("Mix upper- and lowercase letters.");
  }
  if (!/\d/.test(pw)) {
    suggestions.push("Add a number.");
  }
  if (!/[^A-Za-z0-9]/.test(pw)) {
    suggestions.push("Add a symbol such as `!`, `#`, or `_`.");
  }

  entropy = Math.max(0, entropy);

  let score: StrengthScore = 0;
  if (entropy >= 70) score = 4;
  else if (entropy >= 55) score = 3;
  else if (entropy >= 40) score = 2;
  else if (entropy >= 25) score = 1;

  if (pw.length < 8) score = 0;

  const label = (["Very weak", "Weak", "Fair", "Good", "Strong"] as const)[score];

  if (score >= 3 && suggestions.length === 0) {
    suggestions.push("Looks solid - store it somewhere safe.");
  }

  return {
    score,
    label,
    entropyBits: Math.round(entropy),
    suggestions,
    warning,
  };
}
