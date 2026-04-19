import {
  type ExportConfig,
  type ExportDataType,
  generateExportFileName,
} from '@/lib/export/exportConfig';
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

const logger = createLogger('marketData:priceCalculations');

const CONFIDENCE_INTERVAL = 0.05;

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

  for (let i = points; i >= 0; i--) {
    const timestamp = now - i * interval;
    const date = new Date(timestamp);
    const dateStr = hours <= 24 ? formatTimeString(date, false) : formatDateString(date, 'medium');

    const volatility = 0.02;

    const chainlink =
      (baseValues.chainlink || defaults.chainlink) * (1 + (Math.random() - 0.48) * volatility);
    const pyth = (baseValues.pyth || defaults.pyth) * (1 + (Math.random() - 0.45) * volatility);
    const api3 = (baseValues.api3 || defaults.api3) * (1 + (Math.random() - 0.5) * volatility);
    const uma = (baseValues.uma || defaults.uma) * (1 + (Math.random() - 0.5) * volatility);
    const redstone =
      (baseValues.redstone || defaults.redstone) * (1 + (Math.random() - 0.5) * volatility);
    const dia = (baseValues.dia || defaults.dia) * (1 + (Math.random() - 0.5) * volatility);
    const winklink =
      (baseValues.winklink || defaults.winklink) * (1 + (Math.random() - 0.5) * volatility);
    const supra = (baseValues.supra || defaults.supra) * (1 + (Math.random() - 0.5) * volatility);

    data.push({
      timestamp,
      date: dateStr,
      chainlink: Number(chainlink.toFixed(2)),
      chainlinkUpper: Number((chainlink * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      chainlinkLower: Number((chainlink * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      pyth: Number(pyth.toFixed(2)),
      pythUpper: Number((pyth * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      pythLower: Number((pyth * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      api3: Number(api3.toFixed(2)),
      api3Upper: Number((api3 * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      api3Lower: Number((api3 * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      uma: Number(uma.toFixed(2)),
      umaUpper: Number((uma * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      umaLower: Number((uma * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      redstone: Number(redstone.toFixed(2)),
      redstoneUpper: Number((redstone * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      redstoneLower: Number((redstone * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      dia: Number(dia.toFixed(2)),
      diaUpper: Number((dia * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      diaLower: Number((dia * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      winklink: Number(winklink.toFixed(2)),
      winklinkUpper: Number((winklink * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      winklinkLower: Number((winklink * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      supra: Number(supra.toFixed(2)),
      supraUpper: Number((supra * (1 + CONFIDENCE_INTERVAL)).toFixed(2)),
      supraLower: Number((supra * (1 - CONFIDENCE_INTERVAL)).toFixed(2)),
      total: Number((chainlink + pyth + api3 + uma + redstone + dia + winklink + supra).toFixed(2)),
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
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
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
        const cellValue = value === null || value === undefined ? '' : escapeXml(String(value));
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
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  logger.info(`Downloaded file: ${fileName}`);
}
