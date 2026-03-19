'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { MarketStats as MarketStatsType } from '../types';
import { baseColors, semanticColors } from '@/lib/config/colors';

interface MarketStatsProps {
  marketStats: MarketStatsType;
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
}

interface StatItemProps {
  label: string;
  value: string | number;
  change?: string;
  changeValue?: number;
  suffix?: string;
  isPrimary?: boolean;
}

function StatItem({ label, value, change, changeValue, suffix, isPrimary }: StatItemProps) {
  const isPositive = changeValue !== undefined ? changeValue >= 0 : true;
  const changeColor = isPositive ? semanticColors.success.main : semanticColors.danger.main;

  return (
    <div
      className={`group relative flex flex-col justify-center transition-all duration-200 ${
        isPrimary ? 'px-6 py-4' : 'px-4 py-3'
      }`}
      style={{
        backgroundColor: isPrimary ? baseColors.gray[50] : 'transparent',
      }}
    >
      <p
        className={`lowercase tracking-wide transition-colors duration-200 ${
          isPrimary ? 'text-xs text-gray-500 mb-1' : 'text-[11px] text-gray-400 mb-0.5'
        }`}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p
          className={`font-semibold text-gray-900 transition-all duration-200 ${
            isPrimary ? 'text-4xl' : 'text-2xl'
          }`}
        >
          {value}
          {suffix && <span className="text-lg text-gray-500 ml-0.5">{suffix}</span>}
        </p>
        {change && (
          <span
            className="text-sm font-medium px-1.5 py-0.5 border"
            style={{
              color: changeColor,
              backgroundColor: isPositive
                ? semanticColors.success.light
                : semanticColors.danger.light,
              borderColor: isPositive
                ? semanticColors.success.light
                : semanticColors.danger.light,
            }}
          >
            {isPositive ? '+' : ''}
            {change}
          </span>
        )}
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
  const locale = useLocale();

  const stats: StatItemProps[] = [
    {
      label: isChineseLocale(locale) ? '总 tvs' : 'total tvs',
      value: totalTVS,
      change: `${marketStats.change24h.toFixed(2)}%`,
      changeValue: marketStats.change24h,
      isPrimary: true,
    },
    {
      label: isChineseLocale(locale) ? '支持链数' : 'chains',
      value: totalChains,
      change: '+12.5%',
      changeValue: 12.5,
    },
    {
      label: isChineseLocale(locale) ? '协议数量' : 'protocols',
      value: totalProtocols,
      suffix: '+',
      change: '+8.3%',
      changeValue: 8.3,
    },
    {
      label: isChineseLocale(locale) ? '市场主导' : 'dominance',
      value: `${marketStats.marketDominance}%`,
      change: '-0.5%',
      changeValue: -0.5,
    },
    {
      label: isChineseLocale(locale) ? '平均延迟' : 'latency',
      value: `${marketStats.avgUpdateLatency}ms`,
      change: '-5.2%',
      changeValue: -5.2,
    },
    {
      label: isChineseLocale(locale) ? '预言机数' : 'oracles',
      value: marketStats.oracleCount,
      change: '+2',
      changeValue: 2,
    },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-0">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`relative ${index !== stats.length - 1 ? 'border-r border-gray-200' : ''}`}
        >
          <StatItem {...stat} />
        </div>
      ))}
    </div>
  );
}
