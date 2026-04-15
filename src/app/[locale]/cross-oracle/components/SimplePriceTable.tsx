'use client';

/**
 * @fileoverview 专业价格对比表格组件
 * @description 包含置信度、延迟、数据源数量、更新时间等专业字段
 */

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
  t: (key: string, params?: Record<string, string | number>) => string;
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

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化偏差率
 */
const formatDeviation = (deviation: number): string => {
  const sign = deviation >= 0 ? '+' : '';
  return `${sign}${deviation.toFixed(3)}%`;
};

/**
 * 获取偏差率颜色
 */
const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'text-emerald-600';
  if (absDeviation < 0.5) return 'text-yellow-600';
  if (absDeviation < 1.0) return 'text-orange-600';
  return 'text-red-600';
};

/**
 * 获取偏差率背景色
 */
const getDeviationBgColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-50 border-emerald-200';
  if (absDeviation < 0.5) return 'bg-yellow-50 border-yellow-200';
  if (absDeviation < 1.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

/**
 * 获取状态图标
 */
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

/**
 * 格式化延迟
 */
const formatLatency = (latency: number): string => {
  if (latency < 1000) return `${latency}ms`;
  return `${(latency / 1000).toFixed(1)}s`;
};

/**
 * 格式化时间
 */
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

/**
 * 获取排序图标
 */
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

// ============================================================================
// 主组件：专业价格表格
// ============================================================================

function SimplePriceTableComponent({
  priceData,
  anomalies = [],
  medianPrice,
  isLoading = false,
  statusFilter = 'all',
  t,
}: SimplePriceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 处理表格数据
  const tableRows: TableRow[] = useMemo(() => {
    if (!priceData.length || medianPrice === 0) return [];

    return priceData.map((data) => {
      const deviation = data.price - medianPrice;
      const deviationPercent = (deviation / medianPrice) * 100;
      const absDeviation = Math.abs(deviationPercent);

      // 检查是否为异常
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

      // 确定状态
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (absDeviation >= 1) status = 'critical';
      else if (absDeviation >= 0.5) status = 'warning';

      // 处理置信度 - 统一转换为 0-100 格式
      const confidence = (() => {
        if (data.confidence === undefined || data.confidence === null) {
          // 使用配置的可靠性作为 fallback，而非随机数
          const providerDefaults = getProviderDefaults(data.provider);
          return Math.round(providerDefaults.reliability);
        }
        // 统一转换为 0-100 格式（如果是 0-1 的小数则乘以 100）
        if (data.confidence <= 1) {
          return Math.round(data.confidence * 100);
        }
        return Math.min(100, Math.max(0, data.confidence));
      })();

      // 从配置中获取真实的延迟和数据源数量
      const providerDefaults = getProviderDefaults(data.provider);
      const latency = providerDefaults.responseTime;
      const dataSources = providerDefaults.dataSources;
      // 使用数据时间戳或当前时间，不使用随机偏移
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

  // 筛选和排序数据
  const filteredAndSortedRows = useMemo(() => {
    // 筛选
    let filtered = tableRows;
    if (statusFilter !== 'all') {
      filtered = tableRows.filter((row) => row.status === statusFilter);
    }

    // 排序
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

  // 处理排序
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // 获取行样式
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('crossOracle.noData') || 'No Data Available'}
        </h3>
        <p className="text-gray-500">
          {t('crossOracle.noDataDescription') || 'Please try again later'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {/* 预言机 */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('crossOracle.oracle') || 'Oracle'}
              </th>

              {/* 价格 - 可排序 */}
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('crossOracle.price') || 'Price'}
                  <SortIcon column="price" sortColumn={sortColumn} sortDirection={sortDirection} />
                </div>
              </th>

              {/* 偏差 - 可排序 */}
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('deviation')}
              >
                <div className="flex items-center justify-end gap-1">
                  {t('crossOracle.deviation') || 'Deviation'}
                  <SortIcon
                    column="deviation"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              {/* 置信度 - 可排序 */}
              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('crossOracle.confidence') || 'Confidence'}
                  <SortIcon
                    column="confidence"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              {/* 延迟 - 可排序 */}
              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('latency')}
                title={
                  t('crossOracle.latencyTooltip') || 'Estimated latency based on historical data'
                }
              >
                <div className="flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3" />
                  {t('crossOracle.latency') || 'Latency'}
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                  <SortIcon
                    column="latency"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              {/* 数据源 */}
              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                title={
                  t('crossOracle.dataSourcesTooltip') ||
                  'Estimated data sources based on official documentation'
                }
              >
                <div className="flex items-center justify-center gap-1">
                  <Database className="w-3 h-3" />
                  {t('crossOracle.dataSources.title') || 'Sources'}
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                </div>
              </th>

              {/* 更新时间 - 可排序 */}
              <th
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updateTime')}
              >
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t('crossOracle.updateTime') || 'Updated'}
                  <SortIcon
                    column="updateTime"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>

              {/* 状态 */}
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('crossOracle.status') || 'Status'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedRows.map((row) => (
              <tr key={row.provider} className={getRowClassName(row)}>
                {/* 预言机名称 */}
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

                {/* 价格 */}
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

                {/* 偏差率 */}
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

                {/* 置信度 */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="w-24 mx-auto">
                    <ConfidenceBar confidence={row.confidence} showLabel={false} size="sm" />
                  </div>
                </td>

                {/* 延迟 */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span
                    className={`text-xs font-medium ${
                      row.latency < 200
                        ? 'text-emerald-600'
                        : row.latency < 500
                          ? 'text-yellow-600'
                          : 'text-orange-600'
                    }`}
                    title={
                      t('crossOracle.latencyTooltip') ||
                      'Estimated latency based on historical data'
                    }
                  >
                    {formatLatency(row.latency)}
                  </span>
                </td>

                {/* 数据源数量 */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span
                    className="text-xs text-gray-600"
                    title={
                      t('crossOracle.dataSourcesTooltip') ||
                      'Estimated data sources based on official documentation'
                    }
                  >
                    {row.dataSources}
                  </span>
                </td>

                {/* 更新时间 */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-xs text-gray-500">{formatTimeAgo(row.updateTime)}</span>
                </td>

                {/* 状态 */}
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
                        ? t('crossOracle.statusNormal') || 'Normal'
                        : row.status === 'warning'
                          ? t('crossOracle.statusWarning') || 'Warning'
                          : t('crossOracle.statusCritical') || 'Critical'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 表格底部摘要 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {t('crossOracle.showingResults', {
              filtered: filteredAndSortedRows.length,
              total: tableRows.length,
            }) || `显示 ${filteredAndSortedRows.length} / ${tableRows.length} 个预言机`}
          </span>
          <span>
            {t('crossOracle.anomaliesCount', { count: anomalies.length }) ||
              `${anomalies.length} 个异常`}
          </span>
        </div>
      </div>
    </div>
  );
}

// 导出记忆化组件
export const SimplePriceTable = memo(SimplePriceTableComponent);
SimplePriceTable.displayName = 'SimplePriceTable';

export default SimplePriceTable;
