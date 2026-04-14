'use client';

/**
 * @fileoverview 市场共识价格卡片组件
 * @description 展示中位数价格、价格区间和变化率
 */

import { memo } from 'react';

import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

import { PriceFlash } from '@/components/ui/PriceFlash';

import { PriceRangeBar } from './PriceRangeBar';

interface MarketConsensusCardProps {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  previousMedian?: number;
  symbol: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function formatPrice(value: number): string {
  if (value <= 0) return '-';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function MarketConsensusCardComponent({
  medianPrice,
  minPrice,
  maxPrice,
  previousMedian,
  symbol,
  t,
}: MarketConsensusCardProps) {
  // 计算变化率
  const changePercent = previousMedian
    ? ((medianPrice - previousMedian) / previousMedian) * 100
    : null;

  const [baseAsset, quoteAsset] = symbol.split('/');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="group relative flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-500">
              {t('crossOracle.marketConsensus')}
            </span>
            <div
              className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              role="tooltip"
            >
              所有预言机报价的中位数，代表市场共识价格
              <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <PriceFlash value={medianPrice} previousValue={previousMedian}>
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatPrice(medianPrice)}
              </span>
            </PriceFlash>
            <span className="text-sm text-gray-400">
              {baseAsset}/{quoteAsset}
            </span>
          </div>
        </div>

        {changePercent !== null && (
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
              changePercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {changePercent >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-semibold">{Math.abs(changePercent).toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* 价格区间条 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <PriceRangeBar minPrice={minPrice} maxPrice={maxPrice} medianPrice={medianPrice} />
      </div>

      {/* 统计摘要 */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('crossOracle.priceRange')}: {formatPrice(minPrice)} - {formatPrice(maxPrice)}
        </span>
        <span className="group relative">
          {t('crossOracle.spread')}: {(((maxPrice - minPrice) / medianPrice) * 100).toFixed(2)}%
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            预言机报价的一致程度，越高表示各预言机报价越接近
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </span>
      </div>
    </div>
  );
}

export const MarketConsensusCard = memo(MarketConsensusCardComponent);
MarketConsensusCard.displayName = 'MarketConsensusCard';

export default MarketConsensusCard;
