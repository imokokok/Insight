'use client';

/**
 * @fileoverview 统计数据网格组件
 * @description 展示价格查询的统计数据，支持展开/收起详情
 */

import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

/**
 * 统计数据网格组件
 *
 * @param props - 组件属性
 * @returns 统计数据网格 JSX 元素
 */
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
  comparePrices: _comparePrices,
}: StatsGridProps) {
  const t = useTranslations();
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
    if (stdDevPercent < 0.1)
      return { label: t('priceQuery.stats.consistency.excellent'), color: 'text-success-600' };
    if (stdDevPercent < 0.3)
      return { label: t('priceQuery.stats.consistency.good'), color: 'text-primary-600' };
    if (stdDevPercent < 0.5)
      return { label: t('priceQuery.stats.consistency.fair'), color: 'text-warning-600' };
    return { label: t('priceQuery.stats.consistency.poor'), color: 'text-danger-600' };
  };

  const consistencyRating =
    standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : null;

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
        color: 'text-success-600',
        bgColor: 'bg-gray-50',
      };
    } else if (diff < 0) {
      return {
        text: `${diff.toFixed(2)}%`,
        color: 'text-danger-600',
        bgColor: 'bg-gray-50',
      };
    }
    return {
      text: '0.00%',
      color: 'text-gray-500',
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 主统计区域 - 紧凑布局 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {/* 平均价格 */}
        <div className="px-3 py-2.5 border-r border-gray-100">
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
            compact
          />
          {compareMode && avgPrice > 0 && compareAvgPrice > 0 && (
            <div
              className={`mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${avgPriceDiffStyle.bgColor} ${avgPriceDiffStyle.color}`}
            >
              {avgPriceDiffStyle.text}
            </div>
          )}
        </div>

        {/* 24小时变化 */}
        <div className="px-3 py-2.5 border-r border-gray-100">
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
            compact
          />
          {compareMode &&
            avgChange24hPercent !== undefined &&
            compareAvgChange24hPercent !== undefined && (
              <div className="mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
                {compareAvgChange24hPercent >= 0 ? '+' : ''}
                {compareAvgChange24hPercent.toFixed(2)}%
              </div>
            )}
        </div>

        {/* 波动率 */}
        <div className="px-3 py-2.5 border-r border-gray-100">
          <StatItem
            label={t('priceQuery.stats.volatility')}
            value={volatility !== null ? volatility.toFixed(2) : '-'}
            suffix="%"
            subValue={volatility !== null ? t('priceQuery.stats.annualized') : undefined}
            compact
          />
        </div>

        {/* 数据点数 */}
        <div className="px-3 py-2.5">
          <StatItem
            label={t('priceQuery.stats.dataPoints')}
            value={dataPoints.toString()}
            compact
          />
        </div>
      </div>

      {/* 展开的详细统计 */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* 最高价格 */}
        <div className="px-3 py-2.5 border-r border-gray-100 border-t border-gray-50">
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
            compact
          />
          {compareMode && maxPrice > 0 && compareMaxPrice > 0 && (
            <div
              className={`mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${maxPriceDiffStyle.bgColor} ${maxPriceDiffStyle.color}`}
            >
              {maxPriceDiffStyle.text}
            </div>
          )}
        </div>

        {/* 最低价格 */}
        <div className="px-3 py-2.5 border-r border-gray-100 border-t border-gray-50">
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
            compact
          />
          {compareMode && minPrice > 0 && compareMinPrice > 0 && (
            <div
              className={`mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${minPriceDiffStyle.bgColor} ${minPriceDiffStyle.color}`}
            >
              {minPriceDiffStyle.text}
            </div>
          )}
        </div>

        {/* 价格区间 */}
        <div className="px-3 py-2.5 border-r border-gray-100 border-t border-gray-50">
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
            compact
          />
          {compareMode && priceRange > 0 && comparePriceRange > 0 && (
            <div
              className={`mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${priceRangeDiffStyle.bgColor} ${priceRangeDiffStyle.color}`}
            >
              {priceRangeDiffStyle.text}
            </div>
          )}
        </div>

        {/* 标准差 */}
        <div className="px-3 py-2.5 border-t border-gray-50">
          <StatItem
            label={t('priceQuery.stats.standardDeviation')}
            value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
            suffix="%"
            subValue={
              standardDeviation > 0
                ? `${t('priceQuery.stats.absoluteValue')}: $${standardDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : undefined
            }
            compact
          />
        </div>

        {/* 查询耗时 */}
        <div className="px-3 py-2.5 border-r border-gray-100 border-t border-gray-50">
          <StatItem
            label={t('priceQuery.stats.queryDuration')}
            value={queryDuration !== null ? queryDuration.toString() : '-'}
            suffix=" ms"
            compact
          />
        </div>

        {/* 一致性评级 */}
        <div className="px-3 py-2.5 border-t border-gray-50">
          <div className="py-0.5">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
              {t('priceQuery.stats.consistencyRating')}
            </div>
            <div
              className={`text-lg font-bold ${
                standardDeviationPercent > 0 ? consistencyRating?.color : 'text-gray-900'
              }`}
            >
              {standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* 展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('priceQuery.stats.collapse')}</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('priceQuery.stats.expand')}</span>
          </>
        )}
      </button>
    </div>
  );
}
