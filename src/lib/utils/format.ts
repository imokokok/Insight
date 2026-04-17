/**
 * Checks if a value is a finite number
 * @param value - The value to check
 * @returns Boolean indicating if value is a finite number
 */
function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

/**
 * Formats a number as currency (USD)
 * @param value - The numeric value to format
 * @param compact - Whether to use compact notation (e.g., $1.2M)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  if (compact) {
    return compactCurrencyFormatter.format(value);
  }
  return currencyFormatter.format(value);
}

/**
 * Formats a number with locale-specific separators
 * @param value - The numeric value to format
 * @param compact - Whether to use compact notation (e.g., 1.2M)
 * @returns Formatted number string
 */
export function formatNumber(value: number, compact: boolean = false): string {
  if (!isFiniteNumber(value)) {
    return '—';
  }
  if (compact) {
    return compactNumberFormatter.format(value);
  }
  return numberFormatter.format(value);
}

/**
 * Formats a number in compact notation with suffix (K, M, B)
 * @param value - The numeric value to format
 * @returns Compact formatted string (e.g., 1.2K, 3.4M)
 */
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

/**
 * Formats a number in compact notation with custom decimal places
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Compact formatted string with specified precision
 */
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

/**
 * Formats a price number with appropriate decimal places based on magnitude
 * @param price - The numeric price value to format
 * @returns Formatted price string with $ prefix
 */
export function formatPrice(price: number): string {
  if (!isFiniteNumber(price)) return '—';
  if (price === 0) return '$0.00';

  const absPrice = Math.abs(price);

  // 根据价格大小选择合适的精度
  if (absPrice >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (absPrice >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  if (absPrice >= 0.0001) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  }
  if (absPrice >= 0.000001) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 12 })}`;
}
