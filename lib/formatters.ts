export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(kobo / 100)
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100)
}

export function fromKobo(kobo: number): number {
  return kobo / 100
}

export function formatPhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.startsWith('+') ? phone.slice(1) : phone
  if (digits.length === 13) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function addDays(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
