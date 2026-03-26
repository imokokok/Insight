'use client';

/**
 * @fileoverview 移动端统计视图组件
 * @description 专为移动端优化的统计信息展示，使用卡片式布局和滑动展示
 */

import { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Activity, BarChart3, Scale, Sigma } from 'lucide-react';

import { SparklineChart } from '@/components/ui';
import { type OracleProvider } from '@/types/oracle';

import { getHealthColor, type HistoryMinMax } from '../constants';

interface MobileStatsViewProps {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
  variance: number;
  lastStats: {
    avgPrice: number;
    maxPrice: number;
  } | null;
  historyMinMax: HistoryMinMax;
  calculateChangePercent: (current: number, previous: number) => number | null;
  getConsistencyRating: (stdDevPercent: number) => string;
  sparklineData?: {
    avgPrice?: number[];
    maxPrice?: number[];
    minPrice?: number[];
    priceRange?: number[];
    standardDeviation?: number[];
    variance?: number[];
  };
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface StatCard {
  id: string;
  label: string;
  value: number | string;
  subValue?: string;
  change: number | null;
  icon: React.ReactNode;
  sparkline?: number[];
  color: 'blue' | 'green' | 'amber' | 'purple' | 'rose';
  format: 'currency' | 'percent' | 'raw' | 'badge';
}

const colorSchemes = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
    icon: 'text-blue-500',
    sparkline: '#3B82F6',
  },
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    icon: 'text-emerald-500',
    sparkline: '#10B981',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
    icon: 'text-amber-500',
    sparkline: '#F59E0B',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-700',
    icon: 'text-purple-500',
    sparkline: '#8B5CF6',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    text: 'text-rose-700',
    icon: 'text-rose-500',
    sparkline: '#F43F5E',
  },
};

function TrendIndicator({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        <Minus className="w-3 h-3 mr-0.5" />
        -
      </span>
    );
  }

  const isPositive = change >= 0;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
        isPositive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3 mr-0.5" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-0.5" />
      )}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

function ConsistencyBadge({ rating, t }: { rating: string; t: (key: string) => string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    excellent: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    good: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    fair: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    poor: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  };

  const color = colors[rating] || colors.poor;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${color.bg} ${color.text} ${color.border}`}
    >
      {t(`consistency.${rating}`) || rating}
    </span>
  );
}

export function MobileStatsView({
  avgPrice,
  weightedAvgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviationPercent,
  variance,
  lastStats,
  historyMinMax,
  calculateChangePercent,
  getConsistencyRating,
  sparklineData,
  t,
}: MobileStatsViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const consistencyRating = getConsistencyRating(standardDeviationPercent);
  const healthColor = getHealthColor('deviation', standardDeviationPercent);

  // 构建统计数据卡片
  const stats: StatCard[] = [
    {
      id: 'avgPrice',
      label: t('crossOracle.averagePrice') || 'Average Price',
      value: avgPrice,
      subValue: `${t('crossOracle.weighted') || 'Weighted'}: ${weightedAvgPrice > 0
        ? `$${weightedAvgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '-'
      }`,
      change: calculateChangePercent(avgPrice, lastStats?.avgPrice || 0),
      icon: <BarChart3 className="w-5 h-5" />,
      sparkline: sparklineData?.avgPrice,
      color: 'blue',
      format: 'currency',
    },
    {
      id: 'priceRange',
      label: t('crossOracle.priceRange') || 'Price Range',
      value: priceRange,
      subValue: `${avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}% ${t('crossOracle.ofAverage') || 'of avg'}`,
      change: null,
      icon: <Activity className="w-5 h-5" />,
      sparkline: sparklineData?.priceRange,
      color: 'amber',
      format: 'currency',
    },
    {
      id: 'maxPrice',
      label: t('crossOracle.highestPrice') || 'Highest Price',
      value: maxPrice,
      subValue: `${t('crossOracle.low') || 'Low'}: ${minPrice > 0
        ? `$${minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '-'
      }`,
      change: calculateChangePercent(maxPrice, lastStats?.maxPrice || 0),
      icon: <TrendingUp className="w-5 h-5" />,
      sparkline: sparklineData?.maxPrice,
      color: 'green',
      format: 'currency',
    },
    {
      id: 'stdDev',
      label: t('crossOracle.standardDeviation') || 'Std Deviation',
      value: standardDeviationPercent,
      subValue: `σ: ${variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}`,
      change: null,
      icon: <Sigma className="w-5 h-5" />,
      sparkline: sparklineData?.standardDeviation,
      color: 'purple',
      format: 'percent',
    },
    {
      id: 'variance',
      label: t('crossOracle.variance') || 'Variance',
      value: variance,
      subValue: 'V[x]',
      change: null,
      icon: <Scale className="w-5 h-5" />,
      sparkline: sparklineData?.variance,
      color: 'rose',
      format: 'raw',
    },
    {
      id: 'consistency',
      label: t('crossOracle.consistencyRating') || 'Consistency',
      value: consistencyRating,
      subValue: t('crossOracle.basedOnStdDev') || 'Based on std dev',
      change: null,
      icon: <Activity className="w-5 h-5" />,
      sparkline: sparklineData?.avgPrice,
      color: 'green',
      format: 'badge',
    },
  ];

  // 触摸滑动处理
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < stats.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // 自动轮播（可选）
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stats.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [stats.length]);

  const currentStat = stats[currentIndex];
  const colors = colorSchemes[currentStat.color];

  const formatValue = (stat: StatCard) => {
    if (stat.format === 'badge') {
      return <ConsistencyBadge rating={stat.value as string} t={t} />;
    }

    if (typeof stat.value === 'string') {
      return stat.value;
    }

    if (stat.value <= 0) return '-';

    switch (stat.format) {
      case 'currency':
        return `$${stat.value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      case 'percent':
        return `±${(stat.value as number).toFixed(3)}%`;
      case 'raw':
        return `$${(stat.value as number).toFixed(2)}`;
      default:
        return String(stat.value);
    }
  };

  return (
    <div className="md:hidden">
      {/* 主卡片区域 */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all duration-300`}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${colors.icon}`}>{currentStat.icon}</div>
              <span className="text-sm font-medium text-gray-600">{currentStat.label}</span>
            </div>
            {currentStat.change !== null && <TrendIndicator change={currentStat.change} />}
          </div>

          {/* 主数值 */}
          <div className="mb-2">
            <div className={`text-2xl font-bold ${colors.text}`}>
              {formatValue(currentStat)}
            </div>
            {currentStat.subValue && (
              <div className="text-xs text-gray-500 mt-1">{currentStat.subValue}</div>
            )}
          </div>

          {/* Sparkline */}
          {currentStat.sparkline && currentStat.sparkline.length > 0 && (
            <div className="mt-3 h-12">
              <SparklineChart
                data={currentStat.sparkline}
                width={280}
                height={48}
                color={colors.sparkline}
                fill
                animate
              />
            </div>
          )}

          {/* 历史范围 */}
          {historyMinMax[currentStat.id as keyof HistoryMinMax]?.max > -Infinity && (
            <div className="mt-3 pt-3 border-t border-gray-200/50">
              <div className="text-xs text-gray-500">
                {t('crossOracle.historyRange') || 'History Range'}:{' '}
                {currentStat.format === 'currency' && '$'}
                {historyMinMax[currentStat.id as keyof HistoryMinMax]?.min.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
                {' - '}
                {currentStat.format === 'currency' && '$'}
                {historyMinMax[currentStat.id as keyof HistoryMinMax]?.max.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
          )}
        </div>

        {/* 滑动提示 */}
        <div className="absolute inset-y-0 left-0 flex items-center">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="p-1 rounded-full bg-white/80 shadow-sm disabled:opacity-0 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(stats.length - 1, prev + 1))}
            disabled={currentIndex === stats.length - 1}
            className="p-1 rounded-full bg-white/80 shadow-sm disabled:opacity-0 transition-opacity"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 指示器 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {stats.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-6 bg-primary-500'
                : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to stat ${index + 1}`}
          />
        ))}
      </div>

      {/* 快速统计概览 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: t('crossOracle.avg') || 'Avg', value: avgPrice, format: 'currency' },
          { label: t('crossOracle.range') || 'Range', value: priceRange, format: 'currency' },
          { label: t('crossOracle.stdDev') || 'Std', value: standardDeviationPercent, format: 'percent' },
        ].map((item, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100"
          >
            <div className="text-xs text-gray-500 mb-0.5">{item.label}</div>
            <div className="text-sm font-semibold text-gray-900">
              {item.value > 0
                ? item.format === 'currency'
                  ? `$${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : `${item.value.toFixed(2)}%`
                : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
