import { useMemo, useState, useEffect } from 'react';

import {
  calculateStability,
  resetStabilityHistory,
  type StabilityResult,
  type StabilityScore as StabilityScoreType,
  type StabilityHistoryPoint,
  type StabilityLevel,
} from '@/lib/analytics/stabilityScore';
import { createLogger } from '@/lib/utils/logger';
import { type PriceData } from '@/types/oracle';

import {
  extractHistories,
  enrichWithConfidence,
  type HistoryEntry,
} from '../utils/historyExtraction';

import { type PriceHistoryMap } from './useOracleMemory';

const logger = createLogger('useStabilityScore');

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

export function useStabilityScore(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): StabilityScoreHookResult {
  const [priceHistories, setPriceHistories] = useState<Map<string, HistoryEntry[]>>(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  const providerKey = priceData.map((p) => p.provider).join(',');

  useEffect(() => {
    resetStabilityHistory();
  }, [providerKey]);

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

      enrichWithConfidence(historyMap, priceData);

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
    } catch (error) {
      logger.error(
        'Error calculating stability score',
        error instanceof Error ? error : new Error(String(error))
      );
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
