'use client';

import { UnifiedExport, type ExportField } from '@/components/export';
import type { OracleProvider, PriceData } from '@/types/oracle';

interface CrossOracleExportSectionProps {
  loading: boolean;
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  avgPrice: number;
  medianPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

export default function CrossOracleExportSection({
  loading,
  priceData,
  selectedOracles,
  selectedSymbol,
  avgPrice,
  medianPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
}: CrossOracleExportSectionProps) {
  const exportFields: ExportField[] = [
    { key: 'provider', label: 'Oracle', dataType: 'string', selected: true },
    {
      key: 'price',
      label: 'Price',
      dataType: 'number',
      format: '0.0000',
      selected: true,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      dataType: 'date',
      selected: true,
    },
    {
      key: 'change24hPercent',
      label: '24h Change (%)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'confidence',
      label: 'Confidence',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'source',
      label: 'Source',
      dataType: 'string',
      selected: false,
    },
  ];

  const stats = {
    symbol: selectedSymbol,
    oracles: selectedOracles.join(', '),
    avgPrice: avgPrice.toFixed(4),
    medianPrice: medianPrice.toFixed(4),
    maxPrice: maxPrice.toFixed(4),
    minPrice: minPrice.toFixed(4),
    priceRange: priceRange.toFixed(4),
    standardDeviation: standardDeviation.toFixed(4),
    standardDeviationPercent: standardDeviationPercent.toFixed(2) + '%',
    dataPoints: priceData.length,
  };

  return (
    <UnifiedExport
      data={priceData}
      dataSource="cross-oracle"
      fields={exportFields}
      stats={stats}
      disabled={loading || priceData.length === 0}
    />
  );
}
