export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function fromKobo(kobo: number): number {
  return kobo / 100;
}
