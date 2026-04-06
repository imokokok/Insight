'use client';

/**
 * @fileoverview 风险详情表格组件
 * @description 展示价格异常的详细信息，支持排序、展开/收起行、空状态处理
 */

import { memo, useState, useMemo } from 'react';

import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  Eye,
  ShieldCheck,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';

import { oracleNames } from '../../constants';

import type { PriceAnomaly, AnomalySeverity } from '../../hooks/usePriceAnomalyDetection';

// ============================================================================
// 类型定义
// ============================================================================

interface RiskDetailsTableProps {
  anomalies: PriceAnomaly[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取严重程度对应的颜色配置
 */
function getSeverityColorClass(severity: AnomalySeverity): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  switch (severity) {
    case 'high':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-500 text-white',
      };
    case 'medium':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        badge: 'bg-orange-500 text-white',
      };
    case 'low':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        badge: 'bg-yellow-500 text-white',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        badge: 'bg-gray-500 text-white',
      };
  }
}

/**
 * 获取严重程度图标
 */
function getSeverityIcon(severity: AnomalySeverity): React.ReactNode {
  switch (severity) {
    case 'high':
      return <AlertOctagon className="w-4 h-4" />;
    case 'medium':
      return <AlertTriangle className="w-4 h-4" />;
    case 'low':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
}

/**
 * 获取严重程度标签文本
 */
function getSeverityLabel(
  severity: AnomalySeverity,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  switch (severity) {
    case 'high':
      return t('crossOracle.risk.high');
    case 'medium':
      return t('crossOracle.risk.medium');
    case 'low':
      return t('crossOracle.risk.low');
    default:
      return t('crossOracle.risk.unknown');
  }
}

/**
 * 格式化百分比显示
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * 格式化价格显示
 */
function formatPrice(value: number): string {
  if (value <= 0) return '-';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(
  timestamp: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return t('crossOracle.time.secondsAgo', { seconds });
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return t('crossOracle.time.minutesAgo', { minutes });
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return t('crossOracle.time.hoursAgo', { hours });
  }
  const days = Math.floor(seconds / 86400);
  return t('crossOracle.time.daysAgo', { days });
}

/**
 * 按风险等级排序（高→中→低）
 */
function sortBySeverity(a: PriceAnomaly, b: PriceAnomaly): number {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const orderDiff = severityOrder[a.severity] - severityOrder[b.severity];
  if (orderDiff !== 0) return orderDiff;
  // 同等级按偏差绝对值降序
  return Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent);
}

// ============================================================================
// 空状态组件
// ============================================================================

function EmptyState({
  t,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{t('crossOracle.risk.noAnomalies')}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{t('crossOracle.risk.noAnomaliesDesc')}</p>
    </div>
  );
}

// ============================================================================
// 表格行组件
// ============================================================================

interface TableRowProps {
  anomaly: PriceAnomaly;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function TableRow({ anomaly, index, isExpanded, onToggleExpand, t }: TableRowProps) {
  const colors = getSeverityColorClass(anomaly.severity);
  const deviationColorClass = anomaly.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600';

  return (
    <>
      <tr
        className={`
          border-b border-gray-100 transition-colors duration-150
          hover:bg-gray-50/80 cursor-pointer
          ${isExpanded ? colors.bg : ''}
        `}
        onClick={onToggleExpand}
      >
        {/* 排名 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
            {index + 1}
          </span>
        </td>

        {/* 预言机名称 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{oracleNames[anomaly.provider]}</span>
          </div>
        </td>

        {/* 当前价格 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-mono text-sm text-gray-900">{formatPrice(anomaly.price)}</span>
        </td>

        {/* 偏差百分比 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`font-mono text-sm font-medium ${deviationColorClass}`}>
            {formatPercent(anomaly.deviationPercent)}
          </span>
        </td>

        {/* 风险等级 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={`
              inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full
              ${colors.badge}
            `}
          >
            {getSeverityIcon(anomaly.severity)}
            {getSeverityLabel(anomaly.severity, t)}
          </span>
        </td>

        {/* 原因分析 */}
        <td className="px-4 py-3">
          <p
            className="text-sm text-gray-600 truncate max-w-[200px]"
            title={anomaly.reasonKeys.join(', ')}
          >
            {anomaly.reasonKeys.join(', ')}
          </p>
        </td>

        {/* 检测时间 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(anomaly.timestamp, t)}</span>
          </div>
        </td>

        {/* 操作按钮 */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {t('crossOracle.risk.viewDetails')}
            </Button>
            <button
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {/* 展开详情行 */}
      {isExpanded && (
        <tr className={`${colors.bg} border-b border-gray-100`}>
          <td colSpan={8} className="px-4 py-4">
            <div className="pl-10 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 详细信息 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {t('crossOracle.risk.detailInfo')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crossOracle.provider')}:</span>
                      <span className="font-medium text-gray-900">
                        {oracleNames[anomaly.provider]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crossOracle.price')}:</span>
                      <span className="font-mono font-medium text-gray-900">
                        {formatPrice(anomaly.price)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crossOracle.deviation')}:</span>
                      <span className={`font-mono font-medium ${deviationColorClass}`}>
                        {formatPercent(anomaly.deviationPercent)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 数据新鲜度 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {t('crossOracle.risk.dataFreshness')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crossOracle.risk.detectedAt')}:</span>
                      <span className="text-gray-900">
                        {new Date(anomaly.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crossOracle.risk.freshness')}:</span>
                      <span className="text-gray-900">
                        {anomaly.freshnessSeconds < 60
                          ? `${anomaly.freshnessSeconds}秒`
                          : `${Math.floor(anomaly.freshnessSeconds / 60)}分钟`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('crossOracle.risk.status')}:</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${colors.badge}`}
                      >
                        {getSeverityLabel(anomaly.severity, t)}风险
                      </span>
                    </div>
                  </div>
                </div>

                {/* 原因分析 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {t('crossOracle.risk.analysis')}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {anomaly.reasonKeys.join(', ')}
                  </p>
                  <div className="pt-2">
                    <Button variant="secondary" size="sm" className="text-xs h-8">
                      {t('crossOracle.risk.investigate')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskDetailsTableComponent({ anomalies, t }: RiskDetailsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 按风险等级排序（高→中→低）
  const sortedAnomalies = useMemo(() => {
    return [...anomalies].sort(sortBySeverity);
  }, [anomalies]);

  // 切换行展开状态
  const handleToggleExpand = (key: string) => {
    setExpandedRow((prev) => (prev === key ? null : key));
  };

  // 无数据时显示空状态
  if (anomalies.length === 0) {
    return <EmptyState t={t} />;
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* 表头 */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.oracle')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.price')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.deviation')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.risk.level')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.risk.reason')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('crossOracle.risk.time')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                {t('crossOracle.action')}
              </th>
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className="divide-y divide-gray-100">
            {sortedAnomalies.map((anomaly, index) => {
              const rowKey = `${anomaly.provider}-${anomaly.timestamp}`;
              return (
                <TableRow
                  key={rowKey}
                  anomaly={anomaly}
                  index={index}
                  isExpanded={expandedRow === rowKey}
                  onToggleExpand={() => handleToggleExpand(rowKey)}
                  t={t}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{t('crossOracle.risk.totalAnomalies', { count: anomalies.length })}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {t('crossOracle.risk.high')}: {anomalies.filter((a) => a.severity === 'high').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              {t('crossOracle.risk.medium')}{' '}
              {anomalies.filter((a) => a.severity === 'medium').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              {t('crossOracle.risk.low')}: {anomalies.filter((a) => a.severity === 'low').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskDetailsTable = memo(RiskDetailsTableComponent);
RiskDetailsTable.displayName = 'RiskDetailsTable';

export default RiskDetailsTable;
