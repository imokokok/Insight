/**
 * Date formatting utilities
 * Provides consistent date formatting across the application
 */

/**
 * Hook to get date formatting functions
 * Use this in client components for consistent date formatting
 */
export function useDateFormatter() {
  const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', options);
  };

  const formatDateTime = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleString('en-US', options);
  };

  return {
    formatDate,
    formatTime,
    formatDateTime,
    locale: 'en-US',
  };
}

/**
 * Server-side date formatting functions
 * Use these when you need to format dates outside of React components
 */

export function formatDate(date: Date | number | string): string {
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    d = date;
  }

  if (!isValidDate(d)) {
    return '';
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | number, format?: string): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  if (!isValidDate(d)) {
    return '';
  }

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');

  if (format === 'YYYY-MM-DD HH:mm') {
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatRelativeTime(timestamp: number | Date): string {
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  const remainingHours = hours % 24;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}

export function formatTimestamp(timestamp: number | string): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  const d = new Date(ts);

  if (!isValidDate(d)) {
    return '';
  }

  return formatDateTime(d);
}

export function parseDate(dateString: string): Date | null {
  const d = new Date(dateString);
  return isValidDate(d) ? d : null;
}

export type TimeRangeKey = '1H' | '24H' | '7D' | '30D';

export function getTimeRange(key: TimeRangeKey): { start: number; end: number } {
  const end = Date.now();
  let start: number;

  switch (key) {
    case '1H':
      start = end - 60 * 60 * 1000;
      break;
    case '24H':
      start = end - 24 * 60 * 60 * 1000;
      break;
    case '7D':
      start = end - 7 * 24 * 60 * 60 * 1000;
      break;
    case '30D':
      start = end - 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      start = end - 24 * 60 * 60 * 1000;
  }

  return { start, end };
}

export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export function getDaysDifference(start: Date, end: Date): number {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const diffTime = endTime - startTime;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDateRange(start: Date | number, end: Date | number): string {
  const startDate = typeof start === 'number' ? new Date(start) : start;
  const endDate = typeof end === 'number' ? new Date(end) : end;
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
