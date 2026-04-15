'use client';

import { useCallback } from 'react';

import { useTranslations } from '@/i18n';
import { type OracleProvider, type Blockchain } from '@/lib/oracles';
import { downloadBlob } from '@/lib/utils/download';

import { type QueryResult, providerNames, chainNames } from '../constants';
import { formatPrice } from '../utils/queryResultsUtils';

export interface UsePriceQueryExportParams {
  queryResults: QueryResult[];
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  selectedChains: Blockchain[];
}

export interface UsePriceQueryExportReturn {
  generateFilename: (extension: string) => string;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
}

export function usePriceQueryExport(params: UsePriceQueryExportParams): UsePriceQueryExportReturn {
  const { queryResults, selectedSymbol, selectedOracles, selectedChains } = params;
  const t = useTranslations();

  const generateFilename = useCallback(
    (extension: string): string => {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      return `price-query-${selectedSymbol}-${timestamp}.${extension}`;
    },
    [selectedSymbol]
  );

  const handleExportCSV = useCallback(() => {
    const csvLines: string[] = [];
    csvLines.push(`=== ${t('priceQuery.export.header')} ===`);
    const headers = [
      t('priceQuery.export.oracle'),
      t('priceQuery.export.blockchain'),
      t('priceQuery.export.price'),
      t('priceQuery.export.timestamp'),
      t('priceQuery.export.source'),
    ];
    csvLines.push(headers.join(','));

    queryResults.forEach((result) => {
      const priceData = result.priceData;
      const row = [
        providerNames[result.provider],
        chainNames[result.chain],
        priceData ? formatPrice(priceData.price) : 'N/A',
        priceData ? new Date(priceData.timestamp).toLocaleString() : 'N/A',
        priceData?.source || '',
      ];
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, generateFilename('csv'));
  }, [queryResults, generateFilename, t]);

  const handleExportJSON = useCallback(() => {
    const exportData = {
      metadata: {
        symbol: selectedSymbol,
        selectedOracles: selectedOracles.map((o) => providerNames[o]),
        selectedChains: selectedChains.map((c) => chainNames[c]),
        exportTimestamp: new Date().toISOString(),
      },
      results: queryResults.map((result) => ({
        oracle: providerNames[result.provider],
        blockchain: chainNames[result.chain],
        price: result.priceData?.price ?? null,
        timestamp: result.priceData ? new Date(result.priceData.timestamp).toISOString() : null,
        source: result.priceData?.source ?? null,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadBlob(blob, generateFilename('json'));
  }, [queryResults, selectedSymbol, selectedOracles, selectedChains, generateFilename]);

  return {
    generateFilename,
    handleExportCSV,
    handleExportJSON,
  };
}
