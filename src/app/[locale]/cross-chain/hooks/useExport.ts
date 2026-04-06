/**
 * @fileoverview 导出功能 Hook
 * 提供数据导出功能
 */

import { useCallback } from 'react';

import { useToastMethods } from '@/components/ui/Toast';
import { OracleProvider, type Blockchain, type PriceData } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';

import { chainNames } from '../utils';

const logger = createLogger('useExport');

export interface PriceDifferenceItem {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
}

export interface UseExportParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedBaseChain: Blockchain | null;
  priceDifferences: PriceDifferenceItem[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  filteredChains: Blockchain[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
  totalDataPoints: number;
}

export interface UseExportReturn {
  exportToCSV: () => boolean;
  exportToJSON: () => boolean;
}

export function useExport(params: UseExportParams): UseExportReturn {
  const toast = useToastMethods();

  const exportToCSV = useCallback((): boolean => {
    if (params.priceDifferences.length === 0 && Object.keys(params.historicalPrices).length === 0) {
      toast.warning('No Data', 'No data available to export');
      return false;
    }

    try {
      const csvLines: string[] = [];

      csvLines.push('=== Current Prices ===');
      csvLines.push(['Blockchain', 'Price', 'Difference', 'PercentDifference'].join(','));

      params.priceDifferences.forEach((item) => {
        const row = [
          chainNames[item.chain],
          item.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }),
          item.diff.toFixed(4),
          item.diffPercent.toFixed(4) + '%',
        ];
        csvLines.push(row.join(','));
      });

      csvLines.push('');
      csvLines.push('=== Historical Prices ===');

      const allTimestamps = new Set<number>();
      params.filteredChains.forEach((chain) => {
        params.historicalPrices[chain]?.forEach((price) => allTimestamps.add(price.timestamp));
      });
      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      const historicalHeaders = [
        'timestamp',
        ...params.filteredChains.map((chain) => chainNames[chain]),
      ];
      csvLines.push(historicalHeaders.join(','));

      sortedTimestamps.forEach((timestamp) => {
        const row: string[] = [new Date(timestamp).toLocaleString()];
        params.filteredChains.forEach((chain) => {
          const price = params.historicalPrices[chain]?.find((p) => p.timestamp === timestamp);
          row.push(
            price
              ? price.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })
              : ''
          );
        });
        csvLines.push(row.join(','));
      });

      const csvContent = csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `cross-chain-${params.selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export Successful', 'CSV file has been downloaded');
      return true;
    } catch (error) {
      logger.error('Failed to export CSV:', error as Error);
      toast.error('Export Failed', 'Failed to export CSV file. Please try again.');
      return false;
    }
  }, [params, toast]);

  const exportToJSON = useCallback((): boolean => {
    if (params.priceDifferences.length === 0 && Object.keys(params.historicalPrices).length === 0) {
      toast.warning('No Data', 'No data available to export');
      return false;
    }

    try {
      const providerNames: Record<OracleProvider, string> = {
        [OracleProvider.CHAINLINK]: 'Chainlink',
        [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
        [OracleProvider.UMA]: 'UMA',
        [OracleProvider.PYTH]: 'Pyth Network',
        [OracleProvider.API3]: 'API3',
        [OracleProvider.REDSTONE]: 'RedStone',
        [OracleProvider.DIA]: 'DIA',
        [OracleProvider.TELLOR]: 'Tellor',
        [OracleProvider.WINKLINK]: 'WINkLink',
      };

      const getConsistencyRating = (stdDevPercent: number): string => {
        if (stdDevPercent < 0.1) return 'excellent';
        if (stdDevPercent < 0.3) return 'good';
        if (stdDevPercent < 0.5) return 'fair';
        return 'poor';
      };

      const exportData = {
        metadata: {
          symbol: params.selectedSymbol,
          oracleProvider: providerNames[params.selectedProvider],
          exportTimestamp: new Date().toISOString(),
          baseChain: params.selectedBaseChain ? chainNames[params.selectedBaseChain] : null,
        },
        currentPrices: params.priceDifferences.map((item) => ({
          blockchain: chainNames[item.chain],
          price: item.price,
          difference: item.diff,
          percentDifference: item.diffPercent,
        })),
        historicalPrices: params.filteredChains.map((chain) => ({
          blockchain: chainNames[chain],
          prices:
            params.historicalPrices[chain]?.map((price) => ({
              price: price.price,
              timestamp: new Date(price.timestamp).toISOString(),
              source: price.source,
            })) || [],
        })),
        summary: {
          averagePrice: params.avgPrice,
          highestPrice: params.maxPrice,
          lowestPrice: params.minPrice,
          priceRange: params.priceRange,
          standardDeviationPercent: params.standardDeviationPercent,
          consistencyRating: getConsistencyRating(params.standardDeviationPercent),
          dataPoints: params.totalDataPoints,
        },
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `cross-chain-${params.selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export Successful', 'JSON file has been downloaded');
      return true;
    } catch (error) {
      logger.error('Failed to export JSON:', error as Error);
      toast.error('Export Failed', 'Failed to export JSON file. Please try again.');
      return false;
    }
  }, [params, toast]);

  return {
    exportToCSV,
    exportToJSON,
  };
}
