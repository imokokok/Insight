'use client';

import React, { useState, useEffect } from 'react';

import { Clock, Shield, Activity } from 'lucide-react';

import { DataQualityScoreCard } from '@/components/oracle/data-display/DataQualityScoreCard';

import { type HistoryMinMax } from '../constants';

import { StatsCards, MobileStatsCards } from './StatsCards';

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

  return (
    <div className="mb-4">
      {/* 交易对信息卡片 - Compact 风格 */}
      <div className="mb-4 border-b border-gray-200 pb-3">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* 左侧：交易对主信息 */}
          <div className="flex-1">
            {/* 顶部：Live 徽章 */}
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

      <div className="mb-4">
        <DataQualityScoreCard
          freshness={qualityScoreData.freshness}
          completeness={qualityScoreData.completeness}
          reliability={qualityScoreData.reliability}
          compact
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
        sparklineData={sparklineData}
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
        sparklineData={sparklineData}
      />
    </div>
  );
}
