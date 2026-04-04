'use client';

/**
 * @fileoverview 数据源质量对比表格组件
 * @description 专业对比表格，展示各预言机的详细质量指标
 */

import { memo, useState, useCallback } from 'react';

import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';

import { oracleNames } from '../../constants';
import { formatLatency, getZScoreColorClass } from '../../hooks/useDataQualityScore';

import type { OracleQualityMetrics } from '../../hooks/useDataQualityScore';

// ============================================================================
// 类型定义
// ============================================================================

type SortField = 'provider' | 'price' | 'deviationPercent' | 'zScore' | 'latency' | 'confidence';
type SortDirection = 'asc' | 'desc';

interface OracleQualityTableProps {
  oracleMetrics: OracleQualityMetrics[];
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化价格显示
 */
function formatPrice(price: number): string {
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/**
 * 格式化百分比
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * 格式化Z-Score
 */
function formatZScore(zScore: number): string {
  return zScore.toFixed(2);
}

/**
 * 格式化置信度
 */
function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}

/**
 * 获取偏差颜色类
 */
function getDeviationColorClass(deviation: number): string {
  const absDev = Math.abs(deviation);
  if (absDev < 0.1) return 'text-emerald-600';
  if (absDev < 0.5) return 'text-blue-600';
  if (absDev < 1) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 获取延迟颜色类
 */
function getLatencyColorClass(latency: number): string {
  if (latency < 5000) return 'text-emerald-600';
  if (latency < 15000) return 'text-blue-600';
  if (latency < 30000) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 获取置信度颜色类
 */
function getConfidenceColorClass(confidence: number): string {
  if (confidence >= 0.9) return 'text-emerald-600';
  if (confidence >= 0.7) return 'text-blue-600';
  if (confidence >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

// ============================================================================
// 表头组件
// ============================================================================

interface TableHeaderProps {
  label: string;
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
  align?: 'left' | 'right';
}

function TableHeader({ label, field, currentSort, onSort, align = 'left' }: TableHeaderProps) {
  const isActive = currentSort.field === field;

  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 border-b border-gray-200',
        'cursor-pointer hover:bg-gray-100 transition-colors select-none',
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <div className={cn('flex items-center gap-1', align === 'right' && 'justify-end')}>
        <span>{label}</span>
        <span className="inline-flex">
          {isActive ? (
            currentSort.direction === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-blue-600" />
            ) : (
              <ArrowDown className="w-3 h-3 text-blue-600" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-gray-400" />
          )}
        </span>
      </div>
    </th>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function OracleQualityTableComponent({ oracleMetrics, t, className }: OracleQualityTableProps) {
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'zScore',
    direction: 'desc',
  });

  // 排序处理
  const handleSort = useCallback(
    (field: SortField) => {
      setSort((current) => ({
        field,
        direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc',
      }));
    },
    [setSort]
  );

  // 排序数据
  const sortedData = useCallback(() => {
    const data = [...oracleMetrics];
    data.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'provider':
          comparison = a.provider.localeCompare(b.provider);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'deviationPercent':
          comparison = Math.abs(a.deviationPercent) - Math.abs(b.deviationPercent);
          break;
        case 'zScore':
          comparison = Math.abs(a.zScore) - Math.abs(b.zScore);
          break;
        case 'latency':
          comparison = a.latency - b.latency;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return data;
  }, [oracleMetrics, sort]);

  const data = sortedData();

  if (data.length === 0) {
    return (
      <div className={cn('p-8 text-center text-gray-500', className)}>
        {t('crossOracle.quality.noData')}
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-gray-200', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TableHeader
                label={t('crossOracle.quality.table.oracle')}
                field="provider"
                currentSort={sort}
                onSort={handleSort}
                align="left"
              />
              <TableHeader
                label={t('crossOracle.quality.table.price')}
                field="price"
                currentSort={sort}
                onSort={handleSort}
                align="right"
              />
              <TableHeader
                label={t('crossOracle.quality.table.deviation')}
                field="deviationPercent"
                currentSort={sort}
                onSort={handleSort}
                align="right"
              />
              <TableHeader
                label={t('crossOracle.quality.table.zScore') || 'Z-Score'}
                field="zScore"
                currentSort={sort}
                onSort={handleSort}
                align="right"
              />
              <TableHeader
                label={t('crossOracle.quality.table.latency')}
                field="latency"
                currentSort={sort}
                onSort={handleSort}
                align="right"
              />
              <TableHeader
                label={t('crossOracle.quality.table.confidence')}
                field="confidence"
                currentSort={sort}
                onSort={handleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((metric) => {
              const isOutlier = metric.isOutlier;
              const isHighLatency = metric.latency > 30000;

              return (
                <tr
                  key={metric.provider}
                  className={cn('hover:bg-gray-50 transition-colors', isOutlier && 'bg-red-50/50')}
                >
                  {/* 预言机名称 */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {oracleNames[metric.provider]}
                      </span>
                      {isOutlier && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                  </td>

                  {/* 价格 */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-mono font-medium text-gray-900">
                      {formatPrice(metric.price)}
                    </span>
                  </td>

                  {/* 偏差% */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        'font-mono font-medium',
                        getDeviationColorClass(metric.deviationPercent)
                      )}
                    >
                      {formatPercent(metric.deviationPercent)}
                    </span>
                  </td>

                  {/* Z-Score */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium',
                        getZScoreColorClass(metric.zScore)
                      )}
                    >
                      {formatZScore(metric.zScore)}
                    </span>
                  </td>

                  {/* 延迟 */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isHighLatency && <Clock className="w-3.5 h-3.5 text-red-500" />}
                      <span className={cn('font-mono', getLatencyColorClass(metric.latency))}>
                        {formatLatency(metric.latency)}
                      </span>
                    </div>
                  </td>

                  {/* 置信度 */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={cn(
                        'font-mono font-medium',
                        getConfidenceColorClass(metric.confidence)
                      )}
                    >
                      {formatConfidence(metric.confidence)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 表格底部说明 */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          {t('crossOracle.quality.table.outlierLegend')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
          {t('crossOracle.quality.table.highLatencyLegend')}
        </span>
        <span className="ml-auto">{t('crossOracle.quality.table.clickToSort')}</span>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const OracleQualityTable = memo(OracleQualityTableComponent);
OracleQualityTable.displayName = 'OracleQualityTable';

export default OracleQualityTable;
