'use client';

import { AlignJustify, Rows3, LayoutList } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

import type { DensityToggleProps } from '../types';

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  const t = useTranslations('ui.dataTable');
  const options = [
    { key: 'compact', icon: AlignJustify, label: t('density.compact') },
    { key: 'normal', icon: Rows3, label: t('density.normal') },
    { key: 'comfortable', icon: LayoutList, label: t('density.comfortable') },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = density === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-all',
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
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
