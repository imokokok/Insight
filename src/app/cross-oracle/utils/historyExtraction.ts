import type { PriceData } from '@/types/oracle';

import type { PriceHistoryMap } from '../hooks/useOracleMemory';

export interface HistoryEntry {
  price: number;
  timestamp: number;
  success: boolean;
  confidence?: number;
  confidenceInterval?: { bid: number; ask: number; widthPercentage: number };
}

export function extractHistories(priceHistoryMap: PriceHistoryMap): Map<string, HistoryEntry[]> {
  const result = new Map<string, HistoryEntry[]>();
  for (const [provider, history] of priceHistoryMap) {
    const entries: HistoryEntry[] = history
      .filter((h: { success: boolean; price: number }) => h.success && h.price > 0)
      .map((h: { price: number; timestamp: number; success: boolean }) => ({
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

export function extractPriceHistories(priceHistoryMap: PriceHistoryMap): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const [provider, history] of priceHistoryMap) {
    const prices = history
      .filter((h: { success: boolean; price: number }) => h.success && h.price > 0)
      .map((h: { price: number }) => h.price);
    if (prices.length > 0) {
      result.set(provider, prices);
    }
  }
  return result;
}

export function enrichWithConfidence(
  historyMap: Map<string, HistoryEntry[]>,
  priceData: PriceData[]
): void {
  for (const p of priceData) {
    const entries = historyMap.get(p.provider);
    if (entries && entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      if (p.confidence !== undefined) {
        lastEntry.confidence = p.confidence;
      }
      if (p.confidenceInterval) {
        lastEntry.confidenceInterval = p.confidenceInterval;
      }
    }
  }
}
