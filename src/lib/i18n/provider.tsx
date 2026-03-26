'use client';

import { useRouter, usePathname } from 'next/navigation';

import { useLocale as useNextIntlLocale } from 'next-intl';

import { routing } from '@/i18n/routing';

export type Locale = 'en' | 'zh-CN';

/**
 * 设置语言并持久化到 localStorage
 * 用于语言切换功能
 */
export function useSetLocale() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useNextIntlLocale() as Locale;

  const setLocale = (newLocale: Locale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLocale', newLocale);

      // 构建新的路径，替换语言前缀
      const localePattern = new RegExp(`^/(${routing.locales.join('|')})`);
      const newPathname = pathname.replace(localePattern, `/${newLocale}`);
      router.push(newPathname);
    }
  };

  return { locale: currentLocale, setLocale };
}

/**
 * 从 localStorage 获取用户偏好语言
 * 用于服务端渲染时的语言检测
 */
export function getPreferredLocale(): Locale | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('preferredLocale') as Locale;
    if (stored === 'en' || stored === 'zh-CN') {
      return stored;
    }
  }
  return null;
}
