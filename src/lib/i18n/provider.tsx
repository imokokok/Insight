'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/i18n/en.json';
import zhCN from '@/i18n/zh-CN.json';

type Locale = 'en' | 'zh-CN';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const messages: Record<Locale, Record<string, unknown>> = {
  en,
  'zh-CN': zhCN,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let value: unknown = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : undefined;
}

function translate(
  messages: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = getNestedValue(messages, key);

  if (value === undefined) {
    return key;
  }

  if (params) {
    return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
      return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }, value);
  }

  return value;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLocale = localStorage.getItem('preferredLocale') as Locale;
    if (savedLocale && ['en', 'zh-CN'].includes(savedLocale)) {
      setLocaleState(savedLocale);
    } else if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language;
      if (browserLang.startsWith('zh')) {
        setLocaleState('zh-CN');
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLocale', newLocale);
    }
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(messages[locale], key, params);
  };

  if (!mounted) {
    return (
      <NextIntlClientProvider locale="en" messages={messages['en']}>
        <I18nContext.Provider value={{ locale: 'en', setLocale, t: (key) => translate(messages['en'], key) }}>
          {children}
        </I18nContext.Provider>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <I18nContext.Provider value={{ locale, setLocale, t }}>
        {children}
      </I18nContext.Provider>
    </NextIntlClientProvider>
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
