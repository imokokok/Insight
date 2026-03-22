'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  forwardRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Type Definitions
// ============================================

export interface ColumnDef<T> {
  key: string;
  header: string | ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  formatter?: (value: unknown, row: T) => ReactNode;
}

export interface ConditionalFormattingRule {
  condition: 'gt' | 'lt' | 'eq' | 'between';
  value: number | [number, number];
  style: 'success' | 'danger' | 'warning' | 'info';
}

export interface ConditionalFormattingConfig {
  field: string;
  rules: ConditionalFormattingRule[];
}

export interface FixedColumnsConfig {
  left?: string[];
  right?: string[];
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T>[];
  fixedColumns?: FixedColumnsConfig;
  conditionalFormatting?: ConditionalFormattingConfig[];
  multiSort?: boolean;
  resizable?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
  virtualScroll?: boolean;
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

// ============================================
// Utility Functions
// ============================================

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function evaluateCondition(
  value: number,
  condition: ConditionalFormattingRule['condition'],
  ruleValue: number | [number, number]
): boolean {
  switch (condition) {
    case 'gt':
      return value > (ruleValue as number);
    case 'lt':
      return value < (ruleValue as number);
    case 'eq':
      return value === ruleValue;
    case 'between':
      const [min, max] = ruleValue as [number, number];
      return value >= min && value <= max;
    default:
      return false;
  }
}

function getConditionalStyle(
  style: ConditionalFormattingRule['style']
): string {
  switch (style) {
    case 'success':
      return 'bg-success-50 text-success-700 font-medium';
    case 'danger':
      return 'bg-danger-50 text-danger-700 font-medium';
    case 'warning':
      return 'bg-warning-50 text-warning-700 font-medium';
    case 'info':
      return 'bg-info-50 text-info-700 font-medium';
    default:
      return '';
  }
}

// ============================================
// Main Component
// ============================================

export function DataTablePro<T extends Record<string, unknown>>({
  data,
  columns,
  fixedColumns,
  conditionalFormatting,
  multiSort = false,
  resizable = false,
  density = 'normal',
  virtualScroll = false,
  rowHeight = 48,
  maxHeight = 600,
  onRowClick,
  className,
  emptyMessage,
  loading = false,
}: DataTableProProps<T>) {
  const t = useTranslations('dataTable');
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // ============================================
  // Density Configuration
  // ============================================

  const densityConfig = useMemo(() => {
    switch (density) {
      case 'compact':
        return {
          rowHeight: 36,
          cellPadding: 'px-3 py-1.5',
          headerPadding: 'px-3 py-2',
          fontSize: 'text-xs',
        };
      case 'comfortable':
        return {
          rowHeight: 64,
          cellPadding: 'px-6 py-4',
          headerPadding: 'px-6 py-4',
          fontSize: 'text-base',
        };
      default:
        return {
          rowHeight: 48,
          cellPadding: 'px-4 py-3',
          headerPadding: 'px-4 py-3',
          fontSize: 'text-sm',
        };
    }
  }, [density]);

  // ============================================
  // Sorting Logic
  // ============================================

  const handleSort = useCallback(
    (key: string) => {
      setSortConfig((prev) => {
        const existingIndex = prev.findIndex((s) => s.key === key);

        if (existingIndex === -1) {
          // Add new sort
          const newSort: SortConfig = { key, direction: 'asc' };
          return multiSort ? [...prev, newSort] : [newSort];
        }

        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          // Toggle to desc
          const updated = [...prev];
          updated[existingIndex] = { ...existing, direction: 'desc' };
          return multiSort ? updated : [updated[existingIndex]];
        }

        // Remove sort
        if (multiSort) {
          return prev.filter((_, i) => i !== existingIndex);
        }
        return [];
      });
    },
    [multiSort]
  );

  const sortedData = useMemo(() => {
    if (sortConfig.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sort of sortConfig) {
        const aValue = getNestedValue(a, sort.key);
        const bValue = getNestedValue(b, sort.key);

        if (aValue === bValue) continue;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aStr = String(aValue ?? '');
        const bStr = String(bValue ?? '');
        const comparison = aStr.localeCompare(bStr);
        return sort.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // ============================================
  // Column Resizing Logic
  // ============================================

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnKey: string) => {
      if (!resizable) return;
      e.preventDefault();
      e.stopPropagation();

      const currentWidth = columnWidths[columnKey] || columns.find((c) => c.key === columnKey)?.width || 150;

      setResizingColumn(columnKey);
      setStartX(e.clientX);
      setStartWidth(currentWidth);
    },
    [resizable, columnWidths, columns]
  );

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      const column = columns.find((c) => c.key === resizingColumn);
      const maxWidth = column?.maxWidth;
      const minWidth = column?.minWidth ?? 50;

      const finalWidth = maxWidth ? Math.min(newWidth, maxWidth) : newWidth;
      const clampedWidth = Math.max(finalWidth, minWidth);

      setColumnWidths((prev) => ({
        ...prev,
        [resizingColumn]: clampedWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth, columns]);

  // ============================================
  // Conditional Formatting Logic
  // ============================================

  const getCellConditionalClass = useCallback(
    (columnKey: string, value: unknown): string => {
      if (!conditionalFormatting) return '';

      const config = conditionalFormatting.find((c) => c.field === columnKey);
      if (!config || typeof value !== 'number') return '';

      for (const rule of config.rules) {
        if (evaluateCondition(value, rule.condition, rule.value)) {
          return getConditionalStyle(rule.style);
        }
      }

      return '';
    },
    [conditionalFormatting]
  );

  // ============================================
  // Virtual Scrolling Logic
  // ============================================

  const visibleRowCount = useMemo(() => {
    if (!virtualScroll) return sortedData.length;
    return Math.ceil(maxHeight / (rowHeight || densityConfig.rowHeight)) + 2;
  }, [virtualScroll, maxHeight, rowHeight, densityConfig.rowHeight, sortedData.length]);

  const startIndex = useMemo(() => {
    if (!virtualScroll) return 0;
    return Math.floor(scrollTop / (rowHeight || densityConfig.rowHeight));
  }, [virtualScroll, scrollTop, rowHeight, densityConfig.rowHeight]);

  const endIndex = useMemo(() => {
    if (!virtualScroll) return sortedData.length;
    return Math.min(startIndex + visibleRowCount, sortedData.length);
  }, [virtualScroll, startIndex, visibleRowCount, sortedData.length]);

  const visibleData = useMemo(() => {
    if (!virtualScroll) return sortedData;
    return sortedData.slice(startIndex, endIndex);
  }, [virtualScroll, sortedData, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!virtualScroll) return;
    setScrollTop(e.currentTarget.scrollTop);
  }, [virtualScroll]);

  const totalHeight = useMemo(() => {
    if (!virtualScroll) return 'auto';
    return sortedData.length * (rowHeight || densityConfig.rowHeight);
  }, [virtualScroll, sortedData.length, rowHeight, densityConfig.rowHeight]);

  const offsetY = useMemo(() => {
    if (!virtualScroll) return 0;
    return startIndex * (rowHeight || densityConfig.rowHeight);
  }, [virtualScroll, startIndex, rowHeight, densityConfig.rowHeight]);

  // ============================================
  // Fixed Columns Logic
  // ============================================

  const isColumnFixed = useCallback(
    (key: string, position: 'left' | 'right'): boolean => {
      if (!fixedColumns) return false;
      return fixedColumns[position]?.includes(key) ?? false;
    },
    [fixedColumns]
  );

  const getColumnStickyStyle = useCallback(
    (key: string, index: number): CSSProperties => {
      if (!fixedColumns) return {};

      if (isColumnFixed(key, 'left')) {
        const leftColumns = fixedColumns.left || [];
        const columnIndex = leftColumns.indexOf(key);
        let leftOffset = 0;

        for (let i = 0; i < columnIndex; i++) {
          const colKey = leftColumns[i];
          const col = columns.find((c) => c.key === colKey);
          leftOffset += columnWidths[colKey] || col?.width || 150;
        }

        return {
          position: 'sticky',
          left: leftOffset,
          zIndex: 20,
        };
      }

      if (isColumnFixed(key, 'right')) {
        const rightColumns = fixedColumns.right || [];
        const columnIndex = rightColumns.indexOf(key);
        let rightOffset = 0;

        for (let i = rightColumns.length - 1; i > columnIndex; i--) {
          const colKey = rightColumns[i];
          const col = columns.find((c) => c.key === colKey);
          rightOffset += columnWidths[colKey] || col?.width || 150;
        }

        return {
          position: 'sticky',
          right: rightOffset,
          zIndex: 20,
        };
      }

      return {};
    },
    [fixedColumns, isColumnFixed, columns, columnWidths]
  );

  // ============================================
  // Render Helpers
  // ============================================

  const renderSortIcon = (columnKey: string) => {
    const sort = sortConfig.find((s) => s.key === columnKey);
    if (!sort) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
    );
  };

  const renderCell = (column: ColumnDef<T>, row: T) => {
    const value = getNestedValue(row, column.key);

    if (column.formatter) {
      return column.formatter(value, row);
    }

    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }

    return String(value);
  };

  // ============================================
  // Empty State
  // ============================================

  if (!loading && data.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 bg-white rounded-lg border border-gray-200',
          className
        )}
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">
          {emptyMessage || t('noData')}
        </p>
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-white rounded-lg border border-gray-200',
        className
      )}
    >
      {/* Table Container */}
      <div
        className={cn('overflow-auto', virtualScroll && 'overflow-y-auto')}
        style={{ maxHeight: virtualScroll ? maxHeight : undefined }}
        onScroll={handleScroll}
      >
        <table className="w-full border-collapse">
          {/* Header */}
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50">
              {columns.map((column, index) => {
                const isFixedLeft = isColumnFixed(column.key, 'left');
                const isFixedRight = isColumnFixed(column.key, 'right');
                const stickyStyle = getColumnStickyStyle(column.key, index);
                const width = columnWidths[column.key] || column.width || 150;

                return (
                  <th
                    key={column.key}
                    className={cn(
                      densityConfig.headerPadding,
                      densityConfig.fontSize,
                      'font-semibold text-gray-700 text-left border-b border-gray-200 whitespace-nowrap select-none',
                      isFixedLeft && 'sticky left-0 z-20 bg-gray-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                      isFixedRight && 'sticky right-0 z-20 bg-gray-50 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                      column.sortable && 'cursor-pointer group'
                    )}
                    style={{
                      ...stickyStyle,
                      width,
                      minWidth: column.minWidth || 50,
                      maxWidth: column.maxWidth,
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate">
                        {column.header}
                      </span>
                      {column.sortable && (
                        <span className="flex-shrink-0">
                          {renderSortIcon(column.key)}
                        </span>
                      )}
                      {resizable && (
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-400 active:bg-primary-600 z-10"
                          onMouseDown={(e) => handleResizeStart(e, column.key)}
                        >
                          <GripVertical className="w-3 h-3 text-gray-300 absolute right-0 top-1/2 -translate-y-1/2" />
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {virtualScroll && (
              <tr style={{ height: offsetY }}>
                <td colSpan={columns.length} />
              </tr>
            )}

            {visibleData.map((row, rowIndex) => {
              const actualIndex = virtualScroll ? startIndex + rowIndex : rowIndex;

              return (
                <tr
                  key={actualIndex}
                  className={cn(
                    'transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-gray-50',
                    'border-b border-gray-100 last:border-b-0'
                  )}
                  style={{
                    height: virtualScroll ? rowHeight || densityConfig.rowHeight : undefined,
                  }}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => {
                    const isFixedLeft = isColumnFixed(column.key, 'left');
                    const isFixedRight = isColumnFixed(column.key, 'right');
                    const stickyStyle = getColumnStickyStyle(column.key, colIndex);
                    const value = getNestedValue(row, column.key);
                    const conditionalClass = getCellConditionalClass(column.key, value);
                    const width = columnWidths[column.key] || column.width || 150;

                    return (
                      <td
                        key={column.key}
                        className={cn(
                          densityConfig.cellPadding,
                          densityConfig.fontSize,
                          'text-gray-900 border-gray-100',
                          isFixedLeft && 'sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                          isFixedRight && 'sticky right-0 z-10 bg-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                          conditionalClass,
                          onRowClick && 'group-hover:bg-gray-50'
                        )}
                        style={{
                          ...stickyStyle,
                          width,
                          minWidth: column.minWidth || 50,
                          maxWidth: column.maxWidth,
                        }}
                      >
                        <div className="truncate">{renderCell(column, row)}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {virtualScroll && (
              <tr style={{ height: (totalHeight as number) - offsetY - visibleData.length * (rowHeight || densityConfig.rowHeight) }}>
                <td colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resizing Overlay */}
      {resizingColumn && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">{t('loading')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTablePro;
