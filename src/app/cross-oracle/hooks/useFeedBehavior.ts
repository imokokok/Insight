import { useMemo, useState, useEffect } from 'react';

import {
  calculateFeedBehavior,
  type FeedBehaviorResult,
  type UpdateRhythmMetrics,
  type ConfidenceIntervalMetrics,
  type HeartbeatMetrics,
  type FeedHealthScore,
  type FeedHealthLevel,
} from '@/lib/analytics/feedBehavior';
import { createLogger } from '@/lib/utils/logger';
import { type PriceData } from '@/types/oracle';

import {
  extractHistories,
  enrichWithConfidence,
  type HistoryEntry,
} from '../utils/historyExtraction';

import { type PriceHistoryMap } from './useOracleMemory';

const logger = createLogger('useFeedBehavior');

export interface FeedBehaviorHookResult {
  feedBehaviorResult: FeedBehaviorResult | null;
  rhythmMetrics: UpdateRhythmMetrics[];
  confidenceMetrics: ConfidenceIntervalMetrics[];
  heartbeatMetrics: HeartbeatMetrics[];
  healthScores: FeedHealthScore[];
  overallHealthAvg: number;
  overallHealthLevel: FeedHealthLevel;
  anomalyCount: number;
  heartbeatLostCount: number;
  confidenceSurgeCount: number;
  isCalculating: boolean;
}

export function useFeedBehavior(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): FeedBehaviorHookResult {
  const [priceHistories, setPriceHistories] = useState<Map<string, HistoryEntry[]>>(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  const result = useMemo(() => {
    if (priceData.length === 0) {
      return {
        feedBehaviorResult: null,
        rhythmMetrics: [],
        confidenceMetrics: [],
        heartbeatMetrics: [],
        healthScores: [],
        overallHealthAvg: 0,
        overallHealthLevel: 'critical' as FeedHealthLevel,
        anomalyCount: 0,
        heartbeatLostCount: 0,
        confidenceSurgeCount: 0,
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
              confidenceInterval: p.confidenceInterval,
            },
          ]);
        }
      }

      const feedPriceData = priceData.map((p) => ({
        provider: p.provider,
        price: p.price,
        timestamp: p.timestamp,
        success: true,
        confidence: p.confidence,
        confidenceInterval: p.confidenceInterval,
      }));

      const feedBehaviorResult = calculateFeedBehavior(feedPriceData, historyMap);

      return {
        feedBehaviorResult,
        rhythmMetrics: feedBehaviorResult.rhythmMetrics,
        confidenceMetrics: feedBehaviorResult.confidenceMetrics,
        heartbeatMetrics: feedBehaviorResult.heartbeatMetrics,
        healthScores: feedBehaviorResult.healthScores,
        overallHealthAvg: feedBehaviorResult.overallHealthAvg,
        overallHealthLevel: feedBehaviorResult.overallHealthLevel,
        anomalyCount: feedBehaviorResult.anomalyCount,
        heartbeatLostCount: feedBehaviorResult.heartbeatLostCount,
        confidenceSurgeCount: feedBehaviorResult.confidenceSurgeCount,
        isCalculating: false,
      };
    } catch (error) {
      logger.error(
        'Error calculating feed behavior',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        feedBehaviorResult: null,
        rhythmMetrics: [],
        confidenceMetrics: [],
        heartbeatMetrics: [],
        healthScores: [],
        overallHealthAvg: 0,
        overallHealthLevel: 'critical' as FeedHealthLevel,
        anomalyCount: 0,
        heartbeatLostCount: 0,
        confidenceSurgeCount: 0,
        isCalculating: false,
      };
    }
  }, [priceData, priceHistories]);

  return result;
}
