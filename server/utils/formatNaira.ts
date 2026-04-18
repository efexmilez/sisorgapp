/**
 * Naira Formatting Utilities (Server-side)
 * All amounts in KOBO (integer)
 */

/**
 * Format kobo amount to Naira display
 * @param kobo - Amount in kobo (integer)
 * @returns Formatted string like '₦5,000.00'
 */
export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(kobo / 100)
}

/**
 * Convert Naira to Kobo
 * @param naira - Amount in Naira
 * @returns Amount in Kobo (integer)
 */
export function toKobo(naira: number): number {
  return Math.round(naira * 100)
}

/**
 * Convert Kobo to Naira
 * @param kobo - Amount in Kobo
 * @returns Amount in Naira
 */
export function fromKobo(kobo: number): number {
  return kobo / 100
}
