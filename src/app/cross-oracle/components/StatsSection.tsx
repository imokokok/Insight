'use client';

import React from 'react';
import { TrendingUp, Clock, Shield, Activity, ChevronDown } from 'lucide-react';
import { DataQualityScoreCard } from '@/components/oracle/common/DataQualityScoreCard';
import { StatsCards, MobileStatsCards } from './StatsCards';
import { HistoryMinMax, symbols } from '../constants';

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
  onSymbolChange: (symbol: string) => void;
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
  onSymbolChange,
}: StatsSectionProps) {
  // 解析交易对
  const [baseAsset, quoteAsset] = selectedSymbol.split('/');

  return (
    <div className="mb-8">
      {/* 交易对信息卡片 - Dune 风格扁平化 */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* 左侧：交易对主信息 + 选择器 */}
          <div className="flex-1">
            {/* 顶部：Live 徽章和交易对选择器 */}
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">{t('crossOracle.live')}</span>
              </span>

              {/* 交易对选择器 */}
              <div className="relative">
                <select
                  value={selectedSymbol}
                  onChange={(e) => onSymbolChange(e.target.value)}
                  className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium rounded pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                >
                  {symbols.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 交易对显示 */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">{baseAsset}</span>
              <span className="text-lg text-gray-400 font-medium">/{quoteAsset}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{t('crossOracle.crossOraclePriceComparison')}</p>
          </div>

          {/* 右侧：关键统计 */}
          <div className="lg:w-auto flex gap-6">
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.oracleCount')}</p>
                <p className="text-lg font-semibold text-gray-900">{selectedOracles.length}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-purple-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.dataQuality')}</p>
                <p className="text-lg font-semibold text-gray-900">{qualityScoreData.reliability.responseSuccessRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{t('crossOracle.lastUpdated')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {qualityScoreData.freshness.lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <DataQualityScoreCard
          freshness={qualityScoreData.freshness}
          completeness={qualityScoreData.completeness}
          reliability={qualityScoreData.reliability}
        />
      </div>

      <StatsCards
        avgPrice={avgPrice}
        weightedAvgPrice={weightedAvgPrice}
        maxPrice={maxPrice}
        minPrice={minPrice}
        priceRange={priceRange}
        standardDeviationPercent={standardDeviationPercent}
        variance={variance}
        lastStats={lastStats}
        historyMinMax={historyMinMax}
        calculateChangePercent={calculateChangePercent}
        getConsistencyRating={getConsistencyRating}
        t={t}
      />
      <MobileStatsCards
        avgPrice={avgPrice}
        maxPrice={maxPrice}
        minPrice={minPrice}
        priceRange={priceRange}
        standardDeviationPercent={standardDeviationPercent}
        variance={variance}
        lastStats={lastStats}
        calculateChangePercent={calculateChangePercent}
        getConsistencyRating={getConsistencyRating}
        t={t}
      />
    </div>
  );
}
