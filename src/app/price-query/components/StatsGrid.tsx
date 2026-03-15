'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { StatItem } from './StatItem';
import { calculateCurrentVolatility } from '../utils/technicalIndicators';

interface StatsGridProps {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  dataPoints: number;
  queryDuration: number | null;
  avgChange24hPercent?: number;
  prices?: number[];
  compareMode?: boolean;
  compareAvgPrice?: number;
  compareMaxPrice?: number;
  compareMinPrice?: number;
  comparePriceRange?: number;
  compareAvgChange24hPercent?: number;
  comparePrices?: number[];
}

const STORAGE_KEY = 'stats-grid-expanded';

export function StatsGrid({
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
  dataPoints,
  queryDuration,
  avgChange24hPercent,
  prices,
  compareMode = false,
  compareAvgPrice = 0,
  compareMaxPrice = 0,
  compareMinPrice = 0,
  comparePriceRange = 0,
  compareAvgChange24hPercent,
  comparePrices = [],
}: StatsGridProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsExpanded(stored === 'true');
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, isExpanded.toString());
    }
  }, [isExpanded, isMounted]);

  const volatility = useMemo(() => {
    if (!prices || prices.length < 20) return null;
    return calculateCurrentVolatility(prices);
  }, [prices]);

  const getConsistencyRating = (stdDevPercent: number): { label: string; color: string } => {
    if (stdDevPercent < 0.1) return { label: '优秀', color: 'text-green-600' };
    if (stdDevPercent < 0.3) return { label: '良好', color: 'text-blue-600' };
    if (stdDevPercent < 0.5) return { label: '一般', color: 'text-orange-600' };
    return { label: '较差', color: 'text-red-600' };
  };

  const consistencyRating =
    standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 计算对比差异百分比
  const calculateDiffPercent = (current: number, compare: number): number => {
    if (compare === 0) return 0;
    return ((current - compare) / compare) * 100;
  };

  // 获取差异显示样式
  const getDiffStyle = (diff: number): { text: string; color: string; bgColor: string } => {
    if (diff > 0) {
      return {
        text: `+${diff.toFixed(2)}%`,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
      };
    } else if (diff < 0) {
      return {
        text: `${diff.toFixed(2)}%`,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
      };
    }
    return {
      text: '0.00%',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    };
  };

  const avgPriceDiff = compareMode ? calculateDiffPercent(avgPrice, compareAvgPrice) : 0;
  const maxPriceDiff = compareMode ? calculateDiffPercent(maxPrice, compareMaxPrice) : 0;
  const minPriceDiff = compareMode ? calculateDiffPercent(minPrice, compareMinPrice) : 0;
  const priceRangeDiff = compareMode ? calculateDiffPercent(priceRange, comparePriceRange) : 0;

  const avgPriceDiffStyle = getDiffStyle(avgPriceDiff);
  const maxPriceDiffStyle = getDiffStyle(maxPriceDiff);
  const minPriceDiffStyle = getDiffStyle(minPriceDiff);
  const priceRangeDiffStyle = getDiffStyle(priceRangeDiff);

  return (
    <div className="border-b border-gray-200 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        <div className="px-4 py-4 border-r border-gray-200">
          <StatItem
            label={t('priceQuery.stats.avgPrice')}
            value={
              avgPrice > 0
                ? avgPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '-'
            }
            prefix="$"
          />
          {compareMode && avgPrice > 0 && compareAvgPrice > 0 && (
            <div
              className={`mt-2 text-xs font-medium px-2 py-1 rounded inline-block ${avgPriceDiffStyle.bgColor} ${avgPriceDiffStyle.color}`}
            >
              对比: {avgPriceDiffStyle.text}
            </div>
          )}
        </div>
        <div className="px-4 py-4 border-r border-gray-200">
          <StatItem
            label={t('priceQuery.stats.change24h')}
            value={
              avgChange24hPercent !== undefined
                ? `${avgChange24hPercent >= 0 ? '+' : ''}${avgChange24hPercent.toFixed(2)}`
                : '-'
            }
            suffix="%"
            trend={
              avgChange24hPercent === undefined
                ? 'neutral'
                : avgChange24hPercent >= 0
                  ? 'up'
                  : 'down'
            }
          />
          {compareMode &&
            avgChange24hPercent !== undefined &&
            compareAvgChange24hPercent !== undefined && (
              <div
                className={`mt-2 text-xs font-medium px-2 py-1 rounded inline-block bg-gray-50 text-gray-600`}
              >
                对比: {compareAvgChange24hPercent >= 0 ? '+' : ''}
                {compareAvgChange24hPercent.toFixed(2)}%
              </div>
            )}
        </div>
        <div className="px-4 py-4 border-r border-gray-200">
          <StatItem
            label={t('priceQuery.stats.volatility')}
            value={volatility !== null ? volatility.toFixed(2) : '-'}
            suffix="%"
            subValue={volatility !== null ? t('priceQuery.stats.annualized') : undefined}
          />
        </div>
        <div className="px-4 py-4">
          <StatItem label={t('priceQuery.stats.dataPoints')} value={dataPoints.toString()} />
        </div>
      </div>

      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 border-r border-gray-200 border-t border-gray-100">
          <StatItem
            label={t('priceQuery.stats.maxPrice')}
            value={
              maxPrice > 0
                ? maxPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '-'
            }
            prefix="$"
          />
          {compareMode && maxPrice > 0 && compareMaxPrice > 0 && (
            <div
              className={`mt-2 text-xs font-medium px-2 py-1 rounded inline-block ${maxPriceDiffStyle.bgColor} ${maxPriceDiffStyle.color}`}
            >
              对比: {maxPriceDiffStyle.text}
            </div>
          )}
        </div>
        <div className="px-4 py-4 border-r border-gray-200 border-t border-gray-100">
          <StatItem
            label={t('priceQuery.stats.minPrice')}
            value={
              minPrice > 0
                ? minPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '-'
            }
            prefix="$"
          />
          {compareMode && minPrice > 0 && compareMinPrice > 0 && (
            <div
              className={`mt-2 text-xs font-medium px-2 py-1 rounded inline-block ${minPriceDiffStyle.bgColor} ${minPriceDiffStyle.color}`}
            >
              对比: {minPriceDiffStyle.text}
            </div>
          )}
        </div>
        <div className="px-4 py-4 border-r border-gray-200 border-t border-gray-100">
          <StatItem
            label={t('priceQuery.stats.priceRange')}
            value={
              priceRange > 0
                ? priceRange.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '-'
            }
            prefix="$"
          />
          {compareMode && priceRange > 0 && comparePriceRange > 0 && (
            <div
              className={`mt-2 text-xs font-medium px-2 py-1 rounded inline-block ${priceRangeDiffStyle.bgColor} ${priceRangeDiffStyle.color}`}
            >
              对比: {priceRangeDiffStyle.text}
            </div>
          )}
        </div>
        <div className="px-4 py-4 border-t border-gray-100">
          <StatItem
            label={t('priceQuery.stats.standardDeviation')}
            value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
            suffix="%"
            subValue={
              standardDeviation > 0
                ? `${t('priceQuery.stats.absoluteValue')}: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : undefined
            }
          />
        </div>
        <div className="px-4 py-4 border-r border-gray-200 border-t border-gray-100">
          <StatItem
            label={t('priceQuery.stats.queryDuration')}
            value={queryDuration !== null ? queryDuration.toString() : '-'}
            suffix=" ms"
          />
        </div>
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="py-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {t('priceQuery.stats.consistencyRating')}
            </div>
            <div
              className={`text-2xl font-bold ${
                standardDeviationPercent > 0 ? consistencyRating?.color : 'text-gray-900'
              }`}
            >
              {standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? '收起更多指标' : '展开更多指标'}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            <span>{t('priceQuery.stats.collapse') || '收起'}</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            <span>{t('priceQuery.stats.expand') || '查看更多'}</span>
          </>
        )}
      </button>
    </div>
  );
}
