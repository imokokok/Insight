import { useMemo, useState, useEffect } from 'react';

import {
  calculateDivergenceSignals,
  type DivergenceSignalResult,
  type DivergenceTimeSeries,
  type OracleLeadership,
  type DivergencePair,
} from '@/lib/analytics/divergenceSignals';
import { createLogger } from '@/lib/utils/logger';
import { type PriceData } from '@/types/oracle';

import { extractHistories, type HistoryEntry } from '../utils/historyExtraction';

import { type PriceHistoryMap } from './useOracleMemory';

const logger = createLogger('useDivergenceSignals');

export interface DivergenceSignalsResult {
  divergenceResult: DivergenceSignalResult | null;
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
  isCalculating: boolean;
}

export function useDivergenceSignals(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): DivergenceSignalsResult {
  const [priceHistories, setPriceHistories] = useState<Map<string, HistoryEntry[]>>(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  const result = useMemo(() => {
    if (priceData.length < 2) {
      return {
        divergenceResult: null,
        timeSeries: [],
        leadership: [],
        divergenceMatrix: [],
        acceleratingCount: 0,
        directionalBiasCount: 0,
        leadingOracle: null,
        maxAcceleration: 0,
        isCalculating: false,
      };
    }

    try {
      const historyMap = new Map(priceHistories);

      for (const p of priceData) {
        if (!historyMap.has(p.provider) && p.price > 0) {
          historyMap.set(p.provider, [{ price: p.price, timestamp: p.timestamp, success: true }]);
        } else if (historyMap.has(p.provider) && p.price > 0) {
          const entries = historyMap.get(p.provider)!;
          const lastEntry = entries[entries.length - 1];
          if (lastEntry && p.timestamp > lastEntry.timestamp) {
            entries.push({ price: p.price, timestamp: p.timestamp, success: true });
          }
        }
      }

      const divergenceResult = calculateDivergenceSignals(priceData, historyMap);

      return {
        divergenceResult,
        timeSeries: divergenceResult.timeSeries,
        leadership: divergenceResult.leadership,
        divergenceMatrix: divergenceResult.divergenceMatrix,
        acceleratingCount: divergenceResult.acceleratingCount,
        directionalBiasCount: divergenceResult.directionalBiasCount,
        leadingOracle: divergenceResult.leadingOracle,
        maxAcceleration: divergenceResult.maxAcceleration,
        isCalculating: false,
      };
    } catch (error) {
      logger.error(
        'Error calculating divergence signals',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        divergenceResult: null,
        timeSeries: [],
        leadership: [],
        divergenceMatrix: [],
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
