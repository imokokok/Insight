/**
 * @fileoverview 导出功能 Hook
 * @description 提供 CSV、JSON 导出和快照保存功能
 */

import { useCallback } from 'react';
import { PriceData, OracleProvider, SnapshotStats, OracleSnapshot } from '@/types/oracle';
import { exportToCSV, exportToJSON, oracleNames } from '../constants';
import { saveSnapshot as saveSnapshotToStorage } from '@/types/oracle/snapshotFunctions';

export interface UseExportParams {
  priceData: PriceData[];
  avgPrice: number;
  validPrices: number[];
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  stats: SnapshotStats | null;
}

export interface UseExportReturn {
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  handleSaveSnapshot: () => OracleSnapshot | null;
}

export function useExport({
  priceData,
  avgPrice,
  validPrices,
  selectedSymbol,
  selectedOracles,
  stats,
}: UseExportParams): UseExportReturn {
  const handleExportCSV = useCallback(() => {
    exportToCSV(priceData, oracleNames, avgPrice, validPrices);
  }, [priceData, avgPrice, validPrices]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(priceData, oracleNames, avgPrice, validPrices);
  }, [priceData, avgPrice, validPrices]);

  const handleSaveSnapshot = useCallback((): OracleSnapshot | null => {
    if (!stats || priceData.length === 0) {
      return null;
    }

    const snapshotData = {
      timestamp: Date.now(),
      symbol: selectedSymbol,
      selectedOracles: [...selectedOracles],
      priceData: [...priceData],
      stats: { ...stats },
    };

    return saveSnapshotToStorage(snapshotData);
  }, [priceData, selectedSymbol, selectedOracles, stats]);

  return {
    handleExportCSV,
    handleExportJSON,
    handleSaveSnapshot,
  };
}
