'use client';

import { Filter, X, TrendingUp, TrendingDown, PieChart, Link2 } from 'lucide-react';

import { useTranslations } from '@/i18n';

import {
  type MarketFilterState,
  MARKET_SHARE_OPTIONS,
  CHAINS_OPTIONS,
} from '../hooks/useMarketFilter';

interface FilterPanelProps {
  filters: MarketFilterState;
  onMarketShareChange: (value: number | null) => void;
  onChange24hFilter: (value: 'all' | 'positive' | 'negative') => void;
  onChainsChange: (value: number | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

export function FilterPanel({
  filters,
  onMarketShareChange,
  onChange24hFilter,
  onChainsChange,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
}: FilterPanelProps) {
  const t = useTranslations('marketOverview');

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider">
          <Filter className="w-3 h-3" />
          {t('filter.title')}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
            {t('filter.clear')}
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 border border-primary-100 rounded text-xs text-primary-700">
          <span className="font-medium">{activeFilterCount}</span>
          <span>{t('filter.activeFilters')}</span>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
            <PieChart className="w-3 h-3" />
            {t('filter.marketShare')}
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => onMarketShareChange(null)}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                filters.marketShareMin === null
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              {t('filter.all')}
            </button>
            {MARKET_SHARE_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => onMarketShareChange(value)}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                  filters.marketShareMin === value
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                }`}
              >
                &gt;{value}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t('filter.change24h')}
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => onChange24hFilter('all')}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                filters.change24hFilter === 'all'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              {t('filter.all')}
            </button>
            <button
              onClick={() => onChange24hFilter('positive')}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-all flex items-center justify-center gap-1 ${
                filters.change24hFilter === 'positive'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-emerald-600 border-gray-200 hover:border-emerald-300'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              {t('filter.positive')}
            </button>
            <button
              onClick={() => onChange24hFilter('negative')}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-all flex items-center justify-center gap-1 ${
                filters.change24hFilter === 'negative'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-red-600 border-gray-200 hover:border-red-300'
              }`}
            >
              <TrendingDown className="w-3 h-3" />
              {t('filter.negative')}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {t('filter.chains')}
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => onChainsChange(null)}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                filters.chainsMin === null
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}
            >
              {t('filter.all')}
            </button>
            {CHAINS_OPTIONS.map((value) => (
              <button
                key={value}
                onClick={() => onChainsChange(value)}
                className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                  filters.chainsMin === value
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                }`}
              >
                &gt;{value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
