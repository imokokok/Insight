import { useCallback, useEffect, useRef } from 'react';

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

function downloadBlob(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useExport(params: UseExportParams): UseExportReturn {
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  const exportToCSV = useCallback((): boolean => {
    const currentParams = paramsRef.current;
    if (
      currentParams.priceDifferences.length === 0 &&
      Object.keys(currentParams.historicalPrices).length === 0
    ) {
      return false;
    }

    try {
      const csvLines: string[] = [];

      csvLines.push('# Current Prices');
      csvLines.push(['Blockchain', 'Price', 'Difference', 'PercentDifference'].join(','));

      currentParams.priceDifferences.forEach((item) => {
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
      csvLines.push('# Historical Prices');

      const allTimestamps = new Set<number>();
      currentParams.filteredChains.forEach((chain) => {
        currentParams.historicalPrices[chain]?.forEach((price) =>
          allTimestamps.add(price.timestamp)
        );
      });
      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      const historicalHeaders = [
        'timestamp',
        ...currentParams.filteredChains.map((chain) => chainNames[chain]),
      ];
      csvLines.push(historicalHeaders.join(','));

      const timestampPriceMaps: Partial<Record<Blockchain, Map<number, number>>> = {};
      currentParams.filteredChains.forEach((chain) => {
        timestampPriceMaps[chain] = new Map(
          (currentParams.historicalPrices[chain] || []).map((p) => [p.timestamp, p.price])
        );
      });

      sortedTimestamps.forEach((timestamp) => {
        const row: string[] = [new Date(timestamp).toLocaleString()];
        currentParams.filteredChains.forEach((chain) => {
          const price = timestampPriceMaps[chain]?.get(timestamp);
          row.push(
            price !== undefined
              ? price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })
              : ''
          );
        });
        csvLines.push(row.join(','));
      });

      const csvContent = csvLines.join('\n');
      downloadBlob(
        csvContent,
        'text/csv;charset=utf-8;',
        `cross-chain-${currentParams.selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
      );

      return true;
    } catch (error) {
      logger.error('Failed to export CSV:', error as Error);
      return false;
    }
  }, []);

  const exportToJSON = useCallback((): boolean => {
    const currentParams = paramsRef.current;
    if (
      currentParams.priceDifferences.length === 0 &&
      Object.keys(currentParams.historicalPrices).length === 0
    ) {
      return false;
    }

    try {
      const providerNames: Record<OracleProvider, string> = {
        [OracleProvider.CHAINLINK]: 'Chainlink',
        [OracleProvider.PYTH]: 'Pyth Network',
        [OracleProvider.API3]: 'API3',
        [OracleProvider.REDSTONE]: 'RedStone',
        [OracleProvider.DIA]: 'DIA',
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
          symbol: currentParams.selectedSymbol,
          oracleProvider: providerNames[currentParams.selectedProvider],
          exportTimestamp: new Date().toISOString(),
          baseChain: currentParams.selectedBaseChain
            ? chainNames[currentParams.selectedBaseChain]
            : null,
        },
        currentPrices: currentParams.priceDifferences.map((item) => ({
          blockchain: chainNames[item.chain],
          price: item.price,
          difference: item.diff,
          percentDifference: item.diffPercent,
        })),
        historicalPrices: currentParams.filteredChains.map((chain) => ({
          blockchain: chainNames[chain],
          prices:
            currentParams.historicalPrices[chain]?.map((price) => ({
              price: price.price,
              timestamp: new Date(price.timestamp).toISOString(),
              source: price.source,
            })) || [],
        })),
        summary: {
          averagePrice: currentParams.avgPrice,
          highestPrice: currentParams.maxPrice,
          lowestPrice: currentParams.minPrice,
          priceRange: currentParams.priceRange,
          standardDeviationPercent: currentParams.standardDeviationPercent,
          consistencyRating: getConsistencyRating(currentParams.standardDeviationPercent),
          dataPoints: currentParams.totalDataPoints,
        },
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      downloadBlob(
        jsonContent,
        'application/json',
        `cross-chain-${currentParams.selectedSymbol}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      );

      return true;
    } catch (error) {
      logger.error('Failed to export JSON:', error as Error);
      return false;
    }
  }, []);

  return {
    exportToCSV,
    exportToJSON,
  };
}
