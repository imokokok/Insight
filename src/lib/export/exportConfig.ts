/**
 * Export Configuration Module
 *
 * 提供导出配置管理功能，包括字段选择、时间范围配置、格式选项等。
 */

import {
  OracleMarketData,
  AssetData,
  TVSTrendData,
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  RiskMetrics,
  AnomalyData,
} from '@/app/market-overview/types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ExportConfig');

/**
 * 导出格式类型
 */
export type ExportFormat = 'csv' | 'json' | 'excel';

/**
 * 时间范围类型
 */
export type ExportTimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'custom';

/**
 * 数据类型
 */
export type ExportDataType =
  | 'oracleMarket'
  | 'assets'
  | 'trendData'
  | 'chainBreakdown'
  | 'protocolDetails'
  | 'assetCategories'
  | 'comparisonData'
  | 'benchmarkData'
  | 'correlationData'
  | 'riskMetrics'
  | 'anomalies'
  | 'all';

/**
 * 字段定义
 */
export interface ExportField {
  key: string;
  label: string;
  labelZh: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  selected: boolean;
}

/**
 * 字段组
 */
export interface FieldGroup {
  key: ExportDataType;
  label: string;
  labelZh: string;
  fields: ExportField[];
}

/**
 * 导出配置
 */
export interface ExportConfig {
  id: string;
  name: string;
  nameZh: string;
  description?: string;
  descriptionZh?: string;
  format: ExportFormat;
  timeRange: ExportTimeRange;
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
  dataTypes: ExportDataType[];
  fieldGroups: FieldGroup[];
  includeMetadata: boolean;
  includeTimestamp: boolean;
  fileName?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 默认字段配置
 */
export const DEFAULT_FIELD_GROUPS: FieldGroup[] = [
  {
    key: 'oracleMarket',
    label: 'Oracle Market Data',
    labelZh: '预言机市场数据',
    fields: [
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
      {
        key: 'protocols',
        label: 'Protocols',
        labelZh: '协议数',
        dataType: 'number',
        selected: true,
      },
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
    ],
  },
  {
    key: 'assets',
    label: 'Asset Data',
    labelZh: '资产数据',
    fields: [
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
      {
        key: 'marketCap',
        label: 'Market Cap',
        labelZh: '市值',
        dataType: 'number',
        selected: true,
      },
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
    ],
  },
  {
    key: 'trendData',
    label: 'Trend Data',
    labelZh: '趋势数据',
    fields: [
      { key: 'timestamp', label: 'Timestamp', labelZh: '时间戳', dataType: 'date', selected: true },
      { key: 'date', label: 'Date', labelZh: '日期', dataType: 'string', selected: true },
      {
        key: 'chainlink',
        label: 'Chainlink (B)',
        labelZh: 'Chainlink (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'pyth',
        label: 'Pyth Network (B)',
        labelZh: 'Pyth Network (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'band',
        label: 'Band Protocol (B)',
        labelZh: 'Band Protocol (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'api3',
        label: 'API3 (B)',
        labelZh: 'API3 (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'uma',
        label: 'UMA (B)',
        labelZh: 'UMA (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'total',
        label: 'Total (B)',
        labelZh: '总计 (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
    ],
  },
  {
    key: 'chainBreakdown',
    label: 'Chain Breakdown',
    labelZh: '链分布',
    fields: [
      { key: 'chainId', label: 'Chain ID', labelZh: '链ID', dataType: 'string', selected: true },
      {
        key: 'chainName',
        label: 'Chain Name',
        labelZh: '链名称',
        dataType: 'string',
        selected: true,
      },
      { key: 'tvs', label: 'TVS', labelZh: 'TVS', dataType: 'number', selected: true },
      {
        key: 'tvsFormatted',
        label: 'TVS Formatted',
        labelZh: 'TVS 格式化',
        dataType: 'string',
        selected: false,
      },
      {
        key: 'share',
        label: 'Share (%)',
        labelZh: '份额 (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'protocols',
        label: 'Protocols',
        labelZh: '协议数',
        dataType: 'number',
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
        key: 'topOracle',
        label: 'Top Oracle',
        labelZh: '主要预言机',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'topOracleShare',
        label: 'Top Oracle Share (%)',
        labelZh: '主要预言机份额 (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
    ],
  },
  {
    key: 'protocolDetails',
    label: 'Protocol Details',
    labelZh: '协议详情',
    fields: [
      { key: 'id', label: 'ID', labelZh: 'ID', dataType: 'string', selected: true },
      { key: 'name', label: 'Name', labelZh: '名称', dataType: 'string', selected: true },
      { key: 'category', label: 'Category', labelZh: '类别', dataType: 'string', selected: true },
      { key: 'tvl', label: 'TVL', labelZh: 'TVL', dataType: 'number', selected: true },
      {
        key: 'tvlFormatted',
        label: 'TVL Formatted',
        labelZh: 'TVL 格式化',
        dataType: 'string',
        selected: false,
      },
      { key: 'chains', label: 'Chains', labelZh: '链', dataType: 'string', selected: true },
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
    ],
  },
  {
    key: 'riskMetrics',
    label: 'Risk Metrics',
    labelZh: '风险指标',
    fields: [
      {
        key: 'hhi.value',
        label: 'HHI Value',
        labelZh: 'HHI 值',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'hhi.level',
        label: 'HHI Level',
        labelZh: 'HHI 等级',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'hhi.concentrationRatio',
        label: 'Concentration Ratio (%)',
        labelZh: '集中度 (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'diversification.score',
        label: 'Diversification Score',
        labelZh: '多元化评分',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'diversification.level',
        label: 'Diversification Level',
        labelZh: '多元化等级',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'diversification.factors.chainDiversity',
        label: 'Chain Diversity',
        labelZh: '链多样性',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'diversification.factors.protocolDiversity',
        label: 'Protocol Diversity',
        labelZh: '协议多样性',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'diversification.factors.assetDiversity',
        label: 'Asset Diversity',
        labelZh: '资产多样性',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'volatility.index',
        label: 'Volatility Index',
        labelZh: '波动率指数',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'volatility.level',
        label: 'Volatility Level',
        labelZh: '波动率等级',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'volatility.annualizedVolatility',
        label: 'Annualized Volatility',
        labelZh: '年化波动率',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'correlationRisk.score',
        label: 'Correlation Risk Score',
        labelZh: '相关性风险评分',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'correlationRisk.level',
        label: 'Correlation Risk Level',
        labelZh: '相关性风险等级',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'correlationRisk.avgCorrelation',
        label: 'Avg Correlation',
        labelZh: '平均相关性',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'overallRisk.score',
        label: 'Overall Risk Score',
        labelZh: '综合风险评分',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'overallRisk.level',
        label: 'Overall Risk Level',
        labelZh: '综合风险等级',
        dataType: 'string',
        selected: true,
      },
    ],
  },
  {
    key: 'anomalies',
    label: 'Anomalies',
    labelZh: '异常数据',
    fields: [
      { key: 'id', label: 'ID', labelZh: 'ID', dataType: 'string', selected: true },
      { key: 'type', label: 'Type', labelZh: '类型', dataType: 'string', selected: true },
      { key: 'level', label: 'Level', labelZh: '等级', dataType: 'string', selected: true },
      { key: 'title', label: 'Title', labelZh: '标题', dataType: 'string', selected: true },
      {
        key: 'description',
        label: 'Description',
        labelZh: '描述',
        dataType: 'string',
        selected: false,
      },
      { key: 'timestamp', label: 'Timestamp', labelZh: '时间戳', dataType: 'date', selected: true },
      { key: 'asset', label: 'Asset', labelZh: '资产', dataType: 'string', selected: true },
      { key: 'oracle', label: 'Oracle', labelZh: '预言机', dataType: 'string', selected: true },
      { key: 'value', label: 'Value', labelZh: '值', dataType: 'number', selected: true },
      {
        key: 'expectedValue',
        label: 'Expected Value',
        labelZh: '预期值',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'deviation',
        label: 'Deviation (%)',
        labelZh: '偏差 (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'duration',
        label: 'Duration (min)',
        labelZh: '持续时间 (分钟)',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'acknowledged',
        label: 'Acknowledged',
        labelZh: '已确认',
        dataType: 'boolean',
        selected: false,
      },
    ],
  },
];

/**
 * 创建默认导出配置
 */
export function createDefaultExportConfig(): ExportConfig {
  const now = Date.now();
  return {
    id: `config-${now}`,
    name: 'Default Configuration',
    nameZh: '默认配置',
    description: 'Default export configuration with commonly used fields',
    descriptionZh: '默认导出配置，包含常用字段',
    format: 'csv',
    timeRange: '30D',
    dataTypes: ['oracleMarket', 'assets'],
    fieldGroups: JSON.parse(JSON.stringify(DEFAULT_FIELD_GROUPS)),
    includeMetadata: true,
    includeTimestamp: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 创建自定义导出配置
 */
export function createExportConfig(partial: Partial<ExportConfig>): ExportConfig {
  const defaults = createDefaultExportConfig();
  const now = Date.now();
  return {
    ...defaults,
    ...partial,
    id: partial.id || `config-${now}`,
    fieldGroups: partial.fieldGroups || defaults.fieldGroups,
    createdAt: partial.createdAt || now,
    updatedAt: now,
  };
}

/**
 * 获取字段标签
 */
export function getFieldLabel(field: ExportField, locale: string = 'en'): string {
  return locale === 'zh-CN' ? field.labelZh : field.label;
}

/**
 * 获取字段组标签
 */
export function getFieldGroupLabel(group: FieldGroup, locale: string = 'en'): string {
  return locale === 'zh-CN' ? group.labelZh : group.label;
}

/**
 * 切换字段选择状态
 */
export function toggleFieldSelection(
  fieldGroups: FieldGroup[],
  groupKey: ExportDataType,
  fieldKey: string
): FieldGroup[] {
  return fieldGroups.map((group) => {
    if (group.key !== groupKey) return group;
    return {
      ...group,
      fields: group.fields.map((field) =>
        field.key === fieldKey ? { ...field, selected: !field.selected } : field
      ),
    };
  });
}

/**
 * 设置字段组全选/全不选
 */
export function setFieldGroupSelection(
  fieldGroups: FieldGroup[],
  groupKey: ExportDataType,
  selected: boolean
): FieldGroup[] {
  return fieldGroups.map((group) => {
    if (group.key !== groupKey) return group;
    return {
      ...group,
      fields: group.fields.map((field) => ({ ...field, selected })),
    };
  });
}

/**
 * 获取已选字段
 */
export function getSelectedFields(
  fieldGroups: FieldGroup[],
  groupKey: ExportDataType
): ExportField[] {
  const group = fieldGroups.find((g) => g.key === groupKey);
  return group?.fields.filter((f) => f.selected) || [];
}

/**
 * 验证导出配置
 */
export function validateExportConfig(config: ExportConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Configuration name is required');
  }

  if (!config.format || !['csv', 'json', 'excel'].includes(config.format)) {
    errors.push('Invalid export format');
  }

  if (!config.timeRange) {
    errors.push('Time range is required');
  }

  if (
    config.timeRange === 'custom' &&
    (!config.customDateRange?.startDate || !config.customDateRange?.endDate)
  ) {
    errors.push('Custom date range requires both start and end dates');
  }

  if (!config.dataTypes || config.dataTypes.length === 0) {
    errors.push('At least one data type must be selected');
  }

  const hasSelectedFields = config.fieldGroups.some((group) =>
    group.fields.some((field) => field.selected)
  );
  if (!hasSelectedFields) {
    errors.push('At least one field must be selected');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 生成导出文件名
 */
export function generateExportFileName(config: ExportConfig): string {
  if (config.fileName) {
    return config.fileName;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const dataTypes = config.dataTypes.length > 2 ? 'multi' : config.dataTypes.join('-');
  const extension = config.format === 'excel' ? 'xlsx' : config.format;
  return `oracle-export-${dataTypes}-${timestamp}.${extension}`;
}

/**
 * 从 localStorage 加载导出配置
 */
export function loadExportConfigsFromStorage(): ExportConfig[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('oracle_export_configs');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load export configs from storage', error instanceof Error ? error : new Error(String(error)));
  }
  return [];
}

/**
 * 保存导出配置到 localStorage
 */
export function saveExportConfigsToStorage(configs: ExportConfig[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('oracle_export_configs', JSON.stringify(configs));
  } catch (error) {
    logger.error('Failed to save export configs to storage', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 获取时间范围的小时数
 */
export function getTimeRangeHours(timeRange: ExportTimeRange): number {
  const hoursMap: Record<ExportTimeRange, number> = {
    '1H': 1,
    '24H': 24,
    '7D': 168,
    '30D': 720,
    '90D': 2160,
    '1Y': 8760,
    ALL: 0,
    custom: 720,
  };
  return hoursMap[timeRange] || 720;
}

/**
 * 获取时间范围标签
 */
export function getTimeRangeLabel(timeRange: ExportTimeRange, locale: string = 'en'): string {
  const labels: Record<ExportTimeRange, { en: string; zh: string }> = {
    '1H': { en: '1 Hour', zh: '1小时' },
    '24H': { en: '24 Hours', zh: '24小时' },
    '7D': { en: '7 Days', zh: '7天' },
    '30D': { en: '30 Days', zh: '30天' },
    '90D': { en: '90 Days', zh: '90天' },
    '1Y': { en: '1 Year', zh: '1年' },
    ALL: { en: 'All Time', zh: '全部' },
    custom: { en: 'Custom Range', zh: '自定义范围' },
  };
  return locale === 'zh-CN' ? labels[timeRange].zh : labels[timeRange].en;
}

/**
 * 获取格式标签
 */
export function getFormatLabel(format: ExportFormat, locale: string = 'en'): string {
  const labels: Record<ExportFormat, { en: string; zh: string }> = {
    csv: { en: 'CSV', zh: 'CSV' },
    json: { en: 'JSON', zh: 'JSON' },
    excel: { en: 'Excel', zh: 'Excel' },
  };
  return locale === 'zh-CN' ? labels[format].zh : labels[format].en;
}

/**
 * 获取数据类型标签
 */
export function getDataTypeLabel(dataType: ExportDataType, locale: string = 'en'): string {
  const labels: Record<ExportDataType, { en: string; zh: string }> = {
    oracleMarket: { en: 'Oracle Market', zh: '预言机市场' },
    assets: { en: 'Assets', zh: '资产' },
    trendData: { en: 'Trend Data', zh: '趋势数据' },
    chainBreakdown: { en: 'Chain Breakdown', zh: '链分布' },
    protocolDetails: { en: 'Protocol Details', zh: '协议详情' },
    assetCategories: { en: 'Asset Categories', zh: '资产类别' },
    comparisonData: { en: 'Comparison Data', zh: '对比数据' },
    benchmarkData: { en: 'Benchmark Data', zh: '基准数据' },
    correlationData: { en: 'Correlation Data', zh: '相关性数据' },
    riskMetrics: { en: 'Risk Metrics', zh: '风险指标' },
    anomalies: { en: 'Anomalies', zh: '异常数据' },
    all: { en: 'All Data', zh: '全部数据' },
  };
  return locale === 'zh-CN' ? labels[dataType].zh : labels[dataType].en;
}
