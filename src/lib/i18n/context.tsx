'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from '@/i18n/en.json';
import zhCN from '@/i18n/zh-CN.json';

type Locale = 'en' | 'zh-CN';

type Translations = typeof en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations: Record<Locale, Translations> = {
  en,
  'zh-CN': zhCN,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    const savedLocale = localStorage.getItem('preferredLocale') as Locale;
    if (savedLocale && ['en', 'zh-CN'].includes(savedLocale)) {
      return savedLocale;
    }
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) {
      return 'zh-CN';
    }
    return 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferredLocale', newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations[locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }, value);
    }

    return value;
  };

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
