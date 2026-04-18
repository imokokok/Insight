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

/**
 * Formats a percentage value with appropriate decimal places
 * @param value - The percentage value (e.g., 0.15 for 0.15%)
 * @param options - Formatting options
 * @returns Formatted percentage string with % suffix
 */
export function formatPercent(
  value: number,
  options?: { minDecimals?: number; maxDecimals?: number }
): string {
  if (!isFiniteNumber(value)) return '—';

  const { minDecimals = 2, maxDecimals = 4 } = options ?? {};

  // 根据数值大小动态选择小数位数
  let decimals = minDecimals;
  if (Math.abs(value) < 0.001) {
    decimals = Math.min(4, maxDecimals);
  } else if (Math.abs(value) < 0.01) {
    decimals = Math.min(3, maxDecimals);
  } else if (Math.abs(value) < 0.1) {
    decimals = Math.min(2, maxDecimals);
  }

  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Formats a price difference with appropriate precision based on base price
 * @param value - The price difference value
 * @param basePrice - The base price for determining precision
 * @returns Formatted price difference string with $ prefix
 */
export function formatPriceDiff(value: number, basePrice?: number): string {
  if (!isFiniteNumber(value)) return '—';
  if (value === 0) return '$0.00';

  // 根据基准价格确定精度
  let decimals = 2;
  if (basePrice && basePrice > 1000) {
    decimals = 2;
  } else if (basePrice && basePrice > 100) {
    decimals = 3;
  } else if (basePrice && basePrice > 1) {
    decimals = 4;
  } else {
    decimals = 6;
  }

  // 对于非常小的差异，显示更多小数位
  if (Math.abs(value) < 0.01) {
    decimals = Math.max(decimals, 4);
  }

  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Formats a large number with currency prefix and compact notation (K, M, B, T)
 * @param value - The numeric value to format
 * @returns Formatted large number string with $ prefix
 */
export function formatLargeNumber(value: number): string {
  if (!isFiniteNumber(value)) return '—';
  if (value === 0) return '$0.00';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  }
  if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  }
  return `${sign}$${absValue.toFixed(2)}`;
}

/**
 * Formats a relative time from a timestamp
 * @param timestamp - The timestamp to format (Date or number in ms)
 * @param options - Formatting options
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  timestamp: Date | number,
  options?: { style?: 'short' | 'long' }
): string {
  const style = options?.style ?? 'short';
  const now = Date.now();
  const time = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (style === 'short') {
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // long style
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Gets the color class for a change value (positive/negative/neutral)
 * @param value - The change value
 * @param type - The type of change ('price' for price changes, 'deviation' for deviations)
 * @returns Tailwind color class
 */
export function getChangeColorClass(value: number, type: 'price' | 'deviation' = 'price'): string {
  if (value === 0) return 'text-gray-500';

  // For price changes: positive = green (gain), negative = red (loss)
  // For deviations: positive = red (above median), negative = green (below median)
  const isPositiveGreen = type === 'price';

  if (value > 0) {
    return isPositiveGreen ? 'text-emerald-600' : 'text-red-600';
  }
  return isPositiveGreen ? 'text-red-600' : 'text-emerald-600';
}

/**
 * Gets the background color class for deviation values
 * @param deviationPercent - The deviation percentage
 * @returns Tailwind background color class
 */
export function getDeviationBgClass(deviationPercent: number): string {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return 'bg-emerald-50 border-emerald-200';
  if (absDeviation < 0.5) return 'bg-yellow-50 border-yellow-200';
  if (absDeviation < 1.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

/**
 * Gets the text color class for deviation values
 * @param deviationPercent - The deviation percentage
 * @returns Tailwind text color class
 */
export function getDeviationTextClass(deviationPercent: number): string {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return 'text-emerald-600';
  if (absDeviation < 0.5) return 'text-yellow-600';
  if (absDeviation < 1.0) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Deviation threshold constants for consistent coloring across the app
 */
export const DEVIATION_THRESHOLDS = {
  /** Excellent: < 0.1% deviation */
  EXCELLENT: 0.1,
  /** Good: < 0.5% deviation */
  GOOD: 0.5,
  /** Warning: < 1.0% deviation */
  WARNING: 1.0,
  /** Critical: >= 1.0% deviation */
  CRITICAL: 1.0,
} as const;
