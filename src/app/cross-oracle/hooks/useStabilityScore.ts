import { useMemo, useState, useEffect } from 'react';

import {
  calculateStability,
  type StabilityResult,
  type StabilityScore as StabilityScoreType,
  type StabilityHistoryPoint,
  type StabilityLevel,
} from '@/lib/analytics/stabilityScore';
import { type PriceData } from '@/types/oracle';

import { type PriceHistoryMap } from './useOracleMemory';

export interface StabilityScoreHookResult {
  stabilityResult: StabilityResult | null;
  scores: StabilityScoreType[];
  history: StabilityHistoryPoint[];
  decliningCount: number;
  rapidlyDecliningCount: number;
  averageScore: number;
  averageLevel: StabilityLevel;
  worstProvider: string | null;
  worstScore: number;
  isCalculating: boolean;
}

function extractStabilityHistories(
  priceHistoryMap: PriceHistoryMap
): Map<string, Array<{ price: number; timestamp: number; success: boolean; confidence?: number }>> {
  const result = new Map<
    string,
    Array<{ price: number; timestamp: number; success: boolean; confidence?: number }>
  >();
  for (const [provider, history] of priceHistoryMap) {
    const entries = history
      .filter((h) => h.success && h.price > 0)
      .map((h) => ({
        price: h.price,
        timestamp: h.timestamp,
        success: h.success,
      }));
    if (entries.length > 0) {
      result.set(provider, entries);
    }
  }
  return result;
}

export function useStabilityScore(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): StabilityScoreHookResult {
  const [priceHistories, setPriceHistories] = useState<
    Map<string, Array<{ price: number; timestamp: number; success: boolean; confidence?: number }>>
  >(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractStabilityHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  const result = useMemo(() => {
    if (priceData.length === 0) {
      return {
        stabilityResult: null,
        scores: [],
        history: [],
        decliningCount: 0,
        rapidlyDecliningCount: 0,
        averageScore: 0,
        averageLevel: 'critical' as StabilityLevel,
        worstProvider: null,
        worstScore: 0,
        isCalculating: false,
      };
    }

    try {
      const historyMap = new Map(priceHistories);

      for (const p of priceData) {
        if (!historyMap.has(p.provider) && p.price > 0) {
          historyMap.set(p.provider, [
            {
              price: p.price,
              timestamp: p.timestamp,
              success: true,
              confidence: p.confidence,
            },
          ]);
        }
      }

      const providerNames = priceData.map((p) => p.provider);
      const stabilityResult = calculateStability(providerNames, historyMap);

      return {
        stabilityResult,
        scores: stabilityResult.scores,
        history: stabilityResult.history,
        decliningCount: stabilityResult.decliningCount,
        rapidlyDecliningCount: stabilityResult.rapidlyDecliningCount,
        averageScore: stabilityResult.averageScore,
        averageLevel: stabilityResult.averageLevel,
        worstProvider: stabilityResult.worstProvider,
        worstScore: stabilityResult.worstScore,
        isCalculating: false,
      };
    } catch {
      return {
        stabilityResult: null,
        scores: [],
        history: [],
        decliningCount: 0,
        rapidlyDecliningCount: 0,
        averageScore: 0,
        averageLevel: 'critical' as StabilityLevel,
        worstProvider: null,
        worstScore: 0,
        isCalculating: false,
      };
    }
  }, [priceData, priceHistories]);

  return result;
}
