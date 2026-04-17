/**
 * Export Configuration Module
 *
 * Provides export configuration management including field selection, time range configuration, format options, etc.
 */

export type ExportFormat = 'csv' | 'json' | 'excel';

export type ExportTimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'custom';

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

export interface ExportField {
  key: string;
  label: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  selected: boolean;
}

export interface FieldGroup {
  key: ExportDataType;
  label: string;
  fields: ExportField[];
}

export interface ExportConfig {
  id: string;
  name: string;
  description?: string;
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

export const DEFAULT_FIELD_GROUPS: FieldGroup[] = [
  {
    key: 'oracleMarket',
    label: 'Oracle Market Data',
    fields: [
      { key: 'name', label: 'Name', dataType: 'string', selected: true },
      {
        key: 'share',
        label: 'Market Share (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      { key: 'tvs', label: 'TVS', dataType: 'string', selected: true },
      {
        key: 'tvsValue',
        label: 'TVS Value (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      { key: 'chains', label: 'Chains', dataType: 'number', selected: true },
      {
        key: 'protocols',
        label: 'Protocols',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'avgLatency',
        label: 'Avg Latency (ms)',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'accuracy',
        label: 'Accuracy (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'updateFrequency',
        label: 'Update Frequency (s)',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'change24h',
        label: '24h Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'change7d',
        label: '7d Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'change30d',
        label: '30d Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
    ],
  },
  {
    key: 'assets',
    label: 'Asset Data',
    fields: [
      { key: 'symbol', label: 'Symbol', dataType: 'string', selected: true },
      {
        key: 'price',
        label: 'Price (USD)',
        dataType: 'number',
        format: '0.0000',
        selected: true,
      },
      {
        key: 'change24h',
        label: '24h Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'change7d',
        label: '7d Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'volume24h',
        label: '24h Volume',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'marketCap',
        label: 'Market Cap',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'primaryOracle',
        label: 'Primary Oracle',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'oracleCount',
        label: 'Oracle Count',
        dataType: 'number',
        selected: false,
      },
    ],
  },
  {
    key: 'trendData',
    label: 'Trend Data',
    fields: [
      { key: 'timestamp', label: 'Timestamp', dataType: 'date', selected: true },
      { key: 'date', label: 'Date', dataType: 'string', selected: true },
      {
        key: 'chainlink',
        label: 'Chainlink (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'pyth',
        label: 'Pyth Network (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'api3',
        label: 'API3 (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'uma',
        label: 'UMA (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'total',
        label: 'Total (B)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
    ],
  },
  {
    key: 'chainBreakdown',
    label: 'Chain Breakdown',
    fields: [
      { key: 'chainId', label: 'Chain ID', dataType: 'string', selected: true },
      {
        key: 'chainName',
        label: 'Chain Name',
        dataType: 'string',
        selected: true,
      },
      { key: 'tvs', label: 'TVS', dataType: 'number', selected: true },
      {
        key: 'tvsFormatted',
        label: 'TVS Formatted',
        dataType: 'string',
        selected: false,
      },
      {
        key: 'share',
        label: 'Share (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'protocols',
        label: 'Protocols',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'change24h',
        label: '24h Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'change7d',
        label: '7d Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'topOracle',
        label: 'Top Oracle',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'topOracleShare',
        label: 'Top Oracle Share (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
    ],
  },
  {
    key: 'protocolDetails',
    label: 'Protocol Details',
    fields: [
      { key: 'id', label: 'ID', dataType: 'string', selected: true },
      { key: 'name', label: 'Name', dataType: 'string', selected: true },
      { key: 'category', label: 'Category', dataType: 'string', selected: true },
      { key: 'tvl', label: 'TVL', dataType: 'number', selected: true },
      {
        key: 'tvlFormatted',
        label: 'TVL Formatted',
        dataType: 'string',
        selected: false,
      },
      { key: 'chains', label: 'Chains', dataType: 'string', selected: true },
      {
        key: 'primaryOracle',
        label: 'Primary Oracle',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'oracleCount',
        label: 'Oracle Count',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'change24h',
        label: '24h Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'change7d',
        label: '7d Change (%)',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
    ],
  },
  {
    key: 'riskMetrics',
    label: 'Risk Metrics',
    fields: [
      {
        key: 'hhi.value',
        label: 'HHI Value',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'hhi.level',
        label: 'HHI Level',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'hhi.concentrationRatio',
        label: 'Concentration Ratio (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'diversification.score',
        label: 'Diversification Score',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'diversification.level',
        label: 'Diversification Level',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'diversification.factors.chainDiversity',
        label: 'Chain Diversity',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'diversification.factors.protocolDiversity',
        label: 'Protocol Diversity',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'diversification.factors.assetDiversity',
        label: 'Asset Diversity',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'volatility.index',
        label: 'Volatility Index',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'volatility.level',
        label: 'Volatility Level',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'volatility.annualizedVolatility',
        label: 'Annualized Volatility',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'correlationRisk.score',
        label: 'Correlation Risk Score',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'correlationRisk.level',
        label: 'Correlation Risk Level',
        dataType: 'string',
        selected: true,
      },
      {
        key: 'correlationRisk.avgCorrelation',
        label: 'Avg Correlation',
        dataType: 'number',
        format: '0.00',
        selected: false,
      },
      {
        key: 'overallRisk.score',
        label: 'Overall Risk Score',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'overallRisk.level',
        label: 'Overall Risk Level',
        dataType: 'string',
        selected: true,
      },
    ],
  },
  {
    key: 'anomalies',
    label: 'Anomalies',
    fields: [
      { key: 'id', label: 'ID', dataType: 'string', selected: true },
      { key: 'type', label: 'Type', dataType: 'string', selected: true },
      { key: 'level', label: 'Level', dataType: 'string', selected: true },
      { key: 'title', label: 'Title', dataType: 'string', selected: true },
      {
        key: 'description',
        label: 'Description',
        dataType: 'string',
        selected: false,
      },
      { key: 'timestamp', label: 'Timestamp', dataType: 'date', selected: true },
      { key: 'asset', label: 'Asset', dataType: 'string', selected: true },
      { key: 'oracle', label: 'Oracle', dataType: 'string', selected: true },
      { key: 'value', label: 'Value', dataType: 'number', selected: true },
      {
        key: 'expectedValue',
        label: 'Expected Value',
        dataType: 'number',
        selected: true,
      },
      {
        key: 'deviation',
        label: 'Deviation (%)',
        dataType: 'number',
        format: '0.00',
        selected: true,
      },
      {
        key: 'duration',
        label: 'Duration (min)',
        dataType: 'number',
        selected: false,
      },
      {
        key: 'acknowledged',
        label: 'Acknowledged',
        dataType: 'boolean',
        selected: false,
      },
    ],
  },
];

export function createDefaultExportConfig(): ExportConfig {
  const now = Date.now();
  return {
    id: `config-${now}`,
    name: 'Default Configuration',
    description: 'Default export configuration with commonly used fields',
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

export function getFieldLabel(field: ExportField, _locale: string = 'en'): string {
  return field.label;
}

export function getSelectedFields(
  fieldGroups: FieldGroup[],
  groupKey: ExportDataType
): ExportField[] {
  const group = fieldGroups.find((g) => g.key === groupKey);
  return group?.fields.filter((f) => f.selected) || [];
}

export function generateExportFileName(config: ExportConfig): string {
  if (config.fileName) {
    return config.fileName;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const dataTypes = config.dataTypes.length > 2 ? 'multi' : config.dataTypes.join('-');
  const extension = config.format === 'excel' ? 'xlsx' : config.format;
  return `oracle-export-${dataTypes}-${timestamp}.${extension}`;
}
