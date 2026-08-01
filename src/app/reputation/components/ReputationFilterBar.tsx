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
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search providers..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-100 rounded-xl">
          {typeOptions.map((opt) => {
            const active = filterType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFilterTypeChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
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
