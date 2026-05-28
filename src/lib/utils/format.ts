/**
 * Checks if a value is a finite number
 * @param value - The value to check
 * @returns Boolean indicating if value is a finite number
 */
function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

const PRICE_THRESHOLD_HIGH = 1000;
const PRICE_THRESHOLD_LOW = 0.0001;
const PRICE_THRESHOLD_VERY_LOW = 0.000001;
const LARGE_NUMBER_TRILLION = 1e12;
const LARGE_NUMBER_BILLION = 1e9;
const LARGE_NUMBER_MILLION = 1e6;
const LARGE_NUMBER_THOUSAND = 1e3;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

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
  const seconds = Math.ceil(ms / MS_PER_SECOND);
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = seconds % SECONDS_PER_MINUTE;
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

  if (absPrice >= PRICE_THRESHOLD_HIGH) {
    return `$${formatWithMinDecimals(price, 2, 2)}`;
  }
  if (absPrice >= 1) {
    return `$${formatWithMinDecimals(price, 2, 4)}`;
  }
  if (absPrice >= PRICE_THRESHOLD_LOW) {
    return `$${formatWithMinDecimals(price, 4, 6)}`;
  }
  if (absPrice >= PRICE_THRESHOLD_VERY_LOW) {
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
  if (basePrice && basePrice > PRICE_THRESHOLD_HIGH) {
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

  if (absValue >= LARGE_NUMBER_TRILLION) {
    return `${sign}$${(absValue / LARGE_NUMBER_TRILLION).toFixed(2)}T`;
  }
  if (absValue >= LARGE_NUMBER_BILLION) {
    return `${sign}$${(absValue / LARGE_NUMBER_BILLION).toFixed(2)}B`;
  }
  if (absValue >= LARGE_NUMBER_MILLION) {
    return `${sign}$${(absValue / LARGE_NUMBER_MILLION).toFixed(2)}M`;
  }
  if (absValue >= LARGE_NUMBER_THOUSAND) {
    return `${sign}$${(absValue / LARGE_NUMBER_THOUSAND).toFixed(2)}K`;
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

  const seconds = Math.floor(diff / MS_PER_SECOND);
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const days = Math.floor(hours / HOURS_PER_DAY);

  if (style === 'short') {
    if (seconds < SECONDS_PER_MINUTE) return `${seconds}s ago`;
    if (minutes < MINUTES_PER_HOUR) return `${minutes}m ago`;
    if (hours < HOURS_PER_DAY) return `${hours}h ago`;
    return `${days}d ago`;
  }

  if (seconds < SECONDS_PER_MINUTE) return `${seconds} seconds ago`;
  if (minutes < MINUTES_PER_HOUR) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < HOURS_PER_DAY) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function formatDataAge(seconds: number | null): string {
  if (seconds == null) return '-';
  if (seconds < SECONDS_PER_MINUTE) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / SECONDS_PER_MINUTE)}m`;
}

export function formatConfidenceScore(confidence: number): string {
  if (confidence <= 1) return (confidence * 100).toFixed(1);
  return Math.min(100, confidence).toFixed(1);
}

export function truncateAddress(address: string, head: number = 6, tail: number = 4): string {
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function formatOraclePrice(value: number, decimals: number = 2): string {
  return `$${formatNumberWithDecimals(value, 2, decimals)}`;
}

export function formatTimestampValue(timestamp: number): string {
  if (!timestamp) return '-';
  return formatTimeString(new Date(timestamp));
}

export function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
