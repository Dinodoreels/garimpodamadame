export type ExpiryStatus = 'expired' | 'expiring' | 'ok' | 'none';

export function getDaysToExpiry(date?: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(date?: string | null, alertDays = 60): ExpiryStatus {
  const days = getDaysToExpiry(date);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= alertDays) return 'expiring';
  return 'ok';
}

/**
 * Earliest expiry date considering product + variants.
 * Returns ISO date string (YYYY-MM-DD) or null.
 */
export function getEarliestExpiry(
  productExpiry?: string | null,
  variants?: Array<{ expiry_date?: string | null }>
): string | null {
  const dates: string[] = [];
  if (productExpiry) dates.push(productExpiry);
  variants?.forEach((v) => {
    if (v.expiry_date) dates.push(v.expiry_date);
  });
  if (dates.length === 0) return null;
  return dates.sort()[0];
}

export function formatExpiryLabel(status: ExpiryStatus, days: number | null): string {
  if (status === 'expired') return 'VENCIDO';
  if (status === 'expiring' && days !== null) {
    if (days === 0) return 'Vence hoje';
    if (days === 1) return 'Vence amanhã';
    return `Vence em ${days} dias`;
  }
  return '';
}

export function formatDateBR(date?: string | null): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}