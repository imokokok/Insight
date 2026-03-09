'use client';

import { useI18n } from '@/lib/i18n/context';
import { useState } from 'react';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const switchLanguage = (newLocale: 'en' | 'zh-CN') => {
    setLocale(newLocale);
    setIsDropdownOpen(false);
  };

  return (
    <div className="language-switcher relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
      >
        <span className="text-lg">🌐</span>
        <span>{locale === 'en' ? 'EN' : '中文'}</span>
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
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
              locale === 'en' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            English
          </button>
          <button
            onClick={() => switchLanguage('zh-CN')}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
              locale === 'zh-CN' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            简体中文
          </button>
        </div>
      )}
    </div>
  );
}
