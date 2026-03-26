'use client';

import { useState, useTransition } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { type Locale, routing } from '@/i18n/routing';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentLocale = (params.locale as Locale) || 'en';

  const switchLanguage = (newLocale: Locale) => {
    // 获取当前路径，替换语言前缀
    const currentPath = pathname;
    const localePattern = new RegExp(`^/(${routing.locales.join('|')})`);
    const newPath = currentPath.replace(localePattern, `/${newLocale}`);

    startTransition(() => {
      router.replace(newPath);
    });

    setIsDropdownOpen(false);
  };

  const getLanguageLabel = (locale: Locale) => {
    switch (locale) {
      case 'en':
        return 'English';
      case 'zh-CN':
        return '中文';
      default:
        return 'English'; // 默认显示英文
    }
  };

  return (
    <div className="language-switcher relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors disabled:opacity-50"
      >
        <span className="text-lg">🌐</span>
        <span>{getLanguageLabel(currentLocale)}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <button
            onClick={() => switchLanguage('en')}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors first:rounded-t-lg ${
              currentLocale === 'en' ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
            }`}
          >
            English
          </button>
          <button
            onClick={() => switchLanguage('zh-CN')}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors last:rounded-b-lg ${
              currentLocale === 'zh-CN' ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
            }`}
          >
            中文
          </button>
        </div>
      )}
    </div>
  );
}
