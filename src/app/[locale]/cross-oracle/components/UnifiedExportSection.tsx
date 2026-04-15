'use client';

import { UnifiedExport, type ExportField } from '@/components/export';
import { useTranslations } from '@/i18n';
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
  const _t = useTranslations('crossOracle');

  // 定义导出字段
  const exportFields: ExportField[] = [
    {
      key: 'asset',
      label: _t('export.asset'),
      labelZh: _t('export.asset'),
      dataType: 'string',
      selected: true,
    },
    {
      key: 'oracle',
      label: _t('export.oracle'),
      labelZh: _t('export.oracle'),
      dataType: 'string',
      selected: true,
    },
    {
      key: 'price',
      label: _t('export.price'),
      labelZh: _t('export.price'),
      dataType: 'number',
      format: '0.0000',
      selected: true,
    },
    {
      key: 'timestamp',
      label: _t('export.timestamp'),
      labelZh: _t('export.timestamp'),
      dataType: 'date',
      selected: true,
    },
    {
      key: 'deviation',
      label: _t('export.deviation'),
      labelZh: _t('export.deviation'),
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'latency',
      label: _t('export.latency'),
      labelZh: _t('export.latency'),
      dataType: 'number',
      selected: false,
    },
    {
      key: 'confidence',
      label: _t('export.confidence'),
      labelZh: _t('export.confidence'),
      dataType: 'number',
      selected: false,
    },
    {
      key: 'updateFrequency',
      label: _t('export.updateFrequency'),
      labelZh: _t('export.updateFrequency'),
      dataType: 'number',
      selected: false,
    },
  ];

  // 统计数据
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
