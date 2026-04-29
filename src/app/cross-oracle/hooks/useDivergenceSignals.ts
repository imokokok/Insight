import { useMemo, useState, useEffect } from 'react';

import {
  calculateDivergenceSignals,
  type DivergenceSignalResult,
  type DivergenceTimeSeries,
  type OracleLeadership,
  type DivergencePair,
} from '@/lib/analytics/divergenceSignals';
import { type PriceData } from '@/types/oracle';

import { type PriceHistoryMap } from './useOracleMemory';

export interface DivergenceSignalsResult {
  divergenceResult: DivergenceSignalResult | null;
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  alertCount: number;
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
  isCalculating: boolean;
}

function extractDivergenceHistories(
  priceHistoryMap: PriceHistoryMap
): Map<string, Array<{ price: number; timestamp: number; success: boolean }>> {
  const result = new Map<string, Array<{ price: number; timestamp: number; success: boolean }>>();
  for (const [provider, history] of priceHistoryMap) {
    const entries = history
      .filter((h) => h.success && h.price > 0)
      .map((h) => ({ price: h.price, timestamp: h.timestamp, success: h.success }));
    if (entries.length > 0) {
      result.set(provider, entries);
    }
  }
  return result;
}

export function useDivergenceSignals(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): DivergenceSignalsResult {
  const [priceHistories, setPriceHistories] = useState<
    Map<string, Array<{ price: number; timestamp: number; success: boolean }>>
  >(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractDivergenceHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  const result = useMemo(() => {
    if (priceData.length < 2) {
      return {
        divergenceResult: null,
        timeSeries: [],
        leadership: [],
        divergenceMatrix: [],
        alertCount: 0,
        acceleratingCount: 0,
        directionalBiasCount: 0,
        leadingOracle: null,
        maxAcceleration: 0,
        isCalculating: false,
      };
    }

    try {
      const historyMap = new Map(priceHistories);

      if (historyMap.size < 2) {
        for (const p of priceData) {
          if (!historyMap.has(p.provider) && p.price > 0) {
            historyMap.set(p.provider, [{ price: p.price, timestamp: p.timestamp, success: true }]);
          }
        }
      }

      const divergenceResult = calculateDivergenceSignals(priceData, historyMap);

      return {
        divergenceResult,
        timeSeries: divergenceResult.timeSeries,
        leadership: divergenceResult.leadership,
        divergenceMatrix: divergenceResult.divergenceMatrix,
        alertCount: divergenceResult.alertCount,
        acceleratingCount: divergenceResult.acceleratingCount,
        directionalBiasCount: divergenceResult.directionalBiasCount,
        leadingOracle: divergenceResult.leadingOracle,
        maxAcceleration: divergenceResult.maxAcceleration,
        isCalculating: false,
      };
    } catch {
      return {
        divergenceResult: null,
        timeSeries: [],
        leadership: [],
        divergenceMatrix: [],
        alertCount: 0,
        acceleratingCount: 0,
        directionalBiasCount: 0,
        leadingOracle: null,
        maxAcceleration: 0,
        isCalculating: false,
      };
    }
  }, [priceData, priceHistories]);

  return result;
}
