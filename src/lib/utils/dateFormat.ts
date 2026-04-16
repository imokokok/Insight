/**
 * Date formatting utilities with i18n support
 * Provides consistent date formatting across the application based on current locale
 */

import { useLocale } from '@/i18n';

/**
 * Gets the appropriate Intl.DateTimeFormat locale based on the current app locale
 * @param currentLocale - The current app locale from useLocale()
 * @returns The appropriate locale string for date formatting
 */
export function getDateTimeLocale(currentLocale: string): string {
  return currentLocale === 'zh-CN' ? 'zh-CN' : 'en-US';
}

/**
 * Hook to get date formatting functions based on current locale
 * Use this in client components for consistent date formatting
 */
export function useDateFormatter() {
  const locale = useLocale();
  const dateTimeLocale = getDateTimeLocale(locale);

  const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleDateString(dateTimeLocale, options);
  };

  const formatTime = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleTimeString(dateTimeLocale, options);
  };

  const formatDateTime = (date: Date | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleString(dateTimeLocale, options);
  };

  return {
    formatDate,
    formatTime,
    formatDateTime,
    locale: dateTimeLocale,
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
    return `${seconds}秒前`;
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else {
    return `${days}天前`;
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
  if (days > 0) parts.push(`${days}天`);
  if (remainingHours > 0) parts.push(`${remainingHours}小时`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}分钟`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}秒`);

  return parts.join('');
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
