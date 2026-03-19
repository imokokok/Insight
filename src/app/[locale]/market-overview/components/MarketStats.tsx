'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { MarketStats as MarketStatsType } from '../types';

interface MarketStatsProps {
  marketStats: MarketStatsType;
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
}

export default function MarketStats({
  marketStats,
  totalTVS,
  totalChains,
  totalProtocols,
}: MarketStatsProps) {
  const locale = useLocale();

  return (
    <div className="flex flex-wrap items-end gap-8 lg:gap-12 mb-8 pb-6 border-b border-gray-200">
      <div>
        <p className="text-xs text-gray-500 lowercase tracking-wide">
          {isChineseLocale(locale) ? '总 tvs' : 'total tvs'}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-semibold text-gray-900">{totalTVS}</p>
          <span
            className={`text-sm font-medium ${
              marketStats.change24h >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {marketStats.change24h >= 0 ? '+' : ''}
            {marketStats.change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 lowercase tracking-wide">
          {isChineseLocale(locale) ? '支持链数' : 'chains'}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-semibold text-gray-900">{totalChains}</p>
          <span className="text-sm font-medium text-green-600">+12.5%</span>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 lowercase tracking-wide">
          {isChineseLocale(locale) ? '协议数量' : 'protocols'}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-semibold text-gray-900">{totalProtocols}+</p>
          <span className="text-sm font-medium text-green-600">+8.3%</span>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 lowercase tracking-wide">
          {isChineseLocale(locale) ? '市场主导' : 'dominance'}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-semibold text-gray-900">{marketStats.marketDominance}%</p>
          <span className="text-sm font-medium text-gray-500">-0.5%</span>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 lowercase tracking-wide">
          {isChineseLocale(locale) ? '平均延迟' : 'latency'}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-semibold text-gray-900">
            {marketStats.avgUpdateLatency}ms
          </p>
          <span className="text-sm font-medium text-green-600">-5.2%</span>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 lowercase tracking-wide">
          {isChineseLocale(locale) ? '预言机数' : 'oracles'}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-3xl font-semibold text-gray-900">{marketStats.oracleCount}</p>
          <span className="text-sm font-medium text-green-600">+2</span>
        </div>
      </div>
    </div>
  );
}
