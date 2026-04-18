/**
 * AES-256-GCM Encryption Utilities
 * Used for encrypting BVN and NIN before database storage
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  // Key should be 32 bytes (64 hex chars) or 32 raw bytes
  if (key.length === 64) {
    return Buffer.from(key, 'hex')
  }
  if (key.length === 32) {
    return Buffer.from(key, 'utf8')
  }
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 32 raw chars)')
}

/**
 * Encrypt a plaintext field
 * @param plaintext - The string to encrypt
 * @returns Single string: 'iv:authTag:ciphertext' (all base64)
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value')
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
  ciphertext += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`
}

/**
 * Decrypt an encrypted field
 * @param encrypted - The encrypted string in format 'iv:authTag:ciphertext'
 * @returns Decrypted plaintext
 */
export function decryptField(encrypted: string): string {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty value')
  }

  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted field format')
  }

  const [ivBase64, authTagBase64, ciphertext] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Mask a decrypted field for display (show last N chars only)
 * @param encrypted - The encrypted field
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked string like '****5678'
 */
export function maskField(encrypted: string, visibleChars: number = 4): string {
  if (!encrypted) {
    return ''
  }

  try {
    const decrypted = decryptField(encrypted)
    const masked = '*'.repeat(Math.max(0, decrypted.length - visibleChars)) + decrypted.slice(-visibleChars)
    return masked
  } catch {
    return '****'
  }
}
