import type { EncryptedVaultDoc } from "./sync";

/**
 * Build the persisted vault document from an encryption result. Centralises the
 * `schemaVersion` so the create/migrate/persist paths can't drift apart.
 */
export function toEncryptedVaultDoc(
  payload: { ciphertext: string; iv: string },
  salt: string,
  updatedAt: number
): EncryptedVaultDoc {
  return {
    ciphertext: payload.ciphertext,
    iv: payload.iv,
    salt,
    updatedAt,
    schemaVersion: 2,
  };
}
