'use client';

import { useMemo, useState, memo } from 'react';

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
} from 'lucide-react';

import { chartColors } from '@/lib/config/colors';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { formatPrice } from '@/lib/utils/format';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { oracleNames, ANOMALY_ZSCORE_THRESHOLD } from '../constants';

import { ConfidenceBar } from './price-comparison/ConfidenceBar';

import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

interface SimplePriceTableProps {
  priceData: PriceData[];
  anomalies?: PriceAnomaly[];
  medianPrice: number;
  isLoading?: boolean;
  validPrices?: number[];
  statusFilter?: 'all' | 'normal' | 'warning' | 'critical';
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

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
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

function SimplePriceTableComponent({
  priceData,
  anomalies = [],
  medianPrice,
  isLoading = false,
  statusFilter = 'all',
}: SimplePriceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const tableRows: TableRow[] = useMemo(() => {
    if (!priceData.length || medianPrice === 0) return [];

    return priceData.map((data) => {
      const deviation = data.price - medianPrice;
      const deviationPercent = (deviation / medianPrice) * 100;
      const absDeviation = Math.abs(deviationPercent);

      const anomaly = anomalies.find((a) => a.provider === data.provider);
      const isAnomaly = anomaly !== undefined || absDeviation >= ANOMALY_ZSCORE_THRESHOLD;
      const severity =
        anomaly?.severity ||
        (absDeviation >= 3
          ? 'high'
          : absDeviation >= 1
            ? 'medium'
            : absDeviation >= 0.5
              ? 'low'
              : null);

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (absDeviation >= 1) status = 'critical';
      else if (absDeviation >= 0.5) status = 'warning';

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
      };
    });
  }, [priceData, medianPrice, anomalies]);

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
        <p className="text-gray-500">Select a trading pair and oracle to view price data</p>
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
                onClick={() => handleSort('latency')}
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
                title="Estimated latency based on historical data"
              >
                <div className="flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Latency
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
                  Sources
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedRows.map((row) => (
              <tr key={row.provider} className={getRowClassName(row)}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: chartColors.recharts.primary }}
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
                  <span className="text-xs text-gray-500">{formatTimeAgo(row.updateTime)}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {filteredAndSortedRows.length} / {tableRows.length} oracles
          </span>
          <span>{anomalies.length} anomalies detected</span>
        </div>
      </div>
    </div>
  );
}

export const SimplePriceTable = memo(SimplePriceTableComponent);
SimplePriceTable.displayName = 'SimplePriceTable';
