'use client';

/**
 * 多预言机对比页面统一导出组件
 *
 * 使用 UnifiedExport 组件替换原有的导出功能
 */

import { useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { UnifiedExport, ExportField } from '@/components/export';
import { CrossOracleData } from '../types';

interface UnifiedExportSectionProps {
  loading: boolean;
  crossOracleData: CrossOracleData[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedAssets: string[];
  selectedOracles: string[];
}

export default function UnifiedExportSection({
  loading,
  crossOracleData,
  chartContainerRef,
  selectedAssets,
  selectedOracles,
}: UnifiedExportSectionProps) {
  const t = useTranslations('crossOracle');
  const locale = useLocale();
  const isZh = locale === 'zh-CN';

  // 定义导出字段
  const exportFields: ExportField[] = [
    { key: 'asset', label: 'Asset', labelZh: '资产', dataType: 'string', selected: true },
    { key: 'oracle', label: 'Oracle', labelZh: '预言机', dataType: 'string', selected: true },
    {
      key: 'price',
      label: 'Price',
      labelZh: '价格',
      dataType: 'number',
      format: '0.0000',
      selected: true,
    },
    { key: 'timestamp', label: 'Timestamp', labelZh: '时间戳', dataType: 'date', selected: true },
    {
      key: 'deviation',
      label: 'Deviation (%)',
      labelZh: '偏差 (%)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'latency',
      label: 'Latency (ms)',
      labelZh: '延迟 (ms)',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'confidence',
      label: 'Confidence',
      labelZh: '置信度',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'updateFrequency',
      label: 'Update Frequency (s)',
      labelZh: '更新频率 (s)',
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
        ? Math.max(...crossOracleData.map((d) => Math.abs(d.deviation || 0))).toFixed(4)
        : '0',
  };

  return (
    <UnifiedExport
      data={crossOracleData}
      dataSource="cross-oracle"
      fields={exportFields}
      chartElement={chartContainerRef.current}
      stats={stats}
      disabled={loading || crossOracleData.length === 0}
    />
  );
}
