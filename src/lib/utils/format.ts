import { getTimeAgoDiff, formatTimeAgoShort, formatTimeAgo } from '@/lib/utils/timestamp';

function isFiniteNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

// Round to a fixed number of decimals using the exact `Number(value.toFixed(n))`
// idiom the codebase repeats ~130 times, so every caller stays byte-identical
// while the rounding logic lives in one place (category B + H).
export function roundTo(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
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

// [absValue threshold, suffix] — first match wins.
const COMPACT_UNITS: ReadonlyArray<readonly [number, string]> = [
  [LARGE_NUMBER_TRILLION, 'T'],
  [LARGE_NUMBER_BILLION, 'B'],
  [LARGE_NUMBER_MILLION, 'M'],
  [LARGE_NUMBER_THOUSAND, 'K'],
];

// Built once at module load; Intl handles the 12-hour AM/PM formatting and
// thousands grouping that were previously hand-rolled below.
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});
const timeFormatterNoSeconds = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: 'numeric',
});

export function addThousandSeparators(numStr: string): string {
  const parts = numStr.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

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
  return (includeSeconds ? timeFormatter : timeFormatterNoSeconds).format(d);
}

export function formatDateTimeString(date: Date): string {
  return `${dateFormatter.format(date)}, ${formatTimeString(date)}`;
}

export function formatNumberWithDecimals(
  value: number,
  minDecimals: number,
  maxDecimals: number
): string {
  // Sibling formatters return the em-dash sentinel for non-finite input, so
  // this leaf helper behaves consistently rather than emitting "NaN". Intl
  // collapses trailing zeros down to `minDecimals` and adds grouping commas.
  if (!isFiniteNumber(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(value);
}

export function formatDataAge(seconds: number | null | undefined): string {
  if (seconds == null) return '-';
  return seconds < 60 ? `${Math.round(seconds)}s` : `${Math.round(seconds / 60)}m`;
}

export function formatDecimals(decimals: number | null | undefined): string {
  return decimals != null ? `${decimals} decimals` : '-';
}

export function truncateAddress(address: string | null | undefined, head = 6, tail = 4): string {
  if (!address) return '-';
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function formatConfidenceScore(
  confidence: number | null | undefined,
  decimalPlaces = 0
): string {
  if (confidence == null) return '-';
  const score = confidence <= 1 ? confidence * 100 : Math.min(100, confidence);
  return `${score.toFixed(decimalPlaces)}%`;
}

export function formatOraclePrice(
  value: number | null | undefined,
  maxDecimals = 2,
  precision?: number
): string {
  if (!value || isNaN(value)) return '-';
  return `$${formatNumberWithDecimals(value, maxDecimals, precision ?? maxDecimals)}`;
}

export function formatOracleTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return '-';
  return formatTimeString(new Date(timestamp));
}

// [absPrice threshold, minDecimals, maxDecimals] — first match wins.
const PRICE_FORMAT_TIERS: ReadonlyArray<readonly [number, number, number]> = [
  [PRICE_THRESHOLD_HIGH, 2, 2],
  [1, 2, 4],
  [PRICE_THRESHOLD_LOW, 4, 6],
  [PRICE_THRESHOLD_VERY_LOW, 6, 8],
  [0, 8, 12],
];

export function formatPrice(price: number): string {
  if (!isFiniteNumber(price)) return '—';
  if (price === 0) return '$0.00';
  const absPrice = Math.abs(price);
  for (const [threshold, min, max] of PRICE_FORMAT_TIERS) {
    if (absPrice >= threshold) {
      return `$${formatNumberWithDecimals(price, min, max)}`;
    }
  }
  return `$${formatNumberWithDecimals(price, 8, 12)}`;
}

/**
 * Formats a signed numerical difference (e.g. a price or value delta) using a
 * currency-style `$` prefix. Decimal precision scales with the magnitude of
 * `basePrice` (and of `value`) so small deltas stay readable.
 * @param value - The difference to format (e.g. 0.15 for a `+$0.15` move).
 * @param basePrice - Optional reference magnitude used to choose precision.
 * @returns A string like `+$1.23` or `-$0.000045`, or `$0.00` when value is 0.
 */
export function formatPriceDiff(value: number, basePrice?: number): string {
  if (!isFiniteNumber(value)) return '—';
  if (value === 0) return '$0.00';

  let decimals = 6;
  if (basePrice != null) {
    if (basePrice > PRICE_THRESHOLD_HIGH) decimals = 2;
    else if (basePrice > 100) decimals = 3;
    else if (basePrice > 1) decimals = 4;
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
  for (const [threshold, suffix] of COMPACT_UNITS) {
    if (absValue >= threshold) {
      return `${sign}$${(absValue / threshold).toFixed(2)}${suffix}`;
    }
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
  const time = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const diff = getTimeAgoDiff(time);

  if (style === 'short') {
    return formatTimeAgoShort(diff);
  }

  return formatTimeAgo(diff);
}

export function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Get a nested value from an object by dot-separated path.
 * Returns undefined for missing intermediate or leaf values.
 */
export function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}
