// AES-256-GCM secret encryption for the project credentials vault.
// Server-side ONLY. Values are encrypted at rest and decrypted on demand for
// authorized callers. The master key comes from ENCRYPTION_KEY and is never
// stored in the database.

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit nonce, recommended for GCM
const KEY_LENGTH = 32 // 256-bit key

/**
 * Load and validate the 32-byte encryption key. Accepts either 64 hex chars or
 * base64. Throws loudly if missing/malformed so secrets are never written under
 * a bad key.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not configured')
  }

  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length})`)
  }
  return key
}

/**
 * Encrypt a UTF-8 string. Output format: `iv.authTag.ciphertext`, each base64.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.')
}

/**
 * Decrypt a value produced by encryptSecret. Throws if the payload is malformed
 * or authentication fails (wrong key / tampered ciphertext).
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload')
  }
  const [ivB64, tagB64, dataB64] = parts
  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/** True if ENCRYPTION_KEY is present and valid — useful for health checks. */
export function isEncryptionConfigured(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}
