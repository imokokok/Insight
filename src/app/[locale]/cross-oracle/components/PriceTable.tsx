'use client';

import { useMemo, useState, useCallback, useEffect, memo } from 'react';

import { DataTablePro, type ColumnDef, type SortConfig } from '@/components/ui';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import {
  oracleNames,
  getDeviationBgClass,
  getFreshnessInfo,
  getFreshnessDotColor,
  calculateZScore,
  isOutlier,
  ANOMALY_THRESHOLD,
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
  source: string;
  freshness: string;
  freshnessSeconds: number;
  timestamp: number;
  zScore: number | null;
  isOutlier: boolean;
  isHighest: boolean;
  isLowest: boolean;
  originalIndex: number;
  /** 是否为异常价格 */
  isAnomaly: boolean;
  /** 异常严重程度 */
  anomalySeverity: 'low' | 'medium' | 'high' | null;
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

// 根据偏差率获取颜色标识
function getDeviationRateColorClass(deviation: number | null): string {
  if (deviation === null) return 'text-gray-400';
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) {
    return 'text-green-600 bg-green-50 border border-green-200';
  } else if (absDeviation < 0.5) {
    return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
  } else if (absDeviation < 1.0) {
    return 'text-orange-600 bg-orange-50 border border-orange-200';
  } else {
    return 'text-red-600 bg-red-50 border border-red-200';
  }
}

// 获取异常行的背景色 - 用于单元格
function getAnomalyCellBgClass(severity: 'low' | 'medium' | 'high' | null): string {
  if (!severity) return '';
  switch (severity) {
    case 'high':
      return 'bg-red-50/50';
    case 'medium':
      return 'bg-orange-50/50';
    case 'low':
      return 'bg-yellow-50/50';
    default:
      return '';
  }
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

      // 检测是否为异常价格
      const isAnomaly =
        deviationPercent !== null && Math.abs(deviationPercent) >= ANOMALY_THRESHOLD;
      // 确定异常严重程度
      let anomalySeverity: 'low' | 'medium' | 'high' | null = null;
      if (isAnomaly && deviationPercent !== null) {
        const absDeviation = Math.abs(deviationPercent);
        if (absDeviation > 3) {
          anomalySeverity = 'high';
        } else if (absDeviation >= 1) {
          anomalySeverity = 'medium';
        } else {
          anomalySeverity = 'low';
        }
      }

      return {
        provider: data.provider,
        price: data.price,
        deviation: deviationPercent,
        source: data.source || '-',
        freshness: freshness.text,
        freshnessSeconds: freshness.seconds,
        timestamp: data.timestamp,
        zScore,
        isOutlier: outlier,
        isHighest,
        isLowest,
        originalIndex: index,
        isAnomaly,
        anomalySeverity,
      };
    });
  }, [filteredPriceData, validPrices, avgPrice, standardDeviation, maxPrice, minPrice]);

  // Handle row click for expand
  const handleRowClick = useCallback(
    (_row: PriceTableRow, index: number) => {
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

  // Define columns - 简化后的列
  const columns: ColumnDef<PriceTableRow>[] = useMemo(() => {
    const baseColumns: ColumnDef<PriceTableRow>[] = [
      {
        key: 'provider',
        header: t('crossOracle.oracle'),
        width: 200,
        minWidth: 160,
        align: 'left',
        sortable: true,
        fixed: 'left',
        formatter: (value, row) => {
          const provider = value as OracleProvider;
          const bgClass = getAnomalyCellBgClass(row.anomalySeverity);
          return (
            <div className={`flex items-center gap-2 ${bgClass} px-2 py-1 rounded`}>
              <span
                className="w-2 h-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: chartColors[provider] }}
              />
              <span className="font-medium text-gray-900">{oracleNames[provider]}</span>
              {row.isAnomaly && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                    row.anomalySeverity === 'high'
                      ? 'text-red-600 bg-red-100'
                      : row.anomalySeverity === 'medium'
                        ? 'text-orange-600 bg-orange-100'
                        : 'text-yellow-600 bg-yellow-100'
                  }`}
                  title={`价格异常：偏差 ${row.deviation?.toFixed(2)}%`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  异常
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
          const bgClass = getAnomalyCellBgClass(row.anomalySeverity);

          return (
            <span
              className={`font-mono ${bgClass} px-2 py-1 rounded ${
                row.isAnomaly
                  ? row.anomalySeverity === 'high'
                    ? 'text-red-700'
                    : row.anomalySeverity === 'medium'
                      ? 'text-orange-700'
                      : 'text-yellow-700'
                  : 'text-gray-900'
              }`}
            >
              $
              {price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          );
        },
      },
    ];

    // 偏差率列 - 带颜色标识
    if (validPrices.length > 1 && avgPrice > 0) {
      baseColumns.push({
        key: 'deviation',
        header: t('crossOracle.deviation'),
        width: 140,
        minWidth: 120,
        align: 'right',
        sortable: true,
        formatter: (value, row) => {
          const deviation = value as number | null;
          const bgClass = getAnomalyCellBgClass(row.anomalySeverity);
          if (deviation === null) {
            return <span className={`text-gray-400 ${bgClass} px-2 py-1 rounded`}>-</span>;
          }

          const colorClass = getDeviationRateColorClass(deviation);

          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${colorClass} ${bgClass}`}
            >
              <span
                className={`w-1.5 h-1.5 mr-1.5 rounded-full ${getDeviationBgClass(deviation)}`}
              />
              {deviation >= 0 ? '+' : ''}
              {deviation.toFixed(3)}%
            </span>
          );
        },
      });
    }

    // 更新时间列 - 带新鲜度指示
    baseColumns.push({
      key: 'freshness',
      header: t('crossOracle.freshness'),
      width: 140,
      minWidth: 120,
      align: 'right',
      sortable: true,
      formatter: (value, row) => {
        const freshness = value as string;
        const seconds = row.freshnessSeconds as number;
        const bgClass = getAnomalyCellBgClass(row.anomalySeverity);
        return (
          <div className={`flex items-center justify-end gap-2 ${bgClass} px-2 py-1 rounded`}>
            <span className={`w-2 h-2 rounded-full ${getFreshnessDotColor(seconds)}`} />
            <span className="text-gray-700">{freshness}</span>
          </div>
        );
      },
    });

    // 操作列 - 展开详情
    baseColumns.push({
      key: 'action',
      header: t('crossOracle.action'),
      width: 80,
      minWidth: 60,
      align: 'center',
      formatter: (_value, row) => {
        const isExpanded = expandedRowIndex === row.originalIndex;
        const bgClass = getAnomalyCellBgClass(row.anomalySeverity);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(row, row.originalIndex);
            }}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${bgClass}`}
            title={isExpanded ? '收起详情' : '展开详情'}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        );
      },
    });

    return baseColumns;
  }, [t, chartColors, validPrices.length, avgPrice, expandedRowIndex, handleRowClick]);

  // Fixed columns configuration
  const fixedColumns = useMemo(
    () => ({
      left: ['provider', 'price'],
    }),
    []
  );

  // 获取异常可能原因
  const getAnomalyReason = (row: PriceTableRow): string => {
    const reasons: string[] = [];
    if (row.deviation && Math.abs(row.deviation) > 1) {
      reasons.push('价格偏差过大');
    }
    if (row.freshnessSeconds > 60) {
      reasons.push('数据延迟');
    }
    if (row.isOutlier) {
      reasons.push('统计异常值');
    }
    return reasons.length > 0 ? reasons.join('、') : '未知原因';
  };

  // 简化后的展开行详情
  const renderExpandedRow = (row: PriceTableRow) => {
    const deviation = row.deviation;
    const priceDiff = deviation !== null ? (row.price * deviation) / 100 : null;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm py-3 px-2">
        {/* 原始价格数据 */}
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <span className="text-gray-500 block text-xs mb-1">原始价格</span>
          <span className="font-mono text-gray-900 text-lg">
            $
            {row.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </span>
        </div>

        {/* 与均价的差值 */}
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <span className="text-gray-500 block text-xs mb-1">与均价差值</span>
          <div className="flex flex-col">
            <span
              className={`font-mono text-lg ${
                deviation !== null && deviation >= 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {deviation !== null ? `${deviation >= 0 ? '+' : ''}${deviation.toFixed(4)}%` : '-'}
            </span>
            {priceDiff !== null && (
              <span className="text-xs text-gray-500">
                {priceDiff >= 0 ? '+' : ''}$
                {Math.abs(priceDiff).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            )}
          </div>
        </div>

        {/* 数据延迟时间 */}
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <span className="text-gray-500 block text-xs mb-1">数据延迟</span>
          <span
            className={`font-medium ${
              row.freshnessSeconds < 30
                ? 'text-green-600'
                : row.freshnessSeconds < 60
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {row.freshness}
          </span>
        </div>

        {/* 状态/异常原因 */}
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <span className="text-gray-500 block text-xs mb-1">状态</span>
          {row.isAnomaly ? (
            <div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                  row.anomalySeverity === 'high'
                    ? 'text-red-600 bg-red-100'
                    : row.anomalySeverity === 'medium'
                      ? 'text-orange-600 bg-orange-100'
                      : 'text-yellow-600 bg-yellow-100'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                异常
              </span>
              <p className="text-xs text-gray-500 mt-1">可能原因: {getAnomalyReason(row)}</p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded text-green-600 bg-green-100">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              正常
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render hover tooltip
  const renderTooltip = (row: PriceTableRow) => {
    const deviation = row.deviation;

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
              className={`font-medium ${
                deviation !== null && Math.abs(deviation) < 0.1
                  ? 'text-green-600'
                  : deviation !== null && Math.abs(deviation) < 0.5
                    ? 'text-yellow-600'
                    : deviation !== null && Math.abs(deviation) < 1
                      ? 'text-orange-600'
                      : 'text-red-600'
              }`}
            >
              {deviation !== null ? `${deviation >= 0 ? '+' : ''}${deviation.toFixed(4)}%` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossOracle.freshness')}</span>
            <span className="text-gray-900">{row.freshness}</span>
          </div>
          {row.isAnomaly && (
            <div className="pt-1 mt-1 border-t border-gray-100">
              <span className="text-xs text-red-500">⚠️ 价格异常</span>
            </div>
          )}
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
