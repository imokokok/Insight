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
import { type PriceData } from '@/types/oracle';

import { type PriceHistoryMap } from './useOracleMemory';

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

function extractFeedHistories(priceHistoryMap: PriceHistoryMap): Map<
  string,
  Array<{
    price: number;
    timestamp: number;
    success: boolean;
    confidence?: number;
    confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
  }>
> {
  const result = new Map<
    string,
    Array<{
      price: number;
      timestamp: number;
      success: boolean;
      confidence?: number;
      confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
    }>
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

export function useFeedBehavior(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): FeedBehaviorHookResult {
  const [priceHistories, setPriceHistories] = useState<
    Map<
      string,
      Array<{
        price: number;
        timestamp: number;
        success: boolean;
        confidence?: number;
        confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
      }>
    >
  >(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractFeedHistories(priceHistoryMapRef.current));
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
    } catch {
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
