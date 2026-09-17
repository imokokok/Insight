'use client';

import { Anchor, CircleDollarSign, Layers3 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

export type PegRiskCategory = 'all' | 'stablecoins' | 'wrapped';

interface CategoryOption {
  id: PegRiskCategory;
  label: string;
  description: string;
  icon: LucideIcon;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'all',
    label: 'All peg assets',
    description: 'One cross-category risk view',
    icon: Layers3,
  },
  {
    id: 'stablecoins',
    label: 'Stablecoins',
    description: 'Fiat and synthetic pegs',
    icon: CircleDollarSign,
  },
  {
    id: 'wrapped',
    label: 'Wrapped & LSTs',
    description: 'Underlying and exchange-rate pegs',
    icon: Anchor,
  },
];

export function PegRiskCategoryNav({
  activeCategory,
  counts,
  alertCounts,
  onChange,
}: {
  activeCategory: PegRiskCategory;
  counts: Record<PegRiskCategory, number>;
  alertCounts: Record<PegRiskCategory, number>;
  onChange: (category: PegRiskCategory) => void;
}) {
  return (
    <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-6 sm:px-8 lg:px-12">
      <div className="mb-3 flex items-center justify-between border-b border-slate-900/15 pb-3">
        <p className="editorial-index">02 — Choose a risk category</p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          Asset universe
        </span>
      </div>

      <div
        className="grid grid-cols-1 border-y border-slate-900/15 bg-white/35 md:grid-cols-3"
        aria-label="Peg risk asset category"
      >
        {CATEGORY_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = activeCategory === option.id;
          const alertCount = alertCounts[option.id];

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.id)}
              className={cn(
                'group relative flex min-h-20 items-center gap-3 border-b border-slate-900/10 px-4 py-3 text-left transition-colors last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0',
                isActive
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-950'
              )}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center border',
                  isActive
                    ? 'border-white/20 bg-white/10 text-blue-300'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {option.label}
                  <span
                    className={cn(
                      'font-mono text-[10px]',
                      isActive ? 'text-white/55' : 'text-slate-400'
                    )}
                  >
                    {counts[option.id]}
                  </span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-xs',
                    isActive ? 'text-white/60' : 'text-slate-500'
                  )}
                >
                  {option.description}
                </span>
              </span>

              {alertCount > 0 && (
                <span
                  className={cn(
                    'border-l-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase',
                    isActive
                      ? 'border-amber-300 bg-amber-300/10 text-amber-200'
                      : 'border-amber-500 bg-amber-50 text-amber-700'
                  )}
                >
                  {alertCount} alert{alertCount === 1 ? '' : 's'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
