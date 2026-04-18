export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
    timeZoneName: 'short',
  });
}

export function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

export function getCurrentMonthName(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

export function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith('+234')) {
    return phone.replace('+234', '0');
  }
  return phone;
}

export function getDueDate(daysFromNow: number = 90): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatDate(date.toISOString());
}
