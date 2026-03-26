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
export function formatDateServer(
  date: Date | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const dateTimeLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  return d.toLocaleDateString(dateTimeLocale, options);
}

export function formatTimeServer(
  date: Date | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const dateTimeLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  return d.toLocaleTimeString(dateTimeLocale, options);
}

export function formatDateTimeServer(
  date: Date | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const dateTimeLocale = locale === 'zh-CN' ? 'zh-CN' : 'en-US';
  return d.toLocaleString(dateTimeLocale, options);
}
