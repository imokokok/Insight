// i18n 模块统一导出
export {
  locales,
  defaultLocale,
  messageFilesConfig,
  type Locale,
  type MessageFileConfig,
} from './config';
export type { Messages, TranslateFunction, I18nContextType, LoadedMessages } from './types';

// 重新导出 next-intl 的 hooks
export { useTranslations, useLocale } from 'next-intl';

// 重新导出 provider 中的自定义 hooks 和工具
export { useSetLocale, getPreferredLocale } from '@/lib/i18n/provider';
