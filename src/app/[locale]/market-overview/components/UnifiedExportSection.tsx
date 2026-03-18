'use client';

/**
 * 市场概览页面统一导出组件
 *
 * 使用 UnifiedExport 组件替换原有的导出功能
 */

import { useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { UnifiedExport, ExportField } from '@/components/export';
import { OracleMarketData, AssetData } from '../types';

interface UnifiedExportSectionProps {
  loading: boolean;
  oracleData: OracleMarketData[];
  assets: AssetData[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  activeChart: string;
  getChartTitle: () => string;
}

export default function UnifiedExportSection({
  loading,
  oracleData,
  assets,
  chartContainerRef,
  activeChart,
  getChartTitle,
}: UnifiedExportSectionProps) {
  const t = useTranslations('marketOverview');
  const locale = useLocale();
  const isZh = locale === 'zh-CN';

  // 定义导出字段
  const oracleFields: ExportField[] = [
    { key: 'name', label: 'Name', labelZh: '名称', dataType: 'string', selected: true },
    {
      key: 'share',
      label: 'Market Share (%)',
      labelZh: '市场份额 (%)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    { key: 'tvs', label: 'TVS', labelZh: 'TVS', dataType: 'string', selected: true },
    {
      key: 'tvsValue',
      label: 'TVS Value (B)',
      labelZh: 'TVS 值 (B)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    { key: 'chains', label: 'Chains', labelZh: '链数', dataType: 'number', selected: true },
    { key: 'protocols', label: 'Protocols', labelZh: '协议数', dataType: 'number', selected: true },
    {
      key: 'avgLatency',
      label: 'Avg Latency (ms)',
      labelZh: '平均延迟 (ms)',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'accuracy',
      label: 'Accuracy (%)',
      labelZh: '准确率 (%)',
      dataType: 'number',
      format: '0.00',
      selected: false,
    },
    {
      key: 'updateFrequency',
      label: 'Update Frequency (s)',
      labelZh: '更新频率 (s)',
      dataType: 'number',
      selected: false,
    },
    {
      key: 'change24h',
      label: '24h Change (%)',
      labelZh: '24小时变化 (%)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'change7d',
      label: '7d Change (%)',
      labelZh: '7天变化 (%)',
      dataType: 'number',
      format: '0.00',
      selected: false,
    },
    {
      key: 'change30d',
      label: '30d Change (%)',
      labelZh: '30天变化 (%)',
      dataType: 'number',
      format: '0.00',
      selected: false,
    },
  ];

  const assetFields: ExportField[] = [
    { key: 'symbol', label: 'Symbol', labelZh: '代码', dataType: 'string', selected: true },
    {
      key: 'price',
      label: 'Price (USD)',
      labelZh: '价格 (USD)',
      dataType: 'number',
      format: '0.0000',
      selected: true,
    },
    {
      key: 'change24h',
      label: '24h Change (%)',
      labelZh: '24小时变化 (%)',
      dataType: 'number',
      format: '0.00',
      selected: true,
    },
    {
      key: 'change7d',
      label: '7d Change (%)',
      labelZh: '7天变化 (%)',
      dataType: 'number',
      format: '0.00',
      selected: false,
    },
    {
      key: 'volume24h',
      label: '24h Volume',
      labelZh: '24小时成交量',
      dataType: 'number',
      selected: true,
    },
    { key: 'marketCap', label: 'Market Cap', labelZh: '市值', dataType: 'number', selected: true },
    {
      key: 'primaryOracle',
      label: 'Primary Oracle',
      labelZh: '主要预言机',
      dataType: 'string',
      selected: true,
    },
    {
      key: 'oracleCount',
      label: 'Oracle Count',
      labelZh: '预言机数量',
      dataType: 'number',
      selected: false,
    },
  ];

  // 根据当前图表类型选择数据和字段
  const getExportData = () => {
    switch (activeChart) {
      case 'asset':
        return { data: assets, fields: assetFields };
      case 'protocol':
        return { data: [], fields: [] }; // 协议数据需要另外处理
      case 'chain':
        return { data: [], fields: [] }; // 链数据需要另外处理
      default:
        return { data: oracleData, fields: oracleFields };
    }
  };

  const { data, fields } = getExportData();

  // 统计数据
  const stats = {
    totalOracles: oracleData.length,
    totalAssets: assets.length,
    avgMarketShare:
      oracleData.length > 0
        ? (oracleData.reduce((sum, o) => sum + o.share, 0) / oracleData.length).toFixed(2)
        : '0',
    topOracle: oracleData.length > 0 ? oracleData[0].name : '-',
  };

  return (
    <UnifiedExport
      data={data}
      dataSource="market-overview"
      fields={fields}
      chartElement={chartContainerRef.current}
      stats={stats}
      disabled={loading || data.length === 0}
    />
  );
}
