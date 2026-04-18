/**
 * @fileoverview 导出功能 Hook
 * @description 提供 CSV、JSON 导出和快照保存功能
 */

import { useCallback } from 'react';

import { downloadBlob } from '@/lib/utils/download';
import {
  type PriceData,
  type OracleProvider,
  type SnapshotStats,
  type OracleSnapshot,
} from '@/types/oracle';
import { saveSnapshot as saveSnapshotToStorage } from '@/types/oracle/snapshotFunctions';

import { exportToCSV, exportToJSON, oracleNames } from '../constants';

interface UseExportParams {
  priceData: PriceData[];
  avgPrice: number;
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  stats: SnapshotStats | null;
}

interface UseExportReturn {
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  handleSaveSnapshot: () => OracleSnapshot | null;
}

export function useExport({
  priceData,
  avgPrice,
  selectedSymbol,
  selectedOracles,
  stats,
}: UseExportParams): UseExportReturn {
  const handleExportCSV = useCallback(() => {
    const exportData = {
      symbol: selectedSymbol,
      timestamp: new Date().toISOString(),
      oracles: priceData.map((data) => {
        const deviation = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;
        return {
          name: oracleNames[data.provider] || String(data.provider),
          price: data.price,
          deviation,
          timestamp: data.timestamp,
        };
      }),
    };
    const csvContent = exportToCSV(exportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `cross-oracle-${selectedSymbol}-${Date.now()}.csv`);
  }, [priceData, avgPrice, selectedSymbol]);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      symbol: selectedSymbol,
      timestamp: new Date().toISOString(),
      oracles: priceData.map((data) => {
        const deviation = avgPrice > 0 ? ((data.price - avgPrice) / avgPrice) * 100 : 0;
        return {
          name: oracleNames[data.provider] || String(data.provider),
          price: data.price,
          deviation,
          timestamp: data.timestamp,
        };
      }),
    };
    const jsonContent = exportToJSON(exportData);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `cross-oracle-${selectedSymbol}-${Date.now()}.json`);
  }, [priceData, avgPrice, selectedSymbol]);

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
