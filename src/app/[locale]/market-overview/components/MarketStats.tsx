'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

import { type MarketStats as MarketStatsType } from '../types';

interface MarketStatsProps {
  marketStats: MarketStatsType;
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
}

/**
 * 格式化变化值显示
 */
function formatChangeValue(value: number, isPercentage: boolean = true): string {
  const sign = value >= 0 ? '+' : '';
  const suffix = isPercentage ? '%' : '';
  return `${sign}${value.toFixed(2)}${suffix}`;
}

/**
 * 单个指标项组件
 */
function StatItem({
  label,
  value,
  change,
  isPositive,
  isNegative,
  showDivider = true,
}: {
  label: string;
  value: string | number;
  change: number;
  isPositive: boolean;
  isNegative: boolean;
  showDivider?: boolean;
}) {
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColorClass = isPositive
    ? 'text-success-600'
    : isNegative
      ? 'text-danger-600'
      : 'text-gray-500';

  return (
    <div className="flex items-center">
      <div className="flex flex-col">
        {/* 标签 */}
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        {/* 数值和变化 */}
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-semibold text-gray-900 tabular-nums">{value}</span>
          <div className={cn('flex items-center gap-0.5', trendColorClass)}>
            <TrendIcon className="w-3 h-3 flex-shrink-0" />
            <span className="text-xs font-medium tabular-nums">
              {formatChangeValue(change, true)}
            </span>
          </div>
        </div>
      </div>
      {/* 分隔线 */}
      {showDivider && <span className="text-gray-300 mx-4 sm:mx-6 hidden sm:block">|</span>}
    </div>
  );
}

/**
 * 移动端优先显示的简化指标项（无分隔线）
 */
function MobileStatItem({
  label,
  value,
  change,
  isPositive,
  isNegative,
}: {
  label: string;
  value: string | number;
  change: number;
  isPositive: boolean;
  isNegative: boolean;
}) {
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const trendColorClass = isPositive
    ? 'text-success-600'
    : isNegative
      ? 'text-danger-600'
      : 'text-gray-500';

  return (
    <div className="flex flex-col flex-shrink-0">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-lg font-semibold text-gray-900 tabular-nums">{value}</span>
        <div className={cn('flex items-center gap-0.5', trendColorClass)}>
          <TrendIcon className="w-3 h-3 flex-shrink-0" />
          <span className="text-xs font-medium tabular-nums">
            {formatChangeValue(change, true)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MarketStats({
  marketStats,
  totalTVS,
  totalChains,
  totalProtocols,
}: MarketStatsProps) {
  const t = useTranslations('marketOverview.stats');

  const coreStats = [
    {
      label: t('totalTVS'),
      value: totalTVS,
      change: marketStats.change24h,
    },
    {
      label: t('totalChains'),
      value: totalChains,
      change: marketStats.chainsChange24h,
    },
    {
      label: t('totalProtocols'),
      value: `${totalProtocols}+`,
      change: marketStats.protocolsChange24h,
    },
  ];

  const secondaryStats = [
    {
      label: t('marketDominance'),
      value: `${marketStats.marketDominance}%`,
      change: marketStats.dominanceChange24h,
    },
    {
      label: t('avgLatency'),
      value: `${marketStats.avgUpdateLatency}ms`,
      change: marketStats.latencyChange24h,
    },
    {
      label: t('oracleCount'),
      value: marketStats.oracleCount,
      change: marketStats.oracleCountChange24h,
    },
  ];

  return (
    <div className="w-full">
      {/* 桌面端和平板端：完整显示，使用分隔线 */}
      <div className="hidden sm:flex items-center overflow-x-auto">
        {coreStats.map((stat, index) => (
          <StatItem
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            isPositive={stat.change > 0}
            isNegative={stat.change < 0}
            showDivider={index < coreStats.length - 1}
          />
        ))}
        <span className="text-gray-300 mx-6">|</span>
        {secondaryStats.map((stat, index) => (
          <StatItem
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            isPositive={stat.change > 0}
            isNegative={stat.change < 0}
            showDivider={index < secondaryStats.length - 1}
          />
        ))}
      </div>

      {/* 移动端：优先显示核心指标，可横向滚动 */}
      <div className="flex sm:hidden items-start gap-6 overflow-x-auto pb-2">
        {coreStats.map((stat) => (
          <MobileStatItem
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            isPositive={stat.change > 0}
            isNegative={stat.change < 0}
          />
        ))}
        {/* 次要指标在移动端也可滚动查看 */}
        {secondaryStats.map((stat) => (
          <MobileStatItem
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            isPositive={stat.change > 0}
            isNegative={stat.change < 0}
          />
        ))}
      </div>
    </div>
  );
}
