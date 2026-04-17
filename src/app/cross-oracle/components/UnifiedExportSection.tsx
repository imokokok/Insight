'use client';

import { UnifiedExport, type ExportField } from '@/components/export';
import { safeMax } from '@/lib/utils';

import { type CrossOracleData } from '../types/index';

interface UnifiedExportSectionProps {
  loading: boolean;
  crossOracleData: CrossOracleData[];
  selectedAssets: string[];
  selectedOracles: string[];
}

export default function UnifiedExportSection({
  loading,
  crossOracleData,
  selectedAssets,
  selectedOracles,
}: UnifiedExportSectionProps) {
  const exportFields: ExportField[] = [
    {
      key: 'asset',
      label: 'Asset',
      labelZh: 'Asset',
      dataType: 'string',
      selected: true,
    },
    {
      key: 'oracle',
      label: 'Oracle',
      labelZh: 'Oracle',
      dataType: 'string',
      selected: true,
    },
    {
      key: 'price',
      label: 'Price',
      labelZh: 'Price',
      dataType: 'number',
      format: '0.0000',
      selected: true,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      labelZh: 'Timestamp',
      dataType: 'date',
      selected: true,
    },
    {
      key: 'deviation',
      label: 'Deviation',
      labelZh: 'Deviation',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'latency',
      label: 'Latency',
      labelZh: 'Latency',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'confidence',
      label: 'Confidence',
      labelZh: 'Confidence',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'updateFrequency',
      label: 'Update Frequency',
      labelZh: 'Update Frequency',
      dataType: 'number',
      selected: false,
    },
  ];

  const stats = {
    totalComparisons: crossOracleData.length,
    selectedAssets: selectedAssets.join(', '),
    selectedOracles: selectedOracles.join(', '),
    avgDeviation:
      crossOracleData.length > 0
        ? (
            crossOracleData.reduce((sum, d) => sum + Math.abs(d.deviation || 0), 0) /
            crossOracleData.length
          ).toFixed(4)
        : '0',
    maxDeviation:
      crossOracleData.length > 0
        ? safeMax(crossOracleData.map((d) => Math.abs(d.deviation || 0))).toFixed(4)
        : '0',
  };

  return (
    <UnifiedExport
      data={crossOracleData}
      dataSource="cross-oracle"
      fields={exportFields}
      chartElement={undefined}
      stats={stats}
      disabled={loading || crossOracleData.length === 0}
    />
  );
}
