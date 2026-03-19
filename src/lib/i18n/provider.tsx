'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useLocale as useNextIntlLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

type Locale = 'en' | 'zh-CN';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useNextIntlLocale() as Locale;
  const tNextIntl = useTranslations();

  const setLocale = (newLocale: Locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLocale', newLocale);

      // 构建新的路径，替换语言前缀
      const newPathname = pathname.replace(/^\/(en|zh-CN)/, `/${newLocale}`);
      router.push(newPathname);
    }
  };

  // 包装 next-intl 的 t 函数，提供兼容的接口
  const t = (key: string, params?: Record<string, string | number>): string => {
    try {
      return tNextIntl(key, params);
    } catch {
      // 如果翻译键不存在，返回键名作为 fallback
      return key;
    }
  };

  return (
    <I18nContext.Provider value={{ locale: currentLocale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useLocale must be used within an I18nProvider');
  }
  return context;
}

export function useI18n() {
  const { locale, setLocale, t } = useLocale();
  return { t, locale, setLocale };
}
