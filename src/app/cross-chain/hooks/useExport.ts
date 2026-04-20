import { useCallback, useRef } from 'react';

import { downloadBlob } from '@/lib/utils/download';
import { escapeCSVField } from '@/lib/utils/export';
import { formatNumberWithDecimals } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain } from '@/types/oracle';

import { chainNames, getConsistencyRating } from '../utils';

const logger = createLogger('useExport');

export interface PriceDifferenceItem {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
}

interface UseExportParams {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedBaseChain: Blockchain | null;
  priceDifferences: PriceDifferenceItem[];
  filteredChains: Blockchain[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
}

interface UseExportReturn {
  exportToCSV: () => boolean;
  exportToJSON: () => boolean;
}

export function useExport(params: UseExportParams): UseExportReturn {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const exportToCSV = useCallback((): boolean => {
    const currentParams = paramsRef.current;
    if (currentParams.priceDifferences.length === 0) {
      return false;
    }

    try {
      const csvLines: string[] = [];

      csvLines.push('# Current Prices');
      csvLines.push(
        ['Blockchain', 'Price', 'Difference', 'PercentDifference'].map(escapeCSVField).join(',')
      );

      currentParams.priceDifferences.forEach((item) => {
        const row = [
          escapeCSVField(chainNames[item.chain]),
          escapeCSVField(formatNumberWithDecimals(item.price, 2, 4)),
          escapeCSVField(item.diff.toFixed(4)),
          escapeCSVField(item.diffPercent.toFixed(4) + '%'),
        ];
        csvLines.push(row.join(','));
      });

      const csvContent = csvLines.join('\n');
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(
        csvBlob,
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
    if (currentParams.priceDifferences.length === 0) {
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
        [OracleProvider.SUPRA]: 'Supra',
        [OracleProvider.TWAP]: 'TWAP',
        [OracleProvider.REFLECTOR]: 'Reflector',
        [OracleProvider.FLARE]: 'Flare',
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
        summary: {
          averagePrice: currentParams.avgPrice,
          highestPrice: currentParams.maxPrice,
          lowestPrice: currentParams.minPrice,
          priceRange: currentParams.priceRange,
          standardDeviationPercent: currentParams.standardDeviationPercent,
          consistencyRating: getConsistencyRating(currentParams.standardDeviationPercent),
        },
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
      downloadBlob(
        jsonBlob,
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
