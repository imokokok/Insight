import {
  type OracleMarketData,
  type TVSTrendData,
  type AssetData,
  type ChainBreakdown,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
  type RiskMetrics,
  type AnomalyData,
} from '@/lib/services/marketData/types';
import { formatTimeString, formatDateString } from '@/lib/utils/format';
import { createLogger } from '@/lib/utils/logger';

type ExportFormat = 'csv' | 'json' | 'excel';

type ExportTimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'custom';

type ExportDataType =
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

interface ExportField {
  key: string;
  label: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  selected: boolean;
}

interface FieldGroup {
  key: ExportDataType;
  label: string;
  fields: ExportField[];
}

interface ExportConfig {
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

function generateExportFileName(config: ExportConfig): string {
  if (config.fileName) {
    return config.fileName;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const dataTypes = config.dataTypes.length > 2 ? 'multi' : config.dataTypes.join('-');
  const extension = config.format === 'excel' ? 'xlsx' : config.format;
  return `oracle-export-${dataTypes}-${timestamp}.${extension}`;
}

const logger = createLogger('marketData:priceCalculations');

function boxMullerRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

interface GBMParams {
  initialValue: number;
  drift: number;
  volatility: number;
  dt: number;
}

function generateGBMPath(params: GBMParams, steps: number): number[] {
  const { initialValue, drift, volatility, dt } = params;
  const path: number[] = [initialValue];
  for (let i = 1; i < steps; i++) {
    const prev = path[i - 1];
    const z = boxMullerRandom();
    const next =
      prev *
      Math.exp((drift - 0.5 * volatility * volatility) * dt + volatility * Math.sqrt(dt) * z);
    path.push(Math.max(next, prev * 0.5));
  }
  return path;
}

function calculateConfidenceBand(
  path: number[],
  confidenceLevel: number = 0.95
): { upper: number[]; lower: number[] } {
  const n = path.length;
  if (n < 2) {
    return { upper: path.slice(), lower: path.slice() };
  }

  const logReturns: number[] = [];
  for (let i = 1; i < n; i++) {
    if (path[i] > 0 && path[i - 1] > 0) {
      logReturns.push(Math.log(path[i] / path[i - 1]));
    }
  }

  if (logReturns.length < 2) {
    return { upper: path.slice(), lower: path.slice() };
  }

  const meanReturn = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (logReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  const df = logReturns.length - 1;
  const tCritical = df >= 30 ? 1.96 : getApproxTCritical(df, confidenceLevel);
  const standardError = stdDev / Math.sqrt(logReturns.length);
  const marginOfError = tCritical * standardError;

  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < n; i++) {
    const scaleFactor = Math.exp(marginOfError * Math.sqrt(i + 1));
    upper.push(path[i] * scaleFactor);
    lower.push(path[i] / scaleFactor);
  }

  return { upper, lower };
}

function getApproxTCritical(df: number, confidenceLevel: number): number {
  const alpha = 1 - confidenceLevel;
  if (alpha <= 0.001) return 3.291;
  if (alpha <= 0.01) return 2.576;
  if (alpha <= 0.02) return 2.326;
  if (alpha <= 0.05) {
    if (df <= 1) return 12.706;
    if (df <= 2) return 4.303;
    if (df <= 5) return 2.571;
    if (df <= 10) return 2.228;
    if (df <= 20) return 2.086;
    if (df <= 30) return 2.042;
    return 1.96;
  }
  if (alpha <= 0.1) return 1.645;
  return 1.96;
}

export function generateTVSTrendData(
  hours: number,
  oracleData?: OracleMarketData[]
): TVSTrendData[] {
  const data: TVSTrendData[] = [];
  const now = Date.now();
  const interval = hours <= 24 ? 3600000 : 86400000;
  const points = hours === 0 ? 365 : Math.min(hours, 365);

  const baseValues: Record<string, number> = {};
  if (oracleData && oracleData.length > 0) {
    oracleData.forEach((oracle) => {
      const key = oracle.name.toLowerCase().replace(' network', '').replace(' protocol', '');
      baseValues[key] = oracle.tvsValue;
    });
  }

  const defaults: Record<string, number> = {
    chainlink: 42.1,
    pyth: 15.2,
    api3: 3.5,
    uma: 2.5,
    redstone: 2.1,
    dia: 1.6,
    winklink: 0.7,
    supra: 1.2,
  };

  const dt = 1 / 365;
  const oracleKeys = ['chainlink', 'pyth', 'api3', 'uma', 'redstone', 'dia', 'winklink', 'supra'];

  const gbmPaths: Record<string, number[]> = {};
  const confidenceBands: Record<string, { upper: number[]; lower: number[] }> = {};
  for (const key of oracleKeys) {
    const initial = baseValues[key] || defaults[key];
    gbmPaths[key] = generateGBMPath(
      {
        initialValue: initial,
        drift: 0.05,
        volatility: 0.3,
        dt,
      },
      points
    );
    confidenceBands[key] = calculateConfidenceBand(gbmPaths[key]);
  }

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - i * interval;
    const date = new Date(timestamp);
    const dateStr = hours <= 24 ? formatTimeString(date, false) : formatDateString(date, 'medium');

    const stepIndex = points - 1 - i;
    const values: Record<string, number> = {};
    const uppers: Record<string, number> = {};
    const lowers: Record<string, number> = {};
    let total = 0;

    for (const key of oracleKeys) {
      values[key] = Number(gbmPaths[key][stepIndex].toFixed(2));
      uppers[key] = Number(confidenceBands[key].upper[stepIndex].toFixed(2));
      lowers[key] = Number(confidenceBands[key].lower[stepIndex].toFixed(2));
      total += values[key];
    }

    data.push({
      timestamp,
      date: dateStr,
      chainlink: values.chainlink,
      chainlinkUpper: uppers.chainlink,
      chainlinkLower: lowers.chainlink,
      pyth: values.pyth,
      pythUpper: uppers.pyth,
      pythLower: lowers.pyth,
      api3: values.api3,
      api3Upper: uppers.api3,
      api3Lower: lowers.api3,
      uma: values.uma,
      umaUpper: uppers.uma,
      umaLower: lowers.uma,
      redstone: values.redstone,
      redstoneUpper: uppers.redstone,
      redstoneLower: lowers.redstone,
      dia: values.dia,
      diaUpper: uppers.dia,
      diaLower: lowers.dia,
      winklink: values.winklink,
      winklinkUpper: uppers.winklink,
      winklinkLower: lowers.winklink,
      supra: values.supra,
      supraUpper: uppers.supra,
      supraLower: lowers.supra,
      total: Number(total.toFixed(2)),
    });
  }

  return data;
}

interface ExportDataOptions {
  oracleData: OracleMarketData[];
  assets: AssetData[];
  trendData: TVSTrendData[];
  chainBreakdown?: ChainBreakdown[];
  protocolDetails?: ProtocolDetail[];
  assetCategories?: AssetCategory[];
  comparisonData?: ComparisonData[];
  benchmarkData?: BenchmarkData[];
  correlationData?: CorrelationData;
  riskMetrics?: RiskMetrics;
  anomalies?: AnomalyData[];
}

export function exportWithConfig(
  config: ExportConfig,
  data: ExportDataOptions
): { content: string | Blob; fileName: string; mimeType: string } {
  logger.info(`Exporting data with config: ${config.name}, format: ${config.format}`);

  const fileName = config.fileName || generateExportFileName(config);

  switch (config.format) {
    case 'csv':
      return {
        content: exportToCSV(config, data),
        fileName,
        mimeType: 'text/csv;charset=utf-8;',
      };
    case 'json':
      return {
        content: exportToJSON(config, data),
        fileName,
        mimeType: 'application/json',
      };
    case 'excel':
      return {
        content: exportToExcel(config, data),
        fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    default:
      throw new Error(`Unsupported export format: ${config.format}`);
  }
}

function exportToCSV(config: ExportConfig, data: ExportDataOptions): string {
  const lines: string[] = [];

  if (config.includeMetadata) {
    lines.push('# Oracle Market Data Export');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Time Range: ${config.timeRange}`);
    lines.push(`# Data Types: ${config.dataTypes.join(', ')}`);
    lines.push('');
  }

  config.dataTypes.forEach((dataType) => {
    const group = config.fieldGroups.find((g) => g.key === dataType);
    if (!group) return;

    const selectedFields = group.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) return;

    lines.push(`# ${group.label}`);
    lines.push(selectedFields.map((f) => f.label).join(','));

    const rows = getDataRows(dataType, data, selectedFields);
    rows.forEach((row) => {
      lines.push(
        selectedFields
          .map((field) => {
            const value = row[field.key];
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (
              str.includes(',') ||
              str.includes('"') ||
              str.includes('\n') ||
              str.includes('\r')
            ) {
              return `"${str.replace(/"/g, '""').replace(/\r/g, '')}"`;
            }
            return str;
          })
          .join(',')
      );
    });

    lines.push('');
  });

  return lines.join('\n');
}

function exportToJSON(config: ExportConfig, data: ExportDataOptions): string {
  const exportData: Record<string, unknown> = {};

  if (config.includeMetadata) {
    exportData.metadata = {
      exportTimestamp: new Date().toISOString(),
      timeRange: config.timeRange,
      dataTypes: config.dataTypes,
      config: {
        name: config.name,
        format: config.format,
      },
    };
  }

  config.dataTypes.forEach((dataType) => {
    const group = config.fieldGroups.find((g) => g.key === dataType);
    if (!group) return;

    const selectedFields = group.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) return;

    const rows = getDataRows(dataType, data, selectedFields);
    exportData[dataType] = rows.map((row) => {
      const filteredRow: Record<string, unknown> = {};
      selectedFields.forEach((field) => {
        filteredRow[field.key] = row[field.key];
      });
      return filteredRow;
    });
  });

  return JSON.stringify(exportData, null, 2);
}

function exportToExcel(config: ExportConfig, data: ExportDataOptions): Blob {
  const workbook: string[] = [];

  workbook.push('<?xml version="1.0" encoding="UTF-8"?>');
  workbook.push('<?mso-application progid="Excel.Sheet"?>');
  workbook.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
  workbook.push('          xmlns:o="urn:schemas-microsoft-com:office:office"');
  workbook.push('          xmlns:x="urn:schemas-microsoft-com:office:excel"');
  workbook.push('          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');
  workbook.push('  <Styles>');
  workbook.push('    <Style ss:ID="header">');
  workbook.push('      <Font ss:Bold="1"/>');
  workbook.push('      <Interior ss:Color="#9CA3AF" ss:Pattern="Solid"/>');
  workbook.push('    </Style>');
  workbook.push('  </Styles>');

  if (config.includeMetadata) {
    workbook.push('  <Worksheet ss:Name="Metadata">');
    workbook.push('    <Table>');
    workbook.push(
      '      <Row><Cell><Data ss:Type="String">Oracle Market Data Export</Data></Cell></Row>'
    );
    workbook.push(
      `      <Row><Cell><Data ss:Type="String">Generated: ${new Date().toISOString()}</Data></Cell></Row>`
    );
    workbook.push(
      `      <Row><Cell><Data ss:Type="String">Time Range: ${config.timeRange}</Data></Cell></Row>`
    );
    workbook.push('    </Table>');
    workbook.push('  </Worksheet>');
  }

  config.dataTypes.forEach((dataType) => {
    const group = config.fieldGroups.find((g) => g.key === dataType);
    if (!group) return;

    const selectedFields = group.fields.filter((f) => f.selected);
    if (selectedFields.length === 0) return;

    const sheetName = group.label.substring(0, 31);
    workbook.push(`  <Worksheet ss:Name="${escapeXml(sheetName)}">`);
    workbook.push('    <Table>');

    workbook.push('      <Row>');
    selectedFields.forEach((field) => {
      workbook.push(
        `        <Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
      );
    });
    workbook.push('      </Row>');

    const rows = getDataRows(dataType, data, selectedFields);
    rows.forEach((row) => {
      workbook.push('      <Row>');
      selectedFields.forEach((field) => {
        const value = row[field.key];
        const type = field.dataType === 'number' ? 'Number' : 'String';
        let cellValue = value === null || value === undefined ? '' : escapeXml(String(value));
        if (type === 'String' && /^[=+\-@]/.test(cellValue)) {
          cellValue = `'${cellValue}`;
        }
        workbook.push(`        <Cell><Data ss:Type="${type}">${cellValue}</Data></Cell>`);
      });
      workbook.push('      </Row>');
    });

    workbook.push('    </Table>');
    workbook.push('  </Worksheet>');
  });

  workbook.push('</Workbook>');

  return new Blob([workbook.join('\n')], {
    type: 'application/vnd.ms-excel',
  });
}

function getDataRows(
  dataType: ExportDataType,
  data: ExportDataOptions,
  _fields: { key: string }[]
): Record<string, unknown>[] {
  switch (dataType) {
    case 'oracleMarket':
      return data.oracleData.map((item) => ({
        name: item.name,
        share: item.share,
        tvs: item.tvs,
        tvsValue: item.tvsValue,
        chains: item.chains,
        protocols: item.protocols,
        avgLatency: item.avgLatency,
        accuracy: item.accuracy,
        updateFrequency: item.updateFrequency,
        change24h: item.change24h,
        change7d: item.change7d,
        change30d: item.change30d,
      }));

    case 'assets':
      return data.assets.map((item) => ({
        symbol: item.symbol,
        price: item.price,
        change24h: item.change24h,
        change7d: item.change7d,
        volume24h: item.volume24h,
        marketCap: item.marketCap,
        primaryOracle: item.primaryOracle,
        oracleCount: item.oracleCount,
      }));

    case 'trendData':
      return data.trendData.map((item) => ({
        timestamp: item.timestamp,
        date: item.date,
        chainlink: item.chainlink,
        pyth: item.pyth,
        api3: item.api3,
        uma: item.uma,
        total: item.total,
      }));

    case 'chainBreakdown':
      return (data.chainBreakdown || []).map((item) => ({
        chainId: item.chainId,
        chainName: item.chainName,
        tvs: item.tvs,
        tvsFormatted: item.tvsFormatted,
        share: item.share,
        protocols: item.protocols,
        change24h: item.change24h,
        change7d: item.change7d,
        topOracle: item.topOracle,
        topOracleShare: item.topOracleShare,
      }));

    case 'protocolDetails':
      return (data.protocolDetails || []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        tvl: item.tvl,
        tvlFormatted: item.tvlFormatted,
        chains: item.chains.join(', '),
        primaryOracle: item.primaryOracle,
        oracleCount: item.oracleCount,
        change24h: item.change24h,
        change7d: item.change7d,
      }));

    case 'riskMetrics':
      if (!data.riskMetrics) return [];
      return [
        {
          'hhi.value': data.riskMetrics.hhi.value,
          'hhi.level': data.riskMetrics.hhi.level,
          'hhi.concentrationRatio': data.riskMetrics.hhi.concentrationRatio,
          'diversification.score': data.riskMetrics.diversification.score,
          'diversification.level': data.riskMetrics.diversification.level,
          'diversification.factors.chainDiversity':
            data.riskMetrics.diversification.factors.chainDiversity,
          'diversification.factors.protocolDiversity':
            data.riskMetrics.diversification.factors.protocolDiversity,
          'diversification.factors.assetDiversity':
            data.riskMetrics.diversification.factors.assetDiversity,
          'volatility.index': data.riskMetrics.volatility.index,
          'volatility.level': data.riskMetrics.volatility.level,
          'volatility.annualizedVolatility': data.riskMetrics.volatility.annualizedVolatility,
          'correlationRisk.score': data.riskMetrics.correlationRisk.score,
          'correlationRisk.level': data.riskMetrics.correlationRisk.level,
          'correlationRisk.avgCorrelation': data.riskMetrics.correlationRisk.avgCorrelation,
          'overallRisk.score': data.riskMetrics.overallRisk.score,
          'overallRisk.level': data.riskMetrics.overallRisk.level,
        },
      ];

    case 'anomalies':
      return (data.anomalies || []).map((item) => ({
        id: item.id,
        type: item.type,
        level: item.level,
        title: item.title,
        description: item.description,
        timestamp: item.timestamp,
        asset: item.asset,
        oracle: item.oracle,
        value: item.value,
        expectedValue: item.expectedValue,
        deviation: item.deviation,
        duration: item.duration,
        acknowledged: item.acknowledged,
      }));

    default:
      return [];
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadExport(content: string | Blob, fileName: string, mimeType: string): void {
  if (typeof window === 'undefined') {
    logger.warn('downloadExport called in SSR environment, skipping');
    return;
  }
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
  logger.info(`Downloaded file: ${fileName}`);
}
