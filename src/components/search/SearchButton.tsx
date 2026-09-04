'use client';

import { Search, Command } from 'lucide-react';

interface SearchButtonProps {
  onClick: () => void;
  className?: string;
}

export function SearchButton({ onClick, className = '' }: SearchButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 
        border border-slate-300 bg-white/60 hover:border-primary-400 hover:bg-primary-50/30 hover:text-primary-700
        transition-colors duration-200
        ${className}
      `}
      aria-label="Search"
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden items-center gap-0.5 border-l border-slate-300 pl-1.5 font-mono text-xs text-gray-400 md:flex">
        <Command className="w-3 h-3" />
        <span>K</span>
      </kbd>
    </button>
  );
}
