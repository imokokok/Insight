'use client';

import React from 'react';
import { useTranslations } from '@/i18n';
import { Search } from 'lucide-react';
import { Command } from 'lucide-react';

interface SearchButtonProps {
  onClick: () => void;
  className?: string;
}

export function SearchButton({ onClick, className = '' }: SearchButtonProps) {
  const t = useTranslations();

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 
        bg-gray-50 hover:bg-gray-100 border border-gray-200 
        rounded-md transition-all duration-200
        ${className}
      `}
      aria-label={t('search.title')}
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">{t('search.title')}</span>
      <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono text-gray-400">
        <Command className="w-3 h-3" />
        <span>K</span>
      </kbd>
    </button>
  );
}

export default SearchButton;
