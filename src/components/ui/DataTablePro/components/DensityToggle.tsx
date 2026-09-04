'use client';

import { AlignJustify, Rows3, LayoutList } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { DensityToggleProps } from '../types';

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  const options = [
    { key: 'compact', icon: AlignJustify, label: 'density.compact' },
    { key: 'normal', icon: Rows3, label: 'density.normal' },
    { key: 'comfortable', icon: LayoutList, label: 'density.comfortable' },
  ] as const;

  return (
    <div className="flex items-center border border-slate-900/15 bg-white">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = density === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              'flex items-center gap-1 border-r border-slate-900/15 px-2 py-1 text-xs font-medium transition-colors last:border-r-0',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
            )}
            title={option.label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
