'use client';

import React, { useMemo, useState, useCallback, useEffect, memo } from 'react';

import { DataTablePro, type ColumnDef, type SortConfig } from '@/components/ui';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import {
  oracleNames,
  getDeviationColorClass,
  getDeviationBgClass,
  getFreshnessInfo,
  getFreshnessDotColor,
  calculateZScore,
  isOutlier,
} from '../constants';

interface PriceTableProps {
  priceData: PriceData[];
  filteredPriceData: PriceData[];
  isLoading: boolean;
  sortColumn: 'price' | 'timestamp' | null;
  sortDirection: 'asc' | 'desc';
  expandedRow: number | null;
  selectedRowIndex: number | null;
  hoveredRowIndex: number | null;
  chartColors: Record<OracleProvider, string>;
  avgPrice: number;
  standardDeviation: number;
  validPrices: number[];
  onSort: (column: 'price' | 'timestamp' | null) => void;
  onExpandRow: (index: number | null) => void;
  onSetHoveredRow: (index: number | null) => void;

  onHoverOracle?: (oracle: OracleProvider | null) => void;
  t: (key: string) => string;
}

// Extended price data with computed fields for table
interface PriceTableRow extends Record<string, unknown> {
  provider: OracleProvider;
  price: number;
  deviation: number | null;
  confidence: number | null;
  source: string;
  freshness: string;
  freshnessSeconds: number;
  timestamp: number;
  zScore: number | null;
  isOutlier: boolean;
  isHighest: boolean;
  isLowest: boolean;
  originalIndex: number;
}

// Custom comparison function for PriceTable props
function arePropsEqual(prevProps: PriceTableProps, nextProps: PriceTableProps): boolean {
  // Compare primitive props
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.sortColumn !== nextProps.sortColumn) return false;
  if (prevProps.sortDirection !== nextProps.sortDirection) return false;
  if (prevProps.expandedRow !== nextProps.expandedRow) return false;
  if (prevProps.selectedRowIndex !== nextProps.selectedRowIndex) return false;
  if (prevProps.hoveredRowIndex !== nextProps.hoveredRowIndex) return false;
  if (prevProps.avgPrice !== nextProps.avgPrice) return false;
  if (prevProps.standardDeviation !== nextProps.standardDeviation) return false;
  if (prevProps.onSort !== nextProps.onSort) return false;
  if (prevProps.onExpandRow !== nextProps.onExpandRow) return false;
  if (prevProps.onSetHoveredRow !== nextProps.onSetHoveredRow) return false;
  if (prevProps.onHoverOracle !== nextProps.onHoverOracle) return false;
  if (prevProps.t !== nextProps.t) return false;

  // Compare arrays by length and reference (shallow check)
  if (prevProps.priceData.length !== nextProps.priceData.length) return false;
  if (prevProps.filteredPriceData.length !== nextProps.filteredPriceData.length) return false;
  if (prevProps.validPrices.length !== nextProps.validPrices.length) return false;

  // Compare chartColors by reference
  if (prevProps.chartColors !== nextProps.chartColors) return false;

  return true;
}

function PriceTableComponent({
  filteredPriceData,
  isLoading,
  sortColumn: _sortColumn,
  sortDirection: _sortDirection,
  expandedRow,
  selectedRowIndex,
  hoveredRowIndex,
  chartColors,
  avgPrice,
  standardDeviation,
  validPrices,
  onSort,
  onExpandRow,
  onSetHoveredRow,
  onHoverOracle,
  t,
}: PriceTableProps) {
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(expandedRow);
  const [hoveredRow, setHoveredRow] = useState<number | null>(hoveredRowIndex);

  // Sync external expandedRow with internal state
  useEffect(() => {
    setExpandedRowIndex(expandedRow);
  }, [expandedRow]);

  // Sync external hoveredRowIndex with internal state
  useEffect(() => {
    setHoveredRow(hoveredRowIndex);
    if (hoveredRowIndex !== null) {
      onSetHoveredRow(hoveredRowIndex);
    }
  }, [hoveredRowIndex, onSetHoveredRow]);

  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  // Transform data for DataTablePro
  const tableData: PriceTableRow[] = useMemo(() => {
    return filteredPriceData.map((data, index) => {
      let deviationPercent: number | null = null;
      if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
        deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
      }
      const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
      const outlier = isOutlier(zScore);
      const freshness = getFreshnessInfo(data.timestamp);
      const isHighest = data.price === maxPrice && maxPrice !== minPrice;
      const isLowest = data.price === minPrice && maxPrice !== minPrice;

      return {
        provider: data.provider,
        price: data.price,
        deviation: deviationPercent,
        confidence: data.confidence ?? null,
        source: data.source || '-',
        freshness: freshness.text,
        freshnessSeconds: freshness.seconds,
        timestamp: data.timestamp,
        zScore,
        isOutlier: outlier,
        isHighest,
        isLowest,
        originalIndex: index,
      };
    });
  }, [filteredPriceData, validPrices, avgPrice, standardDeviation, maxPrice, minPrice]);

  // Handle row click for expand
  const handleRowClick = useCallback(
    (row: PriceTableRow, index: number) => {
      const isExpanded = expandedRowIndex === index;
      setExpandedRowIndex(isExpanded ? null : index);
      onExpandRow(isExpanded ? null : index);
    },
    [expandedRowIndex, onExpandRow]
  );

  // Handle sort
  const handleSort = useCallback(
    (sortConfig: SortConfig[]) => {
      if (sortConfig.length === 0) {
        onSort(null);
      } else {
        const firstSort = sortConfig[0];
        if (firstSort.key === 'price' || firstSort.key === 'timestamp') {
          onSort(firstSort.key);
        }
      }
    },
    [onSort]
  );

  // Define columns
  const columns: ColumnDef<PriceTableRow>[] = useMemo(() => {
    const baseColumns: ColumnDef<PriceTableRow>[] = [
      {
        key: 'provider',
        header: t('crossOracle.oracle'),
        width: 180,
        minWidth: 150,
        align: 'left',
        sortable: true,
        fixed: 'left',
        formatter: (value, row) => {
          const provider = value as OracleProvider;
          return (
            <div className="flex items-center gap-2">
              {row.isHighest && (
                <span className="text-xs font-medium text-danger-600 bg-danger-100 px-1 py-0.5 rounded">
                  {t('crossOracle.priceTable.highest')}
                </span>
              )}
              {row.isLowest && (
                <span className="text-xs font-medium text-success-600 bg-success-100 px-1 py-0.5 rounded">
                  {t('crossOracle.priceTable.lowest')}
                </span>
              )}
              <span
                className="w-2 h-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: chartColors[provider] }}
              />
              <span className="font-medium text-gray-900">{oracleNames[provider]}</span>
              {row.isOutlier && (
                <span className="text-amber-600 text-xs font-medium bg-amber-100 px-1 py-0.5 rounded">
                  {t('crossOracle.outlier')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'price',
        header: t('crossOracle.price'),
        width: 140,
        minWidth: 120,
        align: 'right',
        sortable: true,
        fixed: 'left',
        formatter: (value, row) => {
          const price = value as number;
          const deviation = row.deviation;
          const barWidth = deviation !== null ? Math.min(Math.abs(deviation) * 10, 100) : 0;

          return (
            <div className="relative">
              <div
                className={`absolute inset-0 transition-all ${
                  deviation !== null && deviation > 0
                    ? 'bg-danger-200'
                    : deviation !== null && deviation < 0
                      ? 'bg-success-200'
                      : ''
                }`}
                style={{
                  width: `${barWidth}%`,
                  right: 0,
                  left: 'auto',
                  opacity: 0.3,
                }}
              />
              <span
                className={`relative font-mono ${row.isOutlier ? 'text-amber-700' : 'text-gray-900'}`}
              >
                $
                {price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          );
        },
      },
    ];

    // Only show deviation column if we have valid comparison data
    if (validPrices.length > 1 && avgPrice > 0) {
      baseColumns.push({
        key: 'deviation',
        header: t('crossOracle.deviation'),
        width: 120,
        minWidth: 100,
        align: 'right',
        sortable: true,
        formatter: (value) => {
          const deviation = value as number | null;
          if (deviation === null) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${getDeviationColorClass(deviation)}`}
            >
              <span className={`w-1.5 h-1.5 mr-1 rounded-full ${getDeviationBgClass(deviation)}`} />
              {deviation >= 0 ? '+' : ''}
              {deviation.toFixed(3)}%
            </span>
          );
        },
        conditionalFormat: {
          rules: [
            { condition: 'gte', value: 1, style: 'danger' },
            { condition: 'lte', value: -1, style: 'danger' },
            { condition: 'between', value: [0.5, 1], style: 'warning' },
            { condition: 'between', value: [-1, -0.5], style: 'warning' },
          ],
        },
      });
    }

    baseColumns.push(
      {
        key: 'confidence',
        header: t('crossOracle.confidence'),
        width: 100,
        minWidth: 80,
        align: 'right',
        formatter: (value) => {
          const confidence = value as number | null;
          if (confidence === null) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-gray-700">{(confidence * 100).toFixed(1)}%</span>
              <div className="w-12 h-1 bg-gray-200 overflow-hidden rounded-full">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'source',
        header: t('crossOracle.source'),
        width: 120,
        minWidth: 100,
        align: 'right',
        formatter: (value) => {
          const source = value as string;
          return <span className="text-gray-600">{source}</span>;
        },
      },
      {
        key: 'freshness',
        header: t('crossOracle.freshness'),
        width: 120,
        minWidth: 100,
        align: 'right',
        sortable: true,
        formatter: (value, row) => {
          const freshness = value as string;
          const seconds = row.freshnessSeconds as number;
          return (
            <div className="flex items-center justify-end gap-2">
              <span className={`w-2 h-2 rounded-full ${getFreshnessDotColor(seconds)}`} />
              <span className="text-gray-700">{freshness}</span>
            </div>
          );
        },
      }
    );

    return baseColumns;
  }, [t, chartColors, validPrices.length, avgPrice]);

  // Fixed columns configuration
  const fixedColumns = useMemo(
    () => ({
      left: ['provider', 'price'],
    }),
    []
  );

  // Render expanded row details
  const renderExpandedRow = (row: PriceTableRow) => {
    const deviation = row.deviation;
    const zScore = row.zScore;
    const outlier = row.isOutlier;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm py-2">
        <div>
          <span className="text-gray-500 block text-xs">{t('crossOracle.oracle')}</span>
          <span className="font-medium text-gray-900">{oracleNames[row.provider]}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">{t('crossOracle.price')}</span>
          <span className="font-mono text-gray-900">
            $
            {row.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">
            {t('crossOracle.priceTable.deviationRate')}
          </span>
          <span className={`font-medium ${getDeviationColorClass(deviation).split(' ')[0]}`}>
            {deviation !== null ? `${deviation >= 0 ? '+' : ''}${deviation.toFixed(4)}%` : '-'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">{t('crossOracle.confidence')}</span>
          <span className="text-gray-900">
            {row.confidence ? `${(row.confidence * 100).toFixed(1)}%` : '-'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">{t('crossOracle.source')}</span>
          <span className="text-gray-900">{row.source}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">
            {t('crossOracle.priceTable.updateTime')}
          </span>
          <span className="text-gray-900">{new Date(row.timestamp).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Z-Score</span>
          <span
            className={`font-medium ${zScore !== null && Math.abs(zScore) > 2 ? 'text-amber-600' : 'text-gray-900'}`}
          >
            {zScore !== null ? zScore.toFixed(3) : '-'}
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">{t('crossOracle.priceTable.status')}</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${outlier ? 'bg-amber-100 text-amber-700' : 'bg-success-100 text-success-700'}`}
          >
            {outlier ? t('crossOracle.priceTable.outlier') : t('crossOracle.priceTable.normal')}
          </span>
        </div>
      </div>
    );
  };

  // Render hover tooltip
  const renderTooltip = (row: PriceTableRow) => {
    const deviation = row.deviation;
    const zScore = row.zScore;
    const outlier = row.isOutlier;

    return (
      <div className="bg-white border border-gray-200 p-3 min-w-[200px] rounded-lg shadow-lg">
        <div className="text-sm font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-100">
          {oracleNames[row.provider]}
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossOracle.price')}</span>
            <span className="font-mono text-gray-900">
              $
              {row.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossOracle.deviation')}</span>
            <span
              className={`font-medium ${deviation !== null && deviation >= 0 ? 'text-danger-600' : 'text-success-600'}`}
            >
              {deviation !== null ? `${deviation >= 0 ? '+' : ''}${deviation.toFixed(4)}%` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossOracle.confidence')}</span>
            <span className="text-gray-900">
              {row.confidence ? `${(row.confidence * 100).toFixed(1)}%` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Z-Score</span>
            <span
              className={`font-medium ${zScore !== null && Math.abs(zScore) > 2 ? 'text-amber-600' : 'text-gray-900'}`}
            >
              {zScore !== null ? zScore.toFixed(3) : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossOracle.priceTable.status')}</span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${outlier ? 'bg-amber-100 text-amber-700' : 'bg-success-100 text-success-700'}`}
            >
              {outlier ? t('crossOracle.priceTable.outlier') : t('crossOracle.priceTable.normal')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <DataTablePro
        data={tableData}
        columns={columns}
        fixedColumns={fixedColumns}
        density="compact"
        loading={isLoading}
        onSort={handleSort}
        onRowClick={handleRowClick}
        emptyText={t('crossOracle.noData')}
        className="rounded-lg"
      />

      {/* Custom row hover tooltip */}
      {hoveredRow !== null && hoveredRow !== selectedRowIndex && tableData[hoveredRow] && (
        <div className="absolute right-0 top-0 z-50 transform -translate-x-4 translate-y-2">
          {renderTooltip(tableData[hoveredRow])}
        </div>
      )}

      {/* Expanded row details */}
      {expandedRowIndex !== null && tableData[expandedRowIndex] && (
        <div className="border-t border-gray-100 bg-gray-50 px-4">
          {renderExpandedRow(tableData[expandedRowIndex])}
        </div>
      )}
    </div>
  );
}

// Export memoized component
export const PriceTable = memo(PriceTableComponent, arePropsEqual);
