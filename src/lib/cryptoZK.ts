const PBKDF2_ITERATIONS = 250_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  kdf: "PBKDF2-SHA256";
  iter: number;
  alg: "AES-GCM-256";
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(n));
  crypto.getRandomValues(buf);
  return buf;
}

export function generateSalt(): string {
  return bytesToBase64(randomBytes(SALT_BYTES));
}

export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const pwKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const salt = base64ToBytes(saltB64);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    pwKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJson(
  key: CryptoKey,
  saltB64: string,
  data: unknown
): Promise<EncryptedPayload> {
  const iv = randomBytes(IV_BYTES);
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    ciphertext: bufferToBase64(buf),
    iv: bytesToBase64(iv),
    salt: saltB64,
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITERATIONS,
    alg: "AES-GCM-256",
  };
}

export async function decryptJson<T = unknown>(
  key: CryptoKey,
  payload: { ciphertext: string; iv: string }
): Promise<T> {
  const iv = base64ToBytes(payload.iv);
  const ct = base64ToBytes(payload.ciphertext);
  let buf: ArrayBuffer;
  try {
    buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  } catch {
    throw new Error("Wrong master password.");
  }
  const text = new TextDecoder().decode(buf);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Decrypted data is not valid JSON.");
  }
}

export function bytesToBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bufferToBase64(buf: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(buf));
}
