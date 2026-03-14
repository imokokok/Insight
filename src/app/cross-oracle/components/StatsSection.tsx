'use client';

import React from 'react';
import { DataQualityScoreCard } from '@/components/oracle/common/DataQualityScoreCard';
import { StatsCards, MobileStatsCards } from './StatsCards';
import { HistoryMinMax } from '../constants';

interface StatsSectionProps {
  qualityScoreData: {
    freshness: { lastUpdated: Date };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number };
  };
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
}

export function StatsSection({
  qualityScoreData,
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
}: StatsSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-8">
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
