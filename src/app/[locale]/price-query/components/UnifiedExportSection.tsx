'use client';

/**
 * 价格查询页面统一导出组件
 *
 * 使用 UnifiedExport 组件替换原有的导出功能
 */

import { UnifiedExport, type ExportField } from '@/components/export';
import { useLocale } from '@/i18n';

import { type QueryResult } from '../constants';

interface UnifiedExportSectionProps {
  loading: boolean;
  queryResults: QueryResult[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
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
  chartContainerRef,
  selectedSymbol,
  avgPrice,
  maxPrice,
  minPrice,
  priceRange,
  standardDeviation,
  standardDeviationPercent,
}: UnifiedExportSectionProps) {
  const locale = useLocale();

  // 定义导出字段
  const exportFields: ExportField[] = [
    { key: 'provider', label: 'Oracle', labelZh: '预言机', dataType: 'string', selected: true },
    { key: 'chain', label: 'Blockchain', labelZh: '区块链', dataType: 'string', selected: true },
    {
      key: 'priceData.price',
      label: 'Price',
      labelZh: '价格',
      dataType: 'number',
      format: '0.0000',
      selected: true,
    },
    {
      key: 'priceData.timestamp',
      label: 'Timestamp',
      labelZh: '时间戳',
      dataType: 'date',
      selected: true,
    },
    {
      key: 'priceData.change24hPercent',
      label: '24h Change (%)',
      labelZh: '24小时变化 (%)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'priceData.confidence',
      label: 'Confidence',
      labelZh: '置信度',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'priceData.source',
      label: 'Source',
      labelZh: '来源',
      dataType: 'string',
      selected: false,
    },
  ];

  // 统计数据
  const stats = {
    symbol: selectedSymbol,
    avgPrice: avgPrice.toFixed(4),
    maxPrice: maxPrice.toFixed(4),
    minPrice: minPrice.toFixed(4),
    priceRange: priceRange.toFixed(4),
    standardDeviation: standardDeviation.toFixed(4),
    standardDeviationPercent: standardDeviationPercent.toFixed(2) + '%',
    dataPoints: queryResults.length,
  };

  return (
    <UnifiedExport
      data={queryResults}
      dataSource="price-query"
      fields={exportFields}
      chartElement={chartContainerRef?.current ?? null}
      stats={stats}
      disabled={loading || queryResults.length === 0}
    />
  );
}
