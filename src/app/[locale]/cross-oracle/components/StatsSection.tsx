'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { Clock, Shield, Activity } from 'lucide-react';

import { EnhancedStatCard } from '@/components/ui/EnhancedStatCard';
import { DataQualityIndicators } from '@/components/ui/DataQualityIndicators';

import { type HistoryMinMax, getTrendIcon, getHealthColor } from '../constants';

interface SparklineData {
  avgPrice?: number[];
  maxPrice?: number[];
  minPrice?: number[];
  priceRange?: number[];
  standardDeviation?: number[];
  variance?: number[];
}

interface StatsSectionProps {
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
  selectedSymbol: string;
  selectedOracles: string[];
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
  t: (key: string) => string;
  sparklineData?: SparklineData;
}

// 格式化价格显示
function formatPrice(value: number): string {
  if (value <= 0) return '-';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 格式化百分比显示
function formatPercent(value: number): string {
  return `±${value.toFixed(3)}%`;
}

export function StatsSection({
  qualityScoreData,
  selectedSymbol,
  selectedOracles,
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
  t,
  sparklineData,
}: StatsSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    setMounted(true);
    setFormattedTime(qualityScoreData.freshness.lastUpdated.toLocaleTimeString());
  }, [qualityScoreData.freshness.lastUpdated]);

  // 解析交易对
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');

  // 计算变化率
  const avgPriceChange = calculateChangePercent(avgPrice, lastStats?.avgPrice || 0);
  const maxPriceChange = calculateChangePercent(maxPrice, lastStats?.maxPrice || 0);

  // 获取一致性评级
  const consistencyRating = getConsistencyRating(standardDeviationPercent);
  const healthColor = getHealthColor('deviation', standardDeviationPercent);

  // 计算置信度（基于标准差，标准差越小置信度越高）
  const confidence = useMemo(() => {
    if (standardDeviationPercent <= 0) return 100;
    // 标准差越小，置信度越高
    const calculated = Math.max(0, Math.min(100, 100 - standardDeviationPercent * 10));
    return Math.round(calculated);
  }, [standardDeviationPercent]);

  // 桌面端统计卡片数据
  const desktopStats = useMemo(() => [
    {
      title: t('crossOracle.averagePrice'),
      value: avgPrice,
      change: avgPriceChange,
      sparkline: sparklineData?.avgPrice,
      tooltipContent: `${t('crossOracle.weighted')}: ${formatPrice(weightedAvgPrice)}`,
    },
    {
      title: t('crossOracle.highestPrice'),
      value: maxPrice,
      change: maxPriceChange,
      sparkline: sparklineData?.maxPrice,
      tooltipContent: `${t('crossOracle.low')}: ${formatPrice(minPrice)}`,
    },
    {
      title: t('crossOracle.priceRange'),
      value: priceRange,
      change: null,
      sparkline: sparklineData?.priceRange,
      tooltipContent: `${t('crossOracle.ofAverage')}: ${avgPrice > 0 ? ((priceRange / avgPrice) * 100).toFixed(2) : '-'}%`,
    },
    {
      title: t('crossOracle.standardDeviation'),
      value: standardDeviationPercent,
      change: null,
      sparkline: sparklineData?.standardDeviation,
      tooltipContent: `σ: ${variance > 0 ? `$${Math.sqrt(variance).toFixed(2)}` : '-'}`,
      isPercent: true,
    },
    {
      title: t('crossOracle.variance'),
      value: variance,
      change: null,
      sparkline: sparklineData?.variance,
      tooltipContent: 'V[x]',
      isCurrency: false,
    },
    {
      title: t('crossOracle.consistencyRating'),
      value: consistencyRating,
      change: null,
      sparkline: sparklineData?.avgPrice,
      tooltipContent: t('crossOracle.basedOnStdDev'),
      isBadge: true,
    },
  ], [avgPrice, weightedAvgPrice, maxPrice, minPrice, priceRange, standardDeviationPercent, variance, consistencyRating, avgPriceChange, maxPriceChange, sparklineData, t]);

  // 移动端统计卡片数据
  const mobileStats = useMemo(() => [
    {
      title: t('crossOracle.averagePrice'),
      value: avgPrice,
      change: avgPriceChange,
      sparkline: sparklineData?.avgPrice,
    },
    {
      title: t('crossOracle.highestPrice'),
      value: maxPrice,
      change: maxPriceChange,
      sparkline: sparklineData?.maxPrice,
    },
    {
      title: t('crossOracle.priceRange'),
      value: priceRange,
      change: null,
      sparkline: sparklineData?.priceRange,
    },
    {
      title: t('crossOracle.standardDeviation'),
      value: standardDeviationPercent,
      change: null,
      sparkline: sparklineData?.standardDeviation,
      isPercent: true,
    },
    {
      title: t('crossOracle.variance'),
      value: variance,
      change: null,
      sparkline: sparklineData?.variance,
    },
    {
      title: t('crossOracle.consistencyRating'),
      value: consistencyRating,
      change: null,
      sparkline: sparklineData?.avgPrice,
      isBadge: true,
    },
  ], [avgPrice, maxPrice, priceRange, standardDeviationPercent, variance, consistencyRating, avgPriceChange, maxPriceChange, sparklineData, t]);

  // 格式化数值显示
  const formatValue = (stat: typeof desktopStats[0]): string => {
    if (stat.isBadge) return stat.value as string;
    if (stat.isPercent) return formatPercent(stat.value as number);
    if (stat.isCurrency === false) return (stat.value as number).toFixed(2);
    return formatPrice(stat.value as number);
  };

  return (
    <div className="mb-4">
      {/* 头部区域：交易对信息 + 关键统计 */}
      <div className="mb-4 border-b border-gray-200 pb-3">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* 左侧：交易对主信息 */}
          <div className="flex-1">
            {/* Live 徽章 - 带脉冲动画 */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 rounded">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">
                  {t('crossOracle.live')}
                </span>
              </span>
            </div>

            {/* 交易对显示 */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
                {baseAsset}
              </span>
              <span className="text-base text-gray-400 font-medium">/{quoteAsset}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('crossOracle.crossOraclePriceComparison')}
            </p>
          </div>

          {/* 右侧：关键统计 */}
          <div className="lg:w-auto flex gap-4">
            <div className="flex items-start gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.oracleCount')}</p>
                <p className="text-base font-semibold text-gray-900">{selectedOracles.length}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.dataQuality')}</p>
                <p className="text-base font-semibold text-gray-900">
                  {qualityScoreData.reliability.responseSuccessRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{t('time.lastUpdated')}</p>
                <p className="text-xs font-medium text-gray-900">{mounted ? formattedTime : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 数据质量指标区域 */}
      <div className="mb-4">
        <DataQualityIndicators
          freshness={qualityScoreData.freshness}
          completeness={qualityScoreData.completeness}
          reliability={qualityScoreData.reliability}
          compact
        />
      </div>

      {/* 桌面端统计卡片 - 使用 EnhancedStatCard */}
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4 py-4 border-b border-gray-100">
        {desktopStats.map((stat, index) => (
          <EnhancedStatCard
            key={index}
            title={stat.title}
            value={formatValue(stat)}
            change={stat.change ?? undefined}
            trend={stat.change !== null ? (stat.change > 0 ? 'up' : stat.change < 0 ? 'down' : 'stable') : 'stable'}
            sparklineData={stat.sparkline}
            confidence={stat.isBadge ? undefined : confidence}
            tooltipContent={stat.tooltipContent}
            variant="compact"
          />
        ))}
      </div>

      {/* 移动端统计卡片 - 横向滚动 */}
      <div className="md:hidden flex overflow-x-auto gap-4 pb-4 -mx-4 px-4">
        {mobileStats.map((stat, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-44"
          >
            <EnhancedStatCard
              title={stat.title}
              value={stat.isBadge ? (stat.value as string) : stat.isPercent ? formatPercent(stat.value as number) : formatPrice(stat.value as number)}
              change={stat.change ?? undefined}
              trend={stat.change !== null ? (stat.change > 0 ? 'up' : stat.change < 0 ? 'down' : 'stable') : 'stable'}
              sparklineData={stat.sparkline}
              confidence={stat.isBadge ? undefined : confidence}
              variant="compact"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
