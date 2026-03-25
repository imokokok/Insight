/**
 * @fileoverview useSnapshotActions Hook
 * @description 管理快照相关操作
 */

import { useState, useCallback, useRef, RefObject } from 'react';
import { OracleSnapshot, saveSnapshot, PriceData, OracleProvider } from '@/types/oracle';
import type { SnapshotStats } from '@/types/oracle';

export function useSnapshotActions() {
  const [selectedSnapshot, setSelectedSnapshot] = useState<OracleSnapshot | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleSaveSnapshot = useCallback((
    priceData: PriceData[],
    selectedSymbol: string,
    selectedOracles: OracleProvider[],
    currentStats: SnapshotStats
  ) => {
    if (priceData.length === 0) return;
    saveSnapshot({
      timestamp: Date.now(),
      symbol: selectedSymbol,
      selectedOracles,
      priceData,
      stats: currentStats,
    });
  }, []);

  const handleSelectSnapshot = useCallback((snapshot: OracleSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowComparison(true);
  }, []);

  return {
    selectedSnapshot,
    setSelectedSnapshot,
    showComparison,
    setShowComparison,
    handleSaveSnapshot,
    handleSelectSnapshot,
  };
}
