'use client';

import { useMemo, useState, useEffect, memo, Fragment } from 'react';

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Clock,
  ChevronDown,
} from 'lucide-react';

import { chartColors } from '@/lib/config/colors';
import { oracleColors } from '@/lib/constants';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { formatPrice, formatRelativeTime } from '@/lib/utils/format';
import { calculateZScore } from '@/lib/utils/statistics';
import { type PriceData } from '@/types/oracle';

import { oracleNames, ANOMALY_ZSCORE_THRESHOLD } from '../constants';
import {
  ANOMALY_DEVIATION_THRESHOLD,
  DEVIATION_THRESHOLDS,
  getDeviationThresholds,
} from '../thresholds';

import {
  type TableRow,
  type SortColumn,
  type SortDirection,
  formatDeviation,
  getDeviationColor,
  getDeviationBgColor,
  StatusIcon,
  SortIcon,
  ExpandedRowDetail,
} from './ExpandedRowDetail';
import { ConfidenceBar } from './price-comparison/ConfidenceBar';

import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

type AnomalyDetectionMode = 'deviation' | 'zscore';

interface SimplePriceTableProps {
  priceData: PriceData[];
  anomalies?: PriceAnomaly[];
  medianPrice: number;
  isLoading?: boolean;
  validPrices?: number[];
  statusFilter?: 'all' | 'normal' | 'warning' | 'critical';
  anomalyDetectionMode?: AnomalyDetectionMode;
  avgPrice?: number;
  standardDeviation?: number;
  currentTime?: number;
  symbol?: string;
}

function SimplePriceTableComponent({
  priceData,
  anomalies = [],
  medianPrice,
  isLoading = false,
  statusFilter = 'all',
  anomalyDetectionMode = 'deviation',
  avgPrice: avgPriceProp,
  standardDeviation = 0,
  currentTime,
  symbol,
}: SimplePriceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const avgPrice = avgPriceProp ?? medianPrice;
  const [now, setNow] = useState(() => currentTime ?? Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const thresholds = symbol ? getDeviationThresholds(symbol) : DEVIATION_THRESHOLDS;

  const tableRows: TableRow[] = useMemo(() => {
    if (!priceData.length || medianPrice === 0) return [];

    return priceData.map((data) => {
      const deviation = data.price - medianPrice;
      const deviationPercent = (deviation / medianPrice) * 100;
      const absDeviation = Math.abs(deviationPercent);

      const anomaly = anomalies.find((a) => a.provider === data.provider);

      let isAnomaly: boolean;
      let severity: 'low' | 'medium' | 'high' | null;

      if (anomalyDetectionMode === 'zscore' && standardDeviation > 0 && avgPrice > 0) {
        const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
        const absZScore = zScore !== null ? Math.abs(zScore) : 0;
        isAnomaly = absZScore >= ANOMALY_ZSCORE_THRESHOLD;
        severity = isAnomaly
          ? absZScore > 3
            ? 'high'
            : absZScore >= 2.5
              ? 'medium'
              : 'low'
          : null;
      } else {
        isAnomaly = anomaly !== undefined || absDeviation >= ANOMALY_DEVIATION_THRESHOLD;
        severity =
          anomaly?.severity ||
          (absDeviation >= 3
            ? 'high'
            : absDeviation >= 1
              ? 'medium'
              : absDeviation >= 0.5
                ? 'low'
                : null);
      }

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (absDeviation >= thresholds.CRITICAL) status = 'critical';
      else if (absDeviation >= thresholds.WARNING) status = 'warning';

      const confidence = (() => {
        if (data.confidence === undefined || data.confidence === null) {
          const providerDefaults = getProviderDefaults(data.provider);
          return Math.round(providerDefaults.reliability);
        }
        if (data.confidence <= 1) {
          return Math.round(data.confidence * 100);
        }
        return Math.min(100, Math.max(0, data.confidence));
      })();

      const updateTime = data.timestamp || 0;
      const freshnessSeconds =
        updateTime > 0 ? Math.max(0, Math.floor((now - updateTime) / 1000)) : -1;

      const zScore =
        anomalyDetectionMode === 'zscore' && standardDeviation > 0 && avgPrice > 0
          ? calculateZScore(data.price, avgPrice, standardDeviation)
          : null;

      const priceDiff = deviation;

      return {
        provider: data.provider,
        price: data.price,
        deviation,
        deviationPercent,
        status,
        isAnomaly,
        severity,
        confidence,
        updateTime,
        zScore,
        freshnessSeconds,
        priceDiff,
        verification: data.verification,
      };
    });
  }, [priceData, medianPrice, anomalies, anomalyDetectionMode, avgPrice, standardDeviation, now]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = tableRows;
    if (statusFilter !== 'all') {
      filtered = tableRows.filter((row) => row.status === statusFilter);
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'deviation':
          comparison = Math.abs(a.deviationPercent) - Math.abs(b.deviationPercent);
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'updateTime':
          comparison = a.updateTime - b.updateTime;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tableRows, statusFilter, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleToggleExpand = (provider: string) => {
    setExpandedRow((prev) => (prev === provider ? null : provider));
  };

  const getRowClassName = (row: TableRow): string => {
    const baseClass = 'transition-colors duration-200 hover:bg-gray-50';
    if (row.severity === 'high') return `${baseClass} bg-red-50/70`;
    if (row.severity === 'medium') return `${baseClass} bg-orange-50/50`;
    if (row.severity === 'low') return `${baseClass} bg-yellow-50/30`;
    return baseClass;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!priceData.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data</h3>
        <p className="text-gray-500">Select a trading pair and an oracle to view price data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Oracle
              </th>

              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Price
                  <SortIcon column="price" sortColumn={sortColumn} sortDirection={sortDirection} />
                </div>
              </th>

              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('deviation')}
              >
                <div className="flex items-center justify-end gap-1">
                  Deviation
                  <SortIcon
                    column="deviation"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center justify-center gap-1">
                  Confidence
                  <SortIcon
                    column="confidence"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updateTime')}
              >
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated
                  <SortIcon
                    column="updateTime"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Verified
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                <ChevronDown className="w-3 h-3 text-gray-400 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedRows.map((row) => (
              <Fragment key={row.provider}>
                <tr className={getRowClassName(row)}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            oracleColors[row.provider] || chartColors.recharts.primary,
                        }}
                      />
                      <span className="font-medium text-gray-900 text-sm">
                        {oracleNames[row.provider] || row.provider}
                      </span>
                      {row.isAnomaly && row.severity === 'high' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-red-600 bg-red-100">
                          <AlertTriangle className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      className={`font-mono font-medium text-sm ${
                        row.severity === 'high'
                          ? 'text-red-700'
                          : row.severity === 'medium'
                            ? 'text-orange-700'
                            : 'text-gray-900'
                      }`}
                    >
                      {formatPrice(row.price)}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getDeviationBgColor(
                        row.deviationPercent
                      )} ${getDeviationColor(row.deviationPercent)}`}
                    >
                      {row.deviationPercent > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : row.deviationPercent < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {formatDeviation(row.deviationPercent)}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-24 mx-auto">
                      <ConfidenceBar confidence={row.confidence} showLabel={false} size="sm" />
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(row.updateTime)}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusIcon status={row.status} severity={row.severity} />
                      <span
                        className={`text-xs font-medium ${
                          row.status === 'normal'
                            ? 'text-emerald-600'
                            : row.status === 'warning'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {row.status === 'normal'
                          ? 'Normal'
                          : row.status === 'warning'
                            ? 'Warning'
                            : 'Critical'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {row.verification?.explorerUrl ? (
                      <a
                        href={row.verification.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Link
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleToggleExpand(row.provider)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={expandedRow === row.provider ? 'Collapse details' : 'Expand details'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedRow === row.provider ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </td>
                </tr>

                <tr
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: expandedRow === row.provider ? '500px' : '0',
                    opacity: expandedRow === row.provider ? 1 : 0,
                    display: expandedRow === row.provider ? 'table-row' : 'none',
                  }}
                >
                  <td colSpan={8} className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <ExpandedRowDetail row={row} />
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {filteredAndSortedRows.length} / {tableRows.length} oracles
          </span>
          <div className="flex items-center gap-3">
            {anomalyDetectionMode === 'zscore' && (
              <span className="text-blue-500">Z-score mode</span>
            )}
            <span>{anomalies.length} anomalies detected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SimplePriceTable = memo(SimplePriceTableComponent);
SimplePriceTable.displayName = 'SimplePriceTable';
