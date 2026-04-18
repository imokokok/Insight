/**
 * @fileoverview 数据质量评分 Hook
 * @description 计算数据质量的专业指标（变异系数、置信区间、Z-Score等）
 */

import { useMemo } from 'react';

import { calculateMean, calculateStdDev } from '@/lib/utils/statistics';

import type { DataQualityScore as DataQualityScoreType } from '../types/index';

function getScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export function useDataQualityScore(params: {
  prices?: number[];
  lastUpdated?: number;
  successCount?: number;
  totalCount?: number;
  currentTime?: number;
}): {
  score: DataQualityScoreType;
  isGood: boolean;
  level: 'excellent' | 'good' | 'fair' | 'poor';
} {
  const { prices = [], lastUpdated, successCount = 0, totalCount = 0, currentTime } = params;

  const now = currentTime ?? Date.now();

  const score = useMemo<DataQualityScoreType>(() => {
    const validPrices = prices.filter((p) => p > 0);
    let consistency = 100;
    if (validPrices.length >= 2) {
      const mean = calculateMean(validPrices);
      const stdDev = calculateStdDev(validPrices, mean);
      const cv = mean !== 0 ? stdDev / mean : 0;
      consistency = Math.round(Math.max(0, Math.min(100, 100 * Math.exp(-20 * cv))));
    }

    let freshness = 0;
    if (lastUpdated && lastUpdated > 0) {
      const ageMs = now - lastUpdated;
      if (ageMs <= 30000) freshness = 100;
      else if (ageMs <= 60000) freshness = Math.round(100 - ((ageMs - 30000) / 30000) * 20);
      else if (ageMs <= 300000) freshness = Math.round(80 - ((ageMs - 60000) / 240000) * 30);
      else freshness = Math.max(0, Math.round(50 * Math.exp(-(ageMs - 300000) / 600000)));
    }

    const completeness = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    const overall = Math.round(consistency * 0.4 + freshness * 0.35 + completeness * 0.25);

    return {
      consistency,
      freshness,
      completeness,
      overall,
      suggestions: [],
    };
  }, [prices, lastUpdated, successCount, totalCount, now]);

  return {
    score,
    isGood: score.overall >= 60,
    level: getScoreLevel(score.overall),
  };
}
