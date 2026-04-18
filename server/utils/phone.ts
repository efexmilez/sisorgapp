/**
 * Nigerian Phone Number Utilities
 * All phones stored in E.164 format: +234XXXXXXXXXX
 */

// Validation regex: accepts both +234 and 0 prefix
export const PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/

/**
 * Normalize phone to E.164 format
 * @param input - Either '080XXXXXXXX' or '+234XXXXXXXXXX'
 * @returns '+234XXXXXXXXXX'
 * @throws Error if invalid Nigerian phone number
 */
export function normalizePhone(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid Nigerian phone number')
  }

  // Remove all non-digits
  const digits = input.replace(/\D/g, '')

  // Check if it starts with country code
  if (digits.startsWith('234')) {
    return `+${digits}`
  }

  // Check if it starts with 0
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`
  }

  throw new Error('Invalid Nigerian phone number')
}

/**
 * Validate phone number format
 * @param phone - Phone string to validate
 * @returns true if valid Nigerian phone number
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  return PHONE_REGEX.test(phone)
}

/**
 * Format E.164 phone for display
 * @param e164 - Phone in format '+2348012345678'
 * @returns Human readable format '080 123 45678'
 */
export function formatPhoneDisplay(e164: string): string {
  if (!e164 || typeof e164 !== 'string') {
    return ''
  }

  // Remove + if present
  const digits = e164.startsWith('+') ? e164.slice(1) : e164

  // Format: 080 123 45678
  if (digits.length === 13) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }

  return e164
}
