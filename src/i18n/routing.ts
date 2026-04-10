import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-CN'],
  defaultLocale: 'en',
  localePrefix: 'always',
  pathnames: {
    '/api/prices': '/api/prices',
  },
});

export type Locale = (typeof routing.locales)[number];

// 检测是否为中文语言（仅支持简体中文）
export function isChineseLocale(locale: string): boolean {
  // 只识别简体中文，繁体中文（zh-HK, zh-TW 等）回退到英文
  return locale === 'zh-CN' || locale === 'zh';
}

// 获取有效的语言（只有中文或非中文两种）
export function getValidLocale(locale: string | undefined): Locale {
  if (!locale) return 'en';
  // 如果是中文相关语言，返回中文
  if (isChineseLocale(locale)) return 'zh-CN';
  // 其他所有语言都返回英文
  return 'en';
}
