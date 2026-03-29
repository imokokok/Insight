/**
 * Formats a number with K/M suffixes for better readability
 * @param num - The number to format
 * @returns Formatted string with appropriate suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Formats a number as currency with $ prefix and K/M suffixes
 * @param num - The number to format as currency
 * @returns Formatted currency string
 */
export function formatCurrency(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num}`;
}

/**
 * Formats gas values with B/M/K suffixes
 * @param num - The gas value to format
 * @returns Formatted gas string
 */
export function formatGas(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  return formatNumber(num);
}

/**
 * Formats a date as a relative time string (e.g., "5m ago")
 * @param date - The date to format
 * @returns Relative time string
 */
export interface TimeAgoTranslations {
  secondsAgo: (count: number) => string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
}

export function formatTimeAgo(
  date: Date,
  translations?: TimeAgoTranslations
): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return translations?.secondsAgo(seconds) ?? `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return translations?.minutesAgo(minutes) ?? `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return translations?.hoursAgo(hours) ?? `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return translations?.daysAgo(days) ?? `${days}d ago`;
}

/**
 * Formats a date as a localized string with month, day, hour, and minute
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
