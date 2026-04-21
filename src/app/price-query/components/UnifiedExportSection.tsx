'use client';

import { useMemo } from 'react';

import { UnifiedExport, type ExportField } from '@/components/export';

import { type QueryResult } from '../constants';

interface UnifiedExportSectionProps {
  loading: boolean;
  queryResults: QueryResult[];
  selectedSymbol: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

export default function UnifiedExportSection({
  loading,
  queryResults,
  selectedSymbol,
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
}: UnifiedExportSectionProps) {
  const exportFields: ExportField[] = useMemo(
    () => [
      { key: 'provider', label: 'Oracle', dataType: 'string', selected: true },
      { key: 'chain', label: 'Blockchain', dataType: 'string', selected: true },
      {
        key: 'priceData.price',
        label: 'Price',
        dataType: 'number',
        format: '0.0000',
        selected: true,
      },
      {
        key: 'priceData.timestamp',
        label: 'Timestamp',
        dataType: 'date',
        selected: true,
      },
      {
        key: 'priceData.change24hPercent',
        label: '24h Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'priceData.confidence',
        label: 'Confidence',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'priceData.source',
        label: 'Source',
        dataType: 'string',
        selected: false,
      },
    ],
    []
  );

  const stats = useMemo(
    () => ({
      symbol: selectedSymbol,
      avgPrice: avgPrice.toFixed(4),
      maxPrice: maxPrice.toFixed(4),
      minPrice: minPrice.toFixed(4),
      priceRange: priceRange.toFixed(4),
      standardDeviation: standardDeviation.toFixed(4),
      standardDeviationPercent: standardDeviationPercent.toFixed(2) + '%',
      dataPoints: queryResults.length,
    }),
    [
      selectedSymbol,
      avgPrice,
      maxPrice,
      minPrice,
      priceRange,
      standardDeviation,
      standardDeviationPercent,
      queryResults.length,
    ]
  );

  return (
    <UnifiedExport
      data={queryResults}
      dataSource="price-query"
      fields={exportFields}
      stats={stats}
      disabled={loading || queryResults.length === 0}
    />
  );
}
