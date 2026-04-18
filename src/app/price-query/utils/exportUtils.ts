'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { exportColors } from '@/lib/config/colors';
import { downloadBlob } from '@/lib/utils/download';
import { escapeCSVField } from '@/lib/utils/export';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

import { type ExportConfigData } from '../components/ExportConfig';
import { type QueryResult, providerNames, chainNames } from '../constants';

import { formatPrice } from './queryResultsUtils';

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

function generateFilename(symbol: string, extension: string, format?: string): string {
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

  csvLines.push('=== Price Query Results ===');
  csvLines.push(`Symbol: ${selectedSymbol}`);
  csvLines.push(`Export Time: ${new Date().toLocaleString('en-US')}`);
  csvLines.push('');

  const headers: string[] = [];
  if (enabledFields.find((f) => f.key === 'oracle')) headers.push('Oracle');
  if (enabledFields.find((f) => f.key === 'blockchain')) headers.push('Blockchain');
  if (enabledFields.find((f) => f.key === 'price')) headers.push('Price');
  if (enabledFields.find((f) => f.key === 'timestamp')) headers.push('Timestamp');
  if (enabledFields.find((f) => f.key === 'change24h')) headers.push('24h Change');
  if (enabledFields.find((f) => f.key === 'confidence')) headers.push('Confidence');
  if (enabledFields.find((f) => f.key === 'source')) headers.push('Source');

  csvLines.push(headers.join(','));

  const filteredResults = filterByTimeRange(queryResults, config.timeRange);

  filteredResults.forEach((result) => {
    const row: string[] = [];
    if (enabledFields.find((f) => f.key === 'oracle')) {
      row.push(escapeCSVField(providerNames[result.provider]));
    }
    if (enabledFields.find((f) => f.key === 'blockchain')) {
      row.push(escapeCSVField(chainNames[result.chain]));
    }
    if (enabledFields.find((f) => f.key === 'price')) {
      row.push(formatPrice(result.priceData.price));
    }
    if (enabledFields.find((f) => f.key === 'timestamp')) {
      row.push(escapeCSVField(new Date(result.priceData.timestamp).toLocaleString('en-US')));
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
      row.push(escapeCSVField(result.priceData.source ?? ''));
    }
    csvLines.push(row.join(','));
  });

  const csvContent = csvLines.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, generateFilename(selectedSymbol, 'csv'));
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
  downloadBlob(blob, generateFilename(selectedSymbol, 'json'));
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
  doc.text('Price Query Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text(`Generated at: ${new Date().toLocaleString('en-US')}`, 14, 28);

  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('Query Parameters', 14, 40);

  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  let yPos = 48;
  doc.text(`Symbol: ${selectedSymbol}`, 14, yPos);
  yPos += 6;
  doc.text(`Oracles: ${selectedOracles.map((o) => providerNames[o]).join(', ')}`, 14, yPos);
  yPos += 6;
  doc.text(`Chains: ${selectedChains.map((c) => chainNames[c]).join(', ')}`, 14, yPos);
  yPos += 6;
  doc.text(`Time Range: ${selectedTimeRange} hours`, 14, yPos);

  yPos += 12;

  if (config.includeStats) {
    doc.setFontSize(12);
    doc.setTextColor(primaryColor);
    doc.text('Statistics Summary', 14, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor);

    const statsData = [
      ['Average Price', formatPrice(stats.avgPrice)],
      ['Max Price', formatPrice(stats.maxPrice)],
      ['Min Price', formatPrice(stats.minPrice)],
      ['Price Range', formatPrice(stats.priceRange)],
      ['Std Deviation', `${stats.standardDeviationPercent.toFixed(4)}%`],
      ['Data Points', stats.dataPoints.toString()],
    ];

    if (stats.avgChange24hPercent !== undefined) {
      statsData.push([
        '24h Change',
        `${stats.avgChange24hPercent >= 0 ? '+' : ''}${stats.avgChange24hPercent.toFixed(2)}%`,
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Indicator', 'Value']],
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
      doc.text('Price Chart', 14, yPos);

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
  doc.text('Price Data', 14, yPos);

  const tableHeaders: string[] = [];
  if (enabledFields.find((f) => f.key === 'oracle')) tableHeaders.push('Oracle');
  if (enabledFields.find((f) => f.key === 'blockchain')) tableHeaders.push('Blockchain');
  if (enabledFields.find((f) => f.key === 'price')) tableHeaders.push('Price');
  if (enabledFields.find((f) => f.key === 'timestamp')) tableHeaders.push('Timestamp');
  if (enabledFields.find((f) => f.key === 'change24h')) tableHeaders.push('24h Change');
  if (enabledFields.find((f) => f.key === 'confidence')) tableHeaders.push('Confidence');
  if (enabledFields.find((f) => f.key === 'source')) tableHeaders.push('Source');

  const tableBody = filteredResults.map((result) => {
    const row: string[] = [];
    if (enabledFields.find((f) => f.key === 'oracle')) {
      row.push(providerNames[result.provider]);
    }
    if (enabledFields.find((f) => f.key === 'blockchain')) {
      row.push(chainNames[result.chain]);
    }
    if (enabledFields.find((f) => f.key === 'price')) {
      row.push(formatPrice(result.priceData.price));
    }
    if (enabledFields.find((f) => f.key === 'timestamp')) {
      row.push(new Date(result.priceData.timestamp).toLocaleString('en-US'));
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
