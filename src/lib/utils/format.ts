function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatCurrency(value: number, compact: boolean = false): string {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, compact: boolean = false): string {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (!isFiniteNumber(value)) return '—';
  if (value === 0) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(2)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(2)}M`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

export function formatCompactNumberWithDecimals(value: number, decimals: number = 1): string {
  if (!isFiniteNumber(value)) return '—';
  if (value === 0) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  return value.toString();
}
