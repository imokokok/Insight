/**
 * Checks if a value is a finite number
 * @param value - The value to check
 * @returns Boolean indicating if value is a finite number
 */
function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function addThousandSeparators(numStr: string): string {
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatTimeString(date: Date | number, includeSeconds: boolean = true): string {
  const d = date instanceof Date ? date : new Date(date);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  if (includeSeconds) {
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${displayHours}:${minutes}:${seconds} ${ampm}`;
  }
  return `${displayHours}:${minutes} ${ampm}`;
}

function formatDateString(date: Date, style: 'short' | 'medium' | 'full' = 'short'): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  if (style === 'short') {
    return `${month}/${day}/${year}`;
  }
  if (style === 'medium') {
    return `${MONTHS_SHORT[date.getMonth()]} ${day}`;
  }
  return `${MONTHS_SHORT[date.getMonth()]} ${day}, ${year}`;
}

export function formatDateTimeString(date: Date): string {
  return `${formatDateString(date, 'short')}, ${formatTimeString(date)}`;
}

export function formatNumberWithDecimals(
  value: number,
  minDecimals: number,
  maxDecimals: number
): string {
  let formatted = value.toFixed(maxDecimals);
  const dotIndex = formatted.indexOf('.');
  if (dotIndex !== -1) {
    let decimals = formatted.length - dotIndex - 1;
    while (decimals > minDecimals && formatted.endsWith('0')) {
      formatted = formatted.slice(0, -1);
      decimals--;
    }
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }
  }
  return addThousandSeparators(formatted);
}

function formatWithMinDecimals(value: number, minDecimals: number, maxDecimals: number): string {
  let formatted = value.toFixed(maxDecimals);
  const dotIndex = formatted.indexOf('.');
  if (dotIndex !== -1) {
    let decimals = formatted.length - dotIndex - 1;
    while (decimals > minDecimals && formatted.endsWith('0')) {
      formatted = formatted.slice(0, -1);
      decimals--;
    }
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }
  }
  return addThousandSeparators(formatted);
}

export function formatPrice(price: number): string {
  if (!isFiniteNumber(price)) return '—';
  if (price === 0) return '$0.00';

  const absPrice = Math.abs(price);

  if (absPrice >= 1000) {
    return `$${formatWithMinDecimals(price, 2, 2)}`;
  }
  if (absPrice >= 1) {
    return `$${formatWithMinDecimals(price, 2, 4)}`;
  }
  if (absPrice >= 0.0001) {
    return `$${formatWithMinDecimals(price, 4, 6)}`;
  }
  if (absPrice >= 0.000001) {
    return `$${formatWithMinDecimals(price, 6, 8)}`;
  }
  return `$${formatWithMinDecimals(price, 8, 12)}`;
}

/**
 * Formats a percentage value with appropriate decimal places
 * @param value - The percentage value (e.g., 0.15 for 0.15%)
 * @param options - Formatting options
 * @returns Formatted percentage string with % suffix
 */
export function formatPriceDiff(value: number, basePrice?: number): string {
  if (!isFiniteNumber(value)) return '—';
  if (value === 0) return '$0.00';

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

  if (Math.abs(value) < 0.01) {
    decimals = Math.max(decimals, 4);
  }

  const sign = value >= 0 ? '+' : '-';
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
