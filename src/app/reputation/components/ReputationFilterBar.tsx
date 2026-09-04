'use client';

import { Search, X } from 'lucide-react';

import { type ProviderType } from '@/app/reputation/constants/providerProfiles';
import { cn } from '@/lib/utils';

export type FilterType = 'all' | ProviderType;

interface ReputationFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  filterType: FilterType;
  onFilterTypeChange: (v: FilterType) => void;
  onchainCount: number;
  apiCount: number;
  hybridCount: number;
}

/**
 * Search + provider-type filter bar for the reputation directory.
 *
 * Sorting is intentionally NOT exposed here — column-header click sorting
 * in ReputationComparisonTable is the single source of truth for sort
 * order. The previous `Sort by` `<select>` duplicated that control and
 * caused user confusion.
 */
export function ReputationFilterBar({
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  onchainCount,
  apiCount,
  hybridCount,
}: ReputationFilterBarProps) {
  const typeOptions: Array<{ value: FilterType; label: string; count: number }> = [
    { value: 'all', label: 'All Types', count: onchainCount + apiCount + hybridCount },
    { value: 'onchain', label: 'On-chain', count: onchainCount },
    { value: 'api', label: 'API', count: apiCount },
    { value: 'hybrid', label: 'Hybrid', count: hybridCount },
  ];

  return (
    <div className="mb-6 flex flex-col gap-3 border-y border-slate-900/15 bg-white/25 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search providers..."
          className="w-full border-0 border-b border-slate-300 bg-transparent py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-0"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear provider search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 border border-slate-900/15 bg-white p-1">
          {typeOptions.map((opt) => {
            const active = filterType === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => onFilterTypeChange(opt.value)}
                aria-pressed={active}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  active ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {opt.label}{' '}
                <span className={cn('ml-0.5', active ? 'text-slate-300' : 'text-slate-400')}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
