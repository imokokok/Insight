import { useState, useEffect } from 'react';

import { type PriceData } from '@/types/oracle';

import { extractHistories, type HistoryEntry } from '../utils/historyExtraction';

import { type PriceHistoryMap } from './useOracleMemory';

export function usePriceHistories(
  priceData: PriceData[],
  priceHistoryMapRef?: React.MutableRefObject<PriceHistoryMap> | null
): Map<string, HistoryEntry[]> {
  const [priceHistories, setPriceHistories] = useState<Map<string, HistoryEntry[]>>(new Map());

  useEffect(() => {
    if (priceHistoryMapRef?.current && priceHistoryMapRef.current.size > 0) {
      setPriceHistories(extractHistories(priceHistoryMapRef.current));
    }
  }, [priceHistoryMapRef, priceData]);

  return priceHistories;
}
