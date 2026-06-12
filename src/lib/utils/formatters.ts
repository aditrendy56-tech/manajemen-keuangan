/**
 * Formatting utilities
 */

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Rp 0';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0%';
  }

  return `${value.toFixed(2)}%`;
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0';
  }

  return new Intl.NumberFormat('id-ID').format(value);
}
