'use client';

/**
 * @fileoverview 统计数据网格组件
 * @description 展示价格查询的统计数据，支持展开/收起详情
 */

import { useMemo, useState, useEffect } from 'react';

import { ChevronDown, ChevronUp, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

import { useTranslations } from '@/i18n';

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
 * 核心指标卡片组件
 */
interface CoreMetricCardProps {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  diffPercent?: number;
  compareMode?: boolean;
  hasBorder?: boolean;
}

function CoreMetricCard({
  label,
  value,
  prefix = '',
  suffix = '',
  trend = 'neutral',
  diffPercent,
  compareMode = false,
  hasBorder = true,
}: CoreMetricCardProps) {
  const trendColor =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-900';

  const getDiffBadgeStyle = (diff: number) => {
    if (diff > 0) {
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        arrow: <ArrowUpIcon className="w-3 h-3" aria-hidden="true" />,
      };
    } else if (diff < 0) {
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        arrow: <ArrowDownIcon className="w-3 h-3" aria-hidden="true" />,
      };
    }
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      arrow: null,
    };
  };

  const diffStyle = diffPercent !== undefined ? getDiffBadgeStyle(diffPercent) : null;

  return (
    <div
      className={`px-4 py-4 ${hasBorder ? 'border-r border-gray-200' : ''} ${compareMode && diffPercent !== undefined && diffPercent !== 0 ? (diffPercent > 0 ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500') : ''}`}
    >
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-sm text-gray-400 font-mono">{prefix}</span>}
        <span className={`text-xl font-bold font-mono ${trendColor}`}>
          {trend === 'up' && (
            <ArrowUpIcon
              className="inline-block w-4 h-4 mr-1 align-text-bottom"
              aria-hidden="true"
            />
          )}
          {trend === 'down' && (
            <ArrowDownIcon
              className="inline-block w-4 h-4 mr-1 align-text-bottom"
              aria-hidden="true"
            />
          )}
          {value}
        </span>
        {suffix && <span className="text-sm text-gray-400 font-mono">{suffix}</span>}
      </div>
      {compareMode && diffPercent !== undefined && diffStyle && (
        <div
          className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
        >
          {diffStyle.arrow}
          {diffPercent > 0 ? '+' : ''}
          {diffPercent.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

/**
 * 次要指标项组件
 */
interface SecondaryMetricItemProps {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subValue?: string;
  diffPercent?: number;
  compareMode?: boolean;
  hasBorder?: boolean;
}

function SecondaryMetricItem({
  label,
  value,
  prefix = '',
  suffix = '',
  subValue,
  diffPercent,
  compareMode = false,
  hasBorder = true,
}: SecondaryMetricItemProps) {
  const getDiffBadgeStyle = (diff: number) => {
    if (diff > 0) {
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        arrow: <ArrowUpIcon className="w-2.5 h-2.5" aria-hidden="true" />,
      };
    } else if (diff < 0) {
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        arrow: <ArrowDownIcon className="w-2.5 h-2.5" aria-hidden="true" />,
      };
    }
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      arrow: null,
    };
  };

  const diffStyle = diffPercent !== undefined ? getDiffBadgeStyle(diffPercent) : null;

  return (
    <div
      className={`px-4 py-3 ${hasBorder ? 'border-r border-gray-200' : ''} border-t border-gray-100 ${compareMode && diffPercent !== undefined && diffPercent !== 0 ? (diffPercent > 0 ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500') : ''}`}
    >
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-xs text-gray-400 font-mono">{prefix}</span>}
        <span className="text-base font-semibold font-mono text-gray-900">{value}</span>
        {suffix && <span className="text-xs text-gray-400 font-mono">{suffix}</span>}
      </div>
      {subValue && <div className="text-[10px] text-gray-400 mt-1 truncate">{subValue}</div>}
      {compareMode && diffPercent !== undefined && diffStyle && (
        <div
          className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}
        >
          {diffStyle.arrow}
          {diffPercent > 0 ? '+' : ''}
          {diffPercent.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

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
      return { label: t('priceQuery.stats.consistency.excellent'), color: 'text-emerald-600' };
    if (stdDevPercent < 0.3)
      return { label: t('priceQuery.stats.consistency.good'), color: 'text-blue-600' };
    if (stdDevPercent < 0.5)
      return { label: t('priceQuery.stats.consistency.fair'), color: 'text-amber-600' };
    return { label: t('priceQuery.stats.consistency.poor'), color: 'text-red-600' };
  };

  const consistencyRating =
    standardDeviationPercent > 0 ? getConsistencyRating(standardDeviationPercent) : null;

  // 计算对比差异百分比
  const calculateDiffPercent = (current: number, compare: number): number => {
    if (compare === 0) return 0;
    return ((current - compare) / compare) * 100;
  };

  const avgPriceDiff = compareMode ? calculateDiffPercent(avgPrice, compareAvgPrice) : 0;
  const maxPriceDiff = compareMode ? calculateDiffPercent(maxPrice, compareMaxPrice) : 0;
  const minPriceDiff = compareMode ? calculateDiffPercent(minPrice, compareMinPrice) : 0;
  const priceRangeDiff = compareMode ? calculateDiffPercent(priceRange, comparePriceRange) : 0;

  // 格式化数值
  const formatPrice = (price: number): string => {
    if (price <= 0) return '-';
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatChange24h = (change: number | undefined): { value: string; trend: 'up' | 'down' | 'neutral' } => {
    if (change === undefined) return { value: '-', trend: 'neutral' };
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
      trend: change >= 0 ? 'up' : 'down',
    };
  };

  const change24hData = formatChange24h(avgChange24hPercent);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 核心指标区域 - 4列网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4">
        {/* 平均价格 */}
        <CoreMetricCard
          label={t('priceQuery.stats.avgPrice')}
          value={formatPrice(avgPrice)}
          prefix="$"
          diffPercent={compareMode && avgPrice > 0 && compareAvgPrice > 0 ? avgPriceDiff : undefined}
          compareMode={compareMode}
          hasBorder
        />

        {/* 24小时变化 */}
        <CoreMetricCard
          label={t('priceQuery.stats.change24h')}
          value={change24hData.value}
          suffix="%"
          trend={change24hData.trend}
          diffPercent={
            compareMode &&
            avgChange24hPercent !== undefined &&
            compareAvgChange24hPercent !== undefined
              ? calculateDiffPercent(avgChange24hPercent, compareAvgChange24hPercent)
              : undefined
          }
          compareMode={compareMode}
          hasBorder
        />

        {/* 波动率 */}
        <CoreMetricCard
          label={t('priceQuery.stats.volatility')}
          value={volatility !== null ? volatility.toFixed(2) : '-'}
          suffix="%"
          hasBorder
        />

        {/* 数据点数 */}
        <CoreMetricCard
          label={t('priceQuery.stats.dataPoints')}
          value={dataPoints.toString()}
        />
      </div>

      {/* 展开的详细统计区域 */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* 最高价格 */}
        <SecondaryMetricItem
          label={t('priceQuery.stats.maxPrice')}
          value={formatPrice(maxPrice)}
          prefix="$"
          diffPercent={compareMode && maxPrice > 0 && compareMaxPrice > 0 ? maxPriceDiff : undefined}
          compareMode={compareMode}
          hasBorder
        />

        {/* 最低价格 */}
        <SecondaryMetricItem
          label={t('priceQuery.stats.minPrice')}
          value={formatPrice(minPrice)}
          prefix="$"
          diffPercent={compareMode && minPrice > 0 && compareMinPrice > 0 ? minPriceDiff : undefined}
          compareMode={compareMode}
          hasBorder
        />

        {/* 价格区间 */}
        <SecondaryMetricItem
          label={t('priceQuery.stats.priceRange')}
          value={formatPrice(priceRange)}
          prefix="$"
          diffPercent={
            compareMode && priceRange > 0 && comparePriceRange > 0 ? priceRangeDiff : undefined
          }
          compareMode={compareMode}
          hasBorder
        />

        {/* 标准差 */}
        <SecondaryMetricItem
          label={t('priceQuery.stats.standardDeviation')}
          value={standardDeviation > 0 ? standardDeviationPercent.toFixed(4) : '-'}
          suffix="%"
          subValue={
            standardDeviation > 0
              ? `${t('priceQuery.stats.absoluteValue')}: $${formatPrice(standardDeviation)}`
              : undefined
          }
        />

        {/* 查询耗时 */}
        <SecondaryMetricItem
          label={t('priceQuery.stats.queryDuration')}
          value={queryDuration !== null ? queryDuration.toString() : '-'}
          suffix=" ms"
          hasBorder
        />

        {/* 一致性评级 */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
            {t('priceQuery.stats.consistencyRating')}
          </div>
          <div
            className={`text-base font-semibold ${
              standardDeviationPercent > 0 ? consistencyRating?.color : 'text-gray-900'
            }`}
          >
            {standardDeviationPercent > 0 ? consistencyRating?.label : '-'}
          </div>
        </div>
      </div>

      {/* 展开/收起按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200"
        aria-expanded={isExpanded}
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        <span>{isExpanded ? t('priceQuery.stats.collapse') : t('priceQuery.stats.expand')}</span>
      </button>
    </div>
  );
}
