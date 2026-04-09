'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';

import { ArrowUp, ArrowDown, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface ComparisonDataItem {
  provider: string;
  name: string;
  price: number;
  deviation: number;
  confidence?: number;
  responseTime?: number;
  color: string;
}

export interface DeviationThreshold {
  warning: number;
  danger: number;
}

export interface EnhancedComparisonTableProps {
  data: ComparisonDataItem[];
  benchmarkProvider?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  deviationThreshold?: DeviationThreshold;
  className?: string;
  'aria-label'?: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * 根据偏离值计算背景色渐变强度
 * @param deviation 偏离值
 * @returns Tailwind 背景色类名
 */
function getDeviationBgColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);

  if (deviation > 0) {
    // 正偏离 - 绿色渐变
    if (absDeviation >= 5) return 'bg-emerald-200/70 dark:bg-emerald-900/60';
    if (absDeviation >= 3) return 'bg-emerald-100/60 dark:bg-emerald-900/40';
    if (absDeviation >= 1) return 'bg-emerald-50/50 dark:bg-emerald-900/20';
    return 'bg-emerald-50/30 dark:bg-emerald-900/10';
  } else if (deviation < 0) {
    // 负偏离 - 红色渐变
    if (absDeviation >= 5) return 'bg-red-200/70 dark:bg-red-900/60';
    if (absDeviation >= 3) return 'bg-red-100/60 dark:bg-red-900/40';
    if (absDeviation >= 1) return 'bg-red-50/50 dark:bg-red-900/20';
    return 'bg-red-50/30 dark:bg-red-900/10';
  }

  return 'bg-transparent';
}

/**
 * 获取偏离值文本颜色
 */
function getDeviationTextColor(deviation: number): string {
  if (deviation > 0) return 'text-emerald-700 dark:text-emerald-400';
  if (deviation < 0) return 'text-red-700 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * 获取异常状态
 */
function getAnomalyStatus(
  deviation: number,
  threshold: DeviationThreshold
): 'normal' | 'warning' | 'danger' {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= threshold.danger) return 'danger';
  if (absDeviation >= threshold.warning) return 'warning';
  return 'normal';
}

/**
 * 格式化价格
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
}

/**
 * 格式化偏离值
 */
function formatDeviation(deviation: number): string {
  const prefix = deviation > 0 ? '+' : '';
  return `${prefix}${deviation.toFixed(2)}%`;
}

/**
 * 格式化置信度
 */
function formatConfidence(confidence?: number): string {
  if (confidence === undefined) return '-';
  return `${confidence.toFixed(1)}%`;
}

/**
 * 格式化响应时间
 */
function formatResponseTime(responseTime?: number): string {
  if (responseTime === undefined) return '-';
  return `${responseTime.toFixed(0)}ms`;
}

// ============================================
// Components
// ============================================

interface SortHeaderProps {
  label: string;
  columnKey: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  align?: 'left' | 'center' | 'right';
}

function SortHeader({
  label,
  columnKey,
  sortColumn,
  sortDirection,
  onSort,
  align = 'left',
}: SortHeaderProps) {
  const isActive = sortColumn === columnKey;
  const isSortable = !!onSort;

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wider',
        'bg-gray-50 dark:bg-gray-800/80',
        'text-gray-600 dark:text-gray-300',
        'border-b border-gray-200 dark:border-gray-700',
        'transition-colors duration-200',
        isSortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50',
        alignClass
      )}
      onClick={() => isSortable && onSort(columnKey)}
    >
      <div className={cn('flex items-center gap-1.5', align === 'right' && 'justify-end')}>
        <span>{label}</span>
        {isSortable && (
          <span className="inline-flex flex-col">
            {isActive ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )
            ) : (
              <Minus className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

interface AnomalyIndicatorProps {
  status: 'normal' | 'warning' | 'danger';
}

function AnomalyIndicator({ status }: AnomalyIndicatorProps) {
  if (status === 'normal') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
  }

  if (status === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
  }

  return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />;
}

// ============================================
// Main Component
// ============================================

// eslint-disable-next-line max-lines-per-function
export function EnhancedComparisonTable({
  data,
  benchmarkProvider,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  deviationThreshold = { warning: 2, danger: 5 },
  className,
  'aria-label': ariaLabel,
}: EnhancedComparisonTableProps) {
  const t = useTranslations();

  // 表格容器和焦点管理
  const tableRef = useRef<HTMLTableElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // 列配置
  const columns = useMemo(
    () => [
      { key: 'status', label: t('table.status'), sortable: false },
      { key: 'provider', label: t('table.provider'), sortable: true },
      { key: 'name', label: t('table.name'), sortable: true },
      { key: 'price', label: t('table.price'), sortable: true },
      { key: 'deviation', label: t('table.deviation'), sortable: true },
      { key: 'confidence', label: t('table.confidence'), sortable: true },
      { key: 'responseTime', label: t('table.responseTime'), sortable: true },
    ],
    [t]
  );

  // 计算统计数据
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const deviations = data.map((d) => d.deviation);
    const maxDeviation = Math.max(...deviations.map(Math.abs));
    const avgDeviation = deviations.reduce((a, b) => a + Math.abs(b), 0) / deviations.length;

    return {
      maxDeviation,
      avgDeviation,
      warningCount: data.filter(
        (d) =>
          Math.abs(d.deviation) >= deviationThreshold.warning &&
          Math.abs(d.deviation) < deviationThreshold.danger
      ).length,
      dangerCount: data.filter((d) => Math.abs(d.deviation) >= deviationThreshold.danger).length,
    };
  }, [data, deviationThreshold]);

  // 键盘导航处理
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!focusedCell) {
        // 如果没有焦点单元格，按 Enter 或 Space 开始导航
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setFocusedCell({ row: 0, col: 0 });
          setAnnouncement('已进入表格导航模式，使用方向键移动，S键排序当前列，Esc退出');
        }
        return;
      }

      const { row, col } = focusedCell;
      const maxRow = data.length - 1;
      const maxCol = columns.length - 1;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (row < maxRow) {
            setFocusedCell({ row: row + 1, col });
            setAnnouncement(`第 ${row + 2} 行`);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (row > 0) {
            setFocusedCell({ row: row - 1, col });
            setAnnouncement(`第 ${row} 行`);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (col < maxCol) {
            setFocusedCell({ row, col: col + 1 });
            setAnnouncement(`${columns[col + 1].label} 列`);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (col > 0) {
            setFocusedCell({ row, col: col - 1 });
            setAnnouncement(`${columns[col - 1].label} 列`);
          }
          break;
        case 'Home':
          event.preventDefault();
          setFocusedCell({ row, col: 0 });
          setAnnouncement('行首');
          break;
        case 'End':
          event.preventDefault();
          setFocusedCell({ row, col: maxCol });
          setAnnouncement('行尾');
          break;
        case 'PageDown':
          event.preventDefault();
          setFocusedCell({ row: Math.min(row + 5, maxRow), col });
          setAnnouncement(`第 ${Math.min(row + 6, maxRow + 1)} 行`);
          break;
        case 'PageUp':
          event.preventDefault();
          setFocusedCell({ row: Math.max(row - 5, 0), col });
          setAnnouncement(`第 ${Math.max(row - 4, 1)} 行`);
          break;
        case 's':
        case 'S':
          event.preventDefault();
          // 按 S 键排序当前列
          if (onSort && columns[col].sortable) {
            onSort(columns[col].key);
            setAnnouncement(`已按 ${columns[col].label} 排序`);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setFocusedCell(null);
          setAnnouncement('已退出表格导航模式');
          // 将焦点返回到表格
          tableRef.current?.focus();
          break;
      }
    },
    [focusedCell, data.length, columns, onSort]
  );

  // 设置焦点到当前单元格
  useEffect(() => {
    if (focusedCell && tableRef.current) {
      const cell = tableRef.current.querySelector(
        `[data-row="${focusedCell.row}"][data-col="${focusedCell.col}"]`
      ) as HTMLElement;
      cell?.focus();
    }
  }, [focusedCell]);

  // 获取行样式
  const getRowClassName = (item: ComparisonDataItem, index: number): string => {
    const isBenchmark = item.provider === benchmarkProvider;
    const anomalyStatus = getAnomalyStatus(item.deviation, deviationThreshold);

    return cn(
      'transition-all duration-200',
      'border-b border-gray-100 dark:border-gray-800',
      'hover:bg-gray-50/80 dark:hover:bg-gray-800/50',
      isBenchmark && 'bg-blue-50/50 dark:bg-blue-900/20',
      anomalyStatus === 'warning' && 'bg-amber-50/40 dark:bg-amber-900/20',
      anomalyStatus === 'danger' && 'bg-red-50/40 dark:bg-red-900/20',
      index === data.length - 1 && 'border-b-0'
    );
  };

  // 获取偏离值单元格样式
  const getDeviationCellClass = (deviation: number): string => {
    const bgColor = getDeviationBgColor(deviation);
    const textColor = getDeviationTextColor(deviation);

    return cn(
      'px-4 py-3 font-mono font-medium',
      'transition-colors duration-200',
      bgColor,
      textColor
    );
  };

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4',
          'bg-white dark:bg-gray-900',
          'rounded-lg border border-gray-200 dark:border-gray-700',
          className
        )}
        role="status"
        aria-label="暂无数据"
      >
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('table.noData')}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-900',
        'shadow-sm',
        className
      )}
      role="region"
      aria-label={ariaLabel || '数据对比表格'}
    >
      {/* 实时公告区域 - 用于屏幕阅读器 */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* 键盘导航说明 */}
      <div className="sr-only" id="keyboard-help">
        表格支持键盘导航：按 Enter 或 Space 进入导航模式，使用方向键移动，Home/End 跳到行首/行尾，
        PageUp/PageDown 翻页，按 S 键对当前列排序，按 Esc 退出导航模式。
      </div>

      {/* 统计信息栏 */}
      {stats && (
        <div
          className="flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs"
          role="status"
          aria-label={`统计信息：共 ${data.length} 条数据，${stats.warningCount} 条警告，${stats.dangerCount} 条异常，平均偏离 ${stats.avgDeviation.toFixed(2)}%`}
        >
          <span className="text-gray-600 dark:text-gray-400">
            {t('table.totalRecords', { count: data.length })}
          </span>
          {stats.warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              {t('table.warningCount', { count: stats.warningCount })}
            </span>
          )}
          {stats.dangerCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              {t('table.errorCount', { count: stats.dangerCount })}
            </span>
          )}
          <span className="text-gray-500 dark:text-gray-500 ml-auto">
            平均偏离: <strong>{stats.avgDeviation.toFixed(2)}%</strong>
          </span>
        </div>
      )}

      {/* 表格容器 */}
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="application"
        aria-describedby="keyboard-help"
        onKeyDown={handleKeyDown}
      >
        <table
          ref={tableRef}
          className="w-full border-collapse"
          role="table"
          aria-label={ariaLabel || t('table.comparisonTable')}
        >
          <thead className="sticky top-0 z-10">
            <tr role="row">
              <SortHeader
                label="状态"
                columnKey="status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="center"
              />
              <SortHeader
                label="数据源"
                columnKey="provider"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="left"
              />
              <SortHeader
                label="名称"
                columnKey="name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="left"
              />
              <SortHeader
                label="价格"
                columnKey="price"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="right"
              />
              <SortHeader
                label="偏离值"
                columnKey="deviation"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="right"
              />
              <SortHeader
                label="置信度"
                columnKey="confidence"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="right"
              />
              <SortHeader
                label="响应时间"
                columnKey="responseTime"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((item, index) => {
              const isBenchmark = item.provider === benchmarkProvider;
              const anomalyStatus = getAnomalyStatus(item.deviation, deviationThreshold);

              return (
                <tr
                  key={`${item.provider}-${index}`}
                  className={getRowClassName(item, index)}
                  role="row"
                  aria-selected={focusedCell?.row === index}
                >
                  {/* 状态列 */}
                  <td
                    className="px-4 py-3 text-center"
                    role="cell"
                    data-row={index}
                    data-col={0}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 0 ? 0 : -1}
                    aria-label={t('table.statusAriaLabel', { status: t(`table.${anomalyStatus}`) })}
                  >
                    <div className="flex items-center justify-center">
                      <AnomalyIndicator status={anomalyStatus} />
                    </div>
                  </td>

                  {/* 数据源列 */}
                  <td
                    className="px-4 py-3"
                    role="cell"
                    data-row={index}
                    data-col={1}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 1 ? 0 : -1}
                    aria-label={t('table.providerAriaLabel', {
                      provider: item.provider,
                      isBenchmark: isBenchmark ? 'true' : 'false',
                    })}
                  >
                    <div className="flex items-center gap-2">
                      {/* 颜色指示器 */}
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {item.provider}
                      </span>
                      {isBenchmark && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {t('table.benchmark')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 名称列 */}
                  <td
                    className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400"
                    role="cell"
                    data-row={index}
                    data-col={2}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 2 ? 0 : -1}
                    aria-label={t('table.nameAriaLabel', { name: item.name })}
                  >
                    {item.name}
                  </td>

                  {/* 价格列 */}
                  <td
                    className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100"
                    role="cell"
                    data-row={index}
                    data-col={3}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 3 ? 0 : -1}
                    aria-label={t('table.priceAriaLabel', { price: formatPrice(item.price) })}
                  >
                    {formatPrice(item.price)}
                  </td>

                  {/* 偏离值列 - 条件格式 */}
                  <td
                    className={getDeviationCellClass(item.deviation)}
                    role="cell"
                    data-row={index}
                    data-col={4}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 4 ? 0 : -1}
                    aria-label={t('table.deviationAriaLabel', {
                      deviation: formatDeviation(item.deviation),
                      status:
                        Math.abs(item.deviation) >= deviationThreshold.danger
                          ? 'error'
                          : Math.abs(item.deviation) >= deviationThreshold.warning
                            ? 'warning'
                            : 'normal',
                    })}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{formatDeviation(item.deviation)}</span>
                      {Math.abs(item.deviation) >= deviationThreshold.danger && (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-red-600 dark:text-red-400"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </td>

                  {/* 置信度列 */}
                  <td
                    className="px-4 py-3 text-right"
                    role="cell"
                    data-row={index}
                    data-col={5}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 5 ? 0 : -1}
                    aria-label={t('table.confidenceAriaLabel', {
                      confidence:
                        item.confidence !== undefined
                          ? formatConfidence(item.confidence)
                          : t('table.noDataConfidence'),
                    })}
                  >
                    {item.confidence !== undefined ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {formatConfidence(item.confidence)}
                        </span>
                        {/* 置信度进度条 */}
                        <div
                          className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={item.confidence}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={t('table.confidenceProgress', {
                            value: item.confidence.toFixed(1),
                          })}
                        >
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              item.confidence >= 90
                                ? 'bg-emerald-500'
                                : item.confidence >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            )}
                            style={{ width: `${Math.min(item.confidence, 100)}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                    )}
                  </td>

                  {/* 响应时间列 */}
                  <td
                    className="px-4 py-3 text-right"
                    role="cell"
                    data-row={index}
                    data-col={6}
                    tabIndex={focusedCell?.row === index && focusedCell?.col === 6 ? 0 : -1}
                    aria-label={t('table.responseTimeAriaLabel', {
                      time:
                        item.responseTime !== undefined
                          ? formatResponseTime(item.responseTime)
                          : t('table.noDataConfidence'),
                    })}
                  >
                    {item.responseTime !== undefined ? (
                      <span
                        className={cn(
                          'font-mono text-sm',
                          item.responseTime < 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.responseTime < 500
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {formatResponseTime(item.responseTime)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 图例 */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400"
        role="group"
        aria-label={t('table.legend')}
      >
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          {t('table.positiveDeviation')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
          {t('table.negativeDeviation')}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
          {t('table.normalStatus')}
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          {t('table.warningThreshold', { threshold: deviationThreshold.warning })}
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
          {t('table.errorThreshold', { threshold: deviationThreshold.danger })}
        </span>
      </div>
    </div>
  );
}

export default EnhancedComparisonTable;
