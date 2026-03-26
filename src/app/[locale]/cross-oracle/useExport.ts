import { useCallback } from 'react';

import { type PriceData } from '@/types/oracle';

import { exportToCSV, exportToJSON, oracleNames } from './constants';

interface UseExportParams {
  priceData: PriceData[];
  avgPrice: number;
  validPrices: number[];
}

interface UseExportReturn {
  handleExportCSV: () => void;
  handleExportJSON: () => void;
}

export function useExport({ priceData, avgPrice, validPrices }: UseExportParams): UseExportReturn {
  const handleExportCSV = useCallback(() => {
    exportToCSV(priceData, oracleNames, avgPrice, validPrices);
  }, [priceData, avgPrice, validPrices]);

  const handleExportJSON = useCallback(() => {
    exportToJSON(priceData, oracleNames, avgPrice, validPrices);
  }, [priceData, avgPrice, validPrices]);

  return {
    handleExportCSV,
    handleExportJSON,
  };
}
