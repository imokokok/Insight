'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { QueryResult, providerNames, chainNames } from '../constants';
import { ExportConfigData } from '../components/ExportConfig';
import { OracleProvider, Blockchain } from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { exportColors, baseColors } from '@/lib/config/colors';

const logger = createLogger('ExportUtils');

interface StatsData {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  dataPoints: number;
  queryDuration: number | null;
  avgChange24hPercent?: number;
}

export function generateFilename(symbol: string, extension: string, format?: string): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  const formatSuffix = format ? `-${format}` : '';
  return `price-query-${symbol}${formatSuffix}-${timestamp}.${extension}`;
}

export function exportToCSV(
  queryResults: QueryResult[],
  config: ExportConfigData,
  selectedSymbol: string
): void {
  const enabledFields = config.fields;
  const csvLines: string[] = [];

  csvLines.push('=== 价格查询结果 ===');
  csvLines.push(`币种: ${selectedSymbol}`);
  csvLines.push(`导出时间: ${new Date().toLocaleString()}`);
  csvLines.push('');

  const headers: string[] = [];
  if (enabledFields.find((f) => f.key === 'oracle')) headers.push('预言机');
  if (enabledFields.find((f) => f.key === 'blockchain')) headers.push('区块链');
  if (enabledFields.find((f) => f.key === 'price')) headers.push('价格');
  if (enabledFields.find((f) => f.key === 'timestamp')) headers.push('时间戳');
  if (enabledFields.find((f) => f.key === 'change24h')) headers.push('24h变化');
  if (enabledFields.find((f) => f.key === 'confidence')) headers.push('置信度');
  if (enabledFields.find((f) => f.key === 'source')) headers.push('来源');

  csvLines.push(headers.join(','));

  const filteredResults = filterByTimeRange(queryResults, config.timeRange);

  filteredResults.forEach((result) => {
    const row: string[] = [];
    if (enabledFields.find((f) => f.key === 'oracle')) {
      row.push(providerNames[result.provider]);
    }
    if (enabledFields.find((f) => f.key === 'blockchain')) {
      row.push(chainNames[result.chain]);
    }
    if (enabledFields.find((f) => f.key === 'price')) {
      row.push(
        result.priceData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })
      );
    }
    if (enabledFields.find((f) => f.key === 'timestamp')) {
      row.push(new Date(result.priceData.timestamp).toLocaleString());
    }
    if (enabledFields.find((f) => f.key === 'change24h')) {
      row.push(
        result.priceData.change24hPercent !== undefined
          ? `${result.priceData.change24hPercent >= 0 ? '+' : ''}${result.priceData.change24hPercent.toFixed(2)}%`
          : '-'
      );
    }
    if (enabledFields.find((f) => f.key === 'confidence')) {
      row.push(result.priceData.confidence?.toString() ?? '-');
    }
    if (enabledFields.find((f) => f.key === 'source')) {
      row.push(result.priceData.source ?? '');
    }
    csvLines.push(row.join(','));
  });

  const csvContent = csvLines.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', generateFilename(selectedSymbol, 'csv'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(
  queryResults: QueryResult[],
  config: ExportConfigData,
  selectedSymbol: string,
  selectedOracles: OracleProvider[],
  selectedChains: Blockchain[]
): void {
  const enabledFields = config.fields;
  const filteredResults = filterByTimeRange(queryResults, config.timeRange);

  const exportData: Record<string, unknown> = {
    metadata: {
      symbol: selectedSymbol,
      selectedOracles: selectedOracles.map((o) => providerNames[o]),
      selectedChains: selectedChains.map((c) => chainNames[c]),
      exportTimestamp: new Date().toISOString(),
      exportedFields: enabledFields.map((f) => f.key),
    },
    results: filteredResults.map((result) => {
      const item: Record<string, unknown> = {};
      if (enabledFields.find((f) => f.key === 'oracle')) {
        item.oracle = providerNames[result.provider];
      }
      if (enabledFields.find((f) => f.key === 'blockchain')) {
        item.blockchain = chainNames[result.chain];
      }
      if (enabledFields.find((f) => f.key === 'price')) {
        item.price = result.priceData.price;
      }
      if (enabledFields.find((f) => f.key === 'timestamp')) {
        item.timestamp = new Date(result.priceData.timestamp).toISOString();
      }
      if (enabledFields.find((f) => f.key === 'change24h')) {
        item.change24hPercent = result.priceData.change24hPercent;
      }
      if (enabledFields.find((f) => f.key === 'confidence')) {
        item.confidence = result.priceData.confidence;
      }
      if (enabledFields.find((f) => f.key === 'source')) {
        item.source = result.priceData.source;
      }
      return item;
    }),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', generateFilename(selectedSymbol, 'json'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportToPDF(
  queryResults: QueryResult[],
  config: ExportConfigData,
  selectedSymbol: string,
  selectedOracles: OracleProvider[],
  selectedChains: Blockchain[],
  selectedTimeRange: number,
  stats: StatsData,
  chartContainerRef?: React.RefObject<HTMLDivElement | null>
): Promise<void> {
  const doc = new jsPDF();
  const enabledFields = config.fields;
  const filteredResults = filterByTimeRange(queryResults, config.timeRange);

  const primaryColor = exportColors.text.primary;
  const secondaryColor = exportColors.text.secondary;

  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text('价格查询报告', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text(`生成时间: ${new Date().toLocaleString()}`, 14, 28);

  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('查询参数', 14, 40);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  let yPos = 48;
  doc.text(`币种: ${selectedSymbol}`, 14, yPos);
  yPos += 6;
  doc.text(`预言机: ${selectedOracles.map((o) => providerNames[o]).join(', ')}`, 14, yPos);
  yPos += 6;
  doc.text(`区块链: ${selectedChains.map((c) => chainNames[c]).join(', ')}`, 14, yPos);
  yPos += 6;
  doc.text(`时间范围: ${selectedTimeRange}小时`, 14, yPos);

  yPos += 12;

  if (config.includeStats) {
    doc.setFontSize(12);
    doc.setTextColor(primaryColor);
    doc.text('统计摘要', 14, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor);

    const statsData = [
      [
        '平均价格',
        `$${stats.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
      [
        '最高价格',
        `$${stats.maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
      [
        '最低价格',
        `$${stats.minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
      [
        '价格区间',
        `$${stats.priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
      ['标准差', `${stats.standardDeviationPercent.toFixed(4)}%`],
      ['数据点', stats.dataPoints.toString()],
    ];

    if (stats.avgChange24hPercent !== undefined) {
      statsData.push([
        '24h变化',
        `${stats.avgChange24hPercent >= 0 ? '+' : ''}${stats.avgChange24hPercent.toFixed(2)}%`,
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['指标', '数值']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (config.includeChart && chartContainerRef?.current) {
    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (yPos + imgHeight > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(primaryColor);
      doc.text('价格图表', 14, yPos);

      doc.addImage(imgData, 'PNG', 14, yPos + 5, imgWidth, imgHeight);
      yPos += imgHeight + 15;
    } catch (error) {
      logger.error(
        'Failed to capture chart',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('价格数据', 14, yPos);

  const tableHeaders: string[] = [];
  if (enabledFields.find((f) => f.key === 'oracle')) tableHeaders.push('预言机');
  if (enabledFields.find((f) => f.key === 'blockchain')) tableHeaders.push('区块链');
  if (enabledFields.find((f) => f.key === 'price')) tableHeaders.push('价格');
  if (enabledFields.find((f) => f.key === 'timestamp')) tableHeaders.push('时间戳');
  if (enabledFields.find((f) => f.key === 'change24h')) tableHeaders.push('24h变化');
  if (enabledFields.find((f) => f.key === 'confidence')) tableHeaders.push('置信度');
  if (enabledFields.find((f) => f.key === 'source')) tableHeaders.push('来源');

  const tableBody = filteredResults.map((result) => {
    const row: string[] = [];
    if (enabledFields.find((f) => f.key === 'oracle')) {
      row.push(providerNames[result.provider]);
    }
    if (enabledFields.find((f) => f.key === 'blockchain')) {
      row.push(chainNames[result.chain]);
    }
    if (enabledFields.find((f) => f.key === 'price')) {
      row.push(
        `$${result.priceData.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}`
      );
    }
    if (enabledFields.find((f) => f.key === 'timestamp')) {
      row.push(new Date(result.priceData.timestamp).toLocaleString());
    }
    if (enabledFields.find((f) => f.key === 'change24h')) {
      row.push(
        result.priceData.change24hPercent !== undefined
          ? `${result.priceData.change24hPercent >= 0 ? '+' : ''}${result.priceData.change24hPercent.toFixed(2)}%`
          : '-'
      );
    }
    if (enabledFields.find((f) => f.key === 'confidence')) {
      row.push(result.priceData.confidence?.toString() ?? '-');
    }
    if (enabledFields.find((f) => f.key === 'source')) {
      row.push(result.priceData.source ?? '-');
    }
    return row;
  });

  autoTable(doc, {
    startY: yPos + 5,
    head: [tableHeaders],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    pageBreak: 'auto',
  });

  doc.save(generateFilename(selectedSymbol, 'pdf'));
}

function filterByTimeRange(
  results: QueryResult[],
  timeRange: { start: number | null; end: number | null }
): QueryResult[] {
  if (!timeRange.start && !timeRange.end) {
    return results;
  }

  return results.filter((result) => {
    const timestamp = result.priceData.timestamp;
    if (timeRange.start && timestamp < timeRange.start) return false;
    if (timeRange.end && timestamp > timeRange.end) return false;
    return true;
  });
}
