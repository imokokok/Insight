// i18n 模块统一导出
export { locales, defaultLocale, type Locale, messageNamespaces, type MessageNamespace } from './config';
export type { Messages, TranslateFunction, I18nContextType, LoadedMessages } from './types';

// 重新导出 provider 中的 hook
export { useLocale, useI18n, I18nProvider } from '@/lib/i18n/provider';
