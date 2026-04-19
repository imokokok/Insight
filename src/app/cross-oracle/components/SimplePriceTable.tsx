'use client';

import { useMemo, useState, useEffect, memo, Fragment } from 'react';

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Clock,
  Database,
  Wifi,
  ArrowUpDown,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

import { chartColors } from '@/lib/config/colors';
import { oracleColors } from '@/lib/constants';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { formatPrice, formatRelativeTime } from '@/lib/utils/format';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames, calculateZScore, ANOMALY_ZSCORE_THRESHOLD } from '../constants';
import { ANOMALY_DEVIATION_THRESHOLD, DEVIATION_THRESHOLDS } from '../thresholds';

import { ConfidenceBar } from './price-comparison/ConfidenceBar';

import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

export type AnomalyDetectionMode = 'deviation' | 'zscore';

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
}

type SortColumn = 'price' | 'deviation' | 'confidence' | 'latency' | 'updateTime';
type SortDirection = 'asc' | 'desc';

interface TableRow {
  provider: OracleProvider;
  price: number;
  deviation: number;
  deviationPercent: number;
  status: 'normal' | 'warning' | 'critical';
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | null;
  confidence: number;
  latency: number;
  dataSources: number;
  updateTime: number;
  zScore: number | null;
  freshnessSeconds: number;
  priceDiff: number | null;
}

const formatDeviation = (deviation: number): string => {
  const sign = deviation >= 0 ? '+' : '';
  return `${sign}${deviation.toFixed(3)}%`;
};

const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'text-emerald-600';
  if (absDeviation < 0.5) return 'text-yellow-600';
  if (absDeviation < 1.0) return 'text-orange-600';
  return 'text-red-600';
};

const getDeviationBgColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-50 border-emerald-200';
  if (absDeviation < 0.5) return 'bg-yellow-50 border-yellow-200';
  if (absDeviation < 1.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

const StatusIcon = ({ status, severity }: { status: string; severity: string | null }) => {
  if (status === 'normal') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
  if (severity === 'high') {
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
  if (severity === 'medium') {
    return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  }
  return <Activity className="w-4 h-4 text-yellow-500" />;
};

const formatLatency = (latency: number): string => {
  if (latency < 1000) return `${latency}ms`;
  return `${(latency / 1000).toFixed(1)}s`;
};

const SortIcon = ({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) => {
  if (sortColumn !== column) {
    return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
  }
  return sortDirection === 'asc' ? (
    <TrendingUp className="w-3 h-3 text-blue-500" />
  ) : (
    <TrendingDown className="w-3 h-3 text-blue-500" />
  );
};

function getAnomalyReason(row: TableRow): string {
  const reasons: string[] = [];
  if (Math.abs(row.deviationPercent) > 1) {
    reasons.push('Large deviation');
  }
  if (row.freshnessSeconds > 60) {
    reasons.push('Data delay');
  }
  if (row.zScore !== null && Math.abs(row.zScore) > ANOMALY_ZSCORE_THRESHOLD) {
    reasons.push('Outlier');
  }
  return reasons.length > 0 ? reasons.join(', ') : 'Unknown reason';
}

function ExpandedRowDetail({ row }: { row: TableRow }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm py-3 px-2">
      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Raw Price</span>
        <span className="font-mono text-gray-900 text-lg">{formatPrice(row.price)}</span>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Price Diff</span>
        <div className="flex flex-col">
          <span
            className={`font-mono text-lg ${
              row.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {row.deviationPercent >= 0 ? '+' : ''}
            {row.deviationPercent.toFixed(4)}%
          </span>
          {row.priceDiff !== null && (
            <span className="text-xs text-gray-500">
              {row.priceDiff >= 0 ? '+' : ''}$
              {Math.abs(row.priceDiff).toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Data Delay</span>
        <span
          className={`font-medium ${
            row.freshnessSeconds < 30
              ? 'text-green-600'
              : row.freshnessSeconds < 60
                ? 'text-yellow-600'
                : 'text-red-600'
          }`}
        >
          {formatRelativeTime(row.updateTime)}
        </span>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Status</span>
        {row.isAnomaly ? (
          <div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                row.severity === 'high'
                  ? 'text-red-600 bg-red-100'
                  : row.severity === 'medium'
                    ? 'text-orange-600 bg-orange-100'
                    : 'text-yellow-600 bg-yellow-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Anomaly
            </span>
            <p className="text-xs text-gray-500 mt-1">Possible reasons: {getAnomalyReason(row)}</p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded text-green-600 bg-green-100">
            <CheckCircle2 className="w-3 h-3" />
            Normal
          </span>
        )}
      </div>
    </div>
  );
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

  const tableRows: TableRow[] = useMemo(() => {
    if (!priceData.length || medianPrice === 0) return [];

    return priceData.map((data) => {
      const deviation = data.price - medianPrice;
      const deviationPercent = (deviation / medianPrice) * 100;
      const absDeviation = Math.abs(deviationPercent);

      const anomaly = anomalies.find((a) => a.provider === data.provider);

      let isAnomaly: boolean;
      let severity: 'low' | 'medium' | 'high' | null;

      if (anomalyDetectionMode === 'zscore' && standardDeviation > 0) {
        const zScore = calculateZScore(data.price, avgPrice, standardDeviation);
        const absZScore = Math.abs(zScore);
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
      if (absDeviation >= DEVIATION_THRESHOLDS.critical) status = 'critical';
      else if (absDeviation >= DEVIATION_THRESHOLDS.warning) status = 'warning';

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

      const providerDefaults = getProviderDefaults(data.provider);
      const latency = providerDefaults.responseTime;
      const dataSources = providerDefaults.dataSources;
      const updateTime = data.timestamp || 0;
      const freshnessSeconds =
        updateTime > 0 ? Math.max(0, Math.floor((now - updateTime) / 1000)) : 0;

      const zScore =
        anomalyDetectionMode === 'zscore' && standardDeviation > 0
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
        latency,
        dataSources,
        updateTime,
        zScore,
        freshnessSeconds,
        priceDiff,
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
        case 'latency':
          comparison = a.latency - b.latency;
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
                onClick={() => handleSort('latency')}
                title="Estimated latency based on historical data"
              >
                <div className="flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Latency (Estimated)
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                  <SortIcon
                    column="latency"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                title="Estimated data sources based on official documentation"
              >
                <div className="flex items-center justify-center gap-1">
                  <Database className="w-3 h-3" />
                  Sources (Estimated)
                  <HelpCircle className="w-3 h-3 text-gray-400" />
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
                    <span
                      className={`text-xs font-medium ${
                        row.latency < 200
                          ? 'text-emerald-600'
                          : row.latency < 500
                            ? 'text-yellow-600'
                            : 'text-orange-600'
                      }`}
                      title="Estimated latency based on historical data"
                    >
                      {formatLatency(row.latency)}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className="text-xs text-gray-600"
                      title="Estimated data sources based on official documentation"
                    >
                      {row.dataSources}
                    </span>
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

                {expandedRow === row.provider && (
                  <tr>
                    <td colSpan={9} className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <ExpandedRowDetail row={row} />
                    </td>
                  </tr>
                )}
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
