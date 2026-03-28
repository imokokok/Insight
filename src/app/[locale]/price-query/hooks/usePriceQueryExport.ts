'use client';

import { useState, useCallback } from 'react';

import { OracleProvider, Blockchain } from '@/lib/oracles';
import { useTranslations } from '@/i18n';

import { type QueryResult, providerNames, chainNames } from '../constants';

export interface UsePriceQueryExportParams {
  queryResults: QueryResult[];
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  selectedChains: Blockchain[];
}

export interface UsePriceQueryExportReturn {
  showExportConfig: boolean;
  setShowExportConfig: (show: boolean) => void;
  generateFilename: (extension: string) => string;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
}

export function usePriceQueryExport(params: UsePriceQueryExportParams): UsePriceQueryExportReturn {
  const { queryResults, selectedSymbol, selectedOracles, selectedChains } = params;
  const t = useTranslations();

  const [showExportConfig, setShowExportConfig] = useState(false);

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
      const row = [
        providerNames[result.provider],
        chainNames[result.chain],
        result.priceData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }),
        new Date(result.priceData.timestamp).toLocaleString(),
        result.priceData.source || '',
      ];
      csvLines.push(row.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename('csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        price: result.priceData.price,
        timestamp: new Date(result.priceData.timestamp).toISOString(),
        source: result.priceData.source,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename('json'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [queryResults, selectedSymbol, selectedOracles, selectedChains, generateFilename]);

  return {
    showExportConfig,
    setShowExportConfig,
    generateFilename,
    handleExportCSV,
    handleExportJSON,
  };
}
