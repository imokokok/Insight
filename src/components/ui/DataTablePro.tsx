'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Settings2,
  Check,
  AlignJustify,
  Rows3,
  LayoutList,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

// ============================================
// Type Definitions
// ============================================

export type AlignType = 'left' | 'center' | 'right';

export interface ConditionalFormattingRule {
  condition: 'gt' | 'lt' | 'eq' | 'between' | 'gte' | 'lte';
  value: number | [number, number];
  style: 'success' | 'danger' | 'warning' | 'info';
}

export interface ConditionalFormattingConfig {
  field: string;
  rules: ConditionalFormattingRule[];
}

export interface ColumnDef<T> {
  key: string;
  header: string | ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: AlignType;
  sortable?: boolean;
  fixed?: 'left' | 'right';
  formatter?: (value: unknown, row: T) => ReactNode;
  conditionalFormat?: {
    rules: ConditionalFormattingRule[];
  };
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
  columnVisibility?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
  densityToggle?: boolean;
  virtualScroll?: boolean;
  rowHeight?: number;
  maxHeight?: number;
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T, index: number) => void;
  onSort?: (sortConfig: SortConfig[]) => void;
  onDensityChange?: (density: 'compact' | 'normal' | 'comfortable') => void;
  className?: string;
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
    case 'gte':
      return value >= (ruleValue as number);
    case 'lt':
      return value < (ruleValue as number);
    case 'lte':
      return value <= (ruleValue as number);
    case 'eq':
      return value === ruleValue;
    case 'between':
      const [min, max] = ruleValue as [number, number];
      return value >= min && value <= max;
    default:
      return false;
  }
}

function getConditionalStyle(style: ConditionalFormattingRule['style']): string {
  switch (style) {
    case 'success':
      return 'font-medium';
    case 'danger':
      return 'font-medium';
    case 'warning':
      return 'font-medium';
    case 'info':
      return 'font-medium';
    default:
      return '';
  }
}

function getConditionalStyleCSS(style: ConditionalFormattingRule['style']): CSSProperties {
  switch (style) {
    case 'success':
      return {
        backgroundColor: semanticColors.success.light,
        color: semanticColors.success.text,
      };
    case 'danger':
      return {
        backgroundColor: semanticColors.danger.light,
        color: semanticColors.danger.text,
      };
    case 'warning':
      return {
        backgroundColor: semanticColors.warning.light,
        color: semanticColors.warning.text,
      };
    case 'info':
      return {
        backgroundColor: semanticColors.info.light,
        color: semanticColors.info.text,
      };
    default:
      return {};
  }
}

function getAlignClass(align?: AlignType): string {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'left':
    default:
      return 'text-left';
  }
}

// ============================================
// Density Toggle Component
// ============================================

interface DensityToggleProps {
  density: 'compact' | 'normal' | 'comfortable';
  onChange: (density: 'compact' | 'normal' | 'comfortable') => void;
}

function DensityToggle({ density, onChange }: DensityToggleProps) {
  const options = [
    { key: 'compact', icon: AlignJustify, label: '紧凑' },
    { key: 'normal', icon: Rows3, label: '标准' },
    { key: 'comfortable', icon: LayoutList, label: '舒适' },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = density === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-all',
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            )}
            title={option.label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Column Visibility Dropdown Component
// ============================================

interface ColumnVisibilityDropdownProps<T> {
  columns: ColumnDef<T>[];
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onToggleAll: () => void;
}

function ColumnVisibilityDropdown<T>({
  columns,
  visibleColumns,
  onToggleColumn,
  onToggleAll,
}: ColumnVisibilityDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allVisible = visibleColumns.size === columns.length;
  const someVisible = visibleColumns.size > 0 && visibleColumns.size < columns.length;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
          'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
          someVisible && 'text-blue-600 border-blue-200 bg-blue-50'
        )}
        title="列设置"
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">列</span>
        {someVisible && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          <div className="px-3 py-2 border-b border-gray-100">
            <button
              type="button"
              onClick={onToggleAll}
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  allVisible
                    ? 'bg-blue-600 border-blue-600'
                    : someVisible
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                )}
              >
                {(allVisible || someVisible) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>{allVisible ? '取消全选' : '全选'}</span>
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto py-1">
            {columns.map((column) => {
              const isVisible = visibleColumns.has(column.key);
              const isFixed = !!column.fixed;

              return (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => onToggleColumn(column.key)}
                  disabled={isFixed}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                    isFixed ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isVisible ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    )}
                  >
                    {isVisible && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="flex-1 text-left truncate">
                    {typeof column.header === 'string' ? column.header : column.key}
                  </span>
                  {isFixed && <span className="text-[10px] text-gray-400">固定</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  columnVisibility = false,
  density: initialDensity = 'normal',
  densityToggle = false,
  virtualScroll = false,
  rowHeight = 48,
  maxHeight = 600,
  loading = false,
  emptyText,
  onRowClick,
  onSort,
  onDensityChange,
  className,
}: DataTableProProps<T>) {
  const t = useTranslations('dataTable');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>(initialDensity);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.key))
  );

  // Sync density with prop changes
  useEffect(() => {
    setDensity(initialDensity);
  }, [initialDensity]);

  const handleDensityChange = useCallback(
    (newDensity: 'compact' | 'normal' | 'comfortable') => {
      setDensity(newDensity);
      onDensityChange?.(newDensity);
    },
    [onDensityChange]
  );

  // ============================================
  // Filtered Columns
  // ============================================

  const visibleColumnsList = useMemo(() => {
    return columns.filter((col) => visibleColumns.has(col.key));
  }, [columns, visibleColumns]);

  // ============================================
  // Column Visibility Handlers
  // ============================================

  const handleToggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleAllColumns = useCallback(() => {
    setVisibleColumns((prev) => {
      if (prev.size === columns.length) {
        // Keep fixed columns visible
        return new Set(columns.filter((c) => c.fixed).map((c) => c.key));
      }
      return new Set(columns.map((c) => c.key));
    });
  }, [columns]);

  // ============================================
  // Density Configuration
  // ============================================

  const densityConfig = useMemo(() => {
    switch (density) {
      case 'compact':
        return {
          rowHeight: 36,
          cellPadding: 'px-3 py-2',
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
          cellPadding: 'px-3 py-2',
          headerPadding: 'px-3 py-2',
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
          const newConfig = multiSort ? [...prev, newSort] : [newSort];
          onSort?.(newConfig);
          return newConfig;
        }

        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          // Toggle to desc
          const updated = [...prev];
          updated[existingIndex] = { ...existing, direction: 'desc' };
          const newConfig = multiSort ? updated : [updated[existingIndex]];
          onSort?.(newConfig);
          return newConfig;
        }

        // Remove sort
        let newConfig: SortConfig[];
        if (multiSort) {
          newConfig = prev.filter((_, i) => i !== existingIndex);
        } else {
          newConfig = [];
        }
        onSort?.(newConfig);
        return newConfig;
      });
    },
    [multiSort, onSort]
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

      const currentWidth =
        columnWidths[columnKey] || columns.find((c) => c.key === columnKey)?.width || 150;

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
    (columnKey: string, value: unknown): { className: string; style: CSSProperties } => {
      // First check column's own conditionalFormat
      const column = columns.find((c) => c.key === columnKey);
      if (column?.conditionalFormat && typeof value === 'number') {
        for (const rule of column.conditionalFormat.rules) {
          if (evaluateCondition(value, rule.condition, rule.value)) {
            return {
              className: getConditionalStyle(rule.style),
              style: getConditionalStyleCSS(rule.style),
            };
          }
        }
      }

      // Then check global conditionalFormatting
      if (conditionalFormatting) {
        const config = conditionalFormatting.find((c) => c.field === columnKey);
        if (config && typeof value === 'number') {
          for (const rule of config.rules) {
            if (evaluateCondition(value, rule.condition, rule.value)) {
              return {
                className: getConditionalStyle(rule.style),
                style: getConditionalStyleCSS(rule.style),
              };
            }
          }
        }
      }

      return { className: '', style: {} };
    },
    [conditionalFormatting, columns]
  );

  // ============================================
  // Virtual Scrolling with @tanstack/react-virtual
  // ============================================

  const currentRowHeight = rowHeight || densityConfig.rowHeight;

  const virtualizer = useVirtualizer({
    count: virtualScroll ? sortedData.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => currentRowHeight,
    overscan: 5,
    enabled: virtualScroll,
  });

  const virtualItems = virtualizer.getVirtualItems();

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
    (key: string): CSSProperties => {
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
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      );
    }
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
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
        <p className="text-gray-500 text-sm">{emptyText || t('noData')}</p>
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
        'relative overflow-hidden',
        className
      )}
    >
      {/* Toolbar */}
      {(columnVisibility || densityToggle) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50/50">
          <div className="text-xs text-gray-500">
            共 {data.length} 条数据
            {sortConfig.length > 0 && (
              <span className="ml-2 text-blue-600">
                已排序:{' '}
                {sortConfig.map((s) => `${s.key}(${s.direction === 'asc' ? '↑' : '↓'})`).join(', ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {densityToggle && <DensityToggle density={density} onChange={handleDensityChange} />}
            {columnVisibility && (
              <ColumnVisibilityDropdown
                columns={columns}
                visibleColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
                onToggleAll={handleToggleAllColumns}
              />
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div
        ref={scrollRef}
        className={cn('overflow-auto', virtualScroll && 'overflow-y-auto')}
        style={{ maxHeight: virtualScroll ? maxHeight : undefined }}
      >
        <table className="w-full border-collapse">
          {/* Header */}
          <thead className="sticky top-0 z-30">
            <tr className="bg-transparent">
              {visibleColumnsList.map((column) => {
                const isFixedLeft = isColumnFixed(column.key, 'left');
                const isFixedRight = isColumnFixed(column.key, 'right');
                const stickyStyle = getColumnStickyStyle(column.key);
                const width = columnWidths[column.key] || column.width || 150;
                const alignClass = getAlignClass(column.align);

                return (
                  <th
                    key={column.key}
                    className={cn(
                      densityConfig.headerPadding,
                      densityConfig.fontSize,
                      'font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap select-none',
                      alignClass,
                      isFixedLeft &&
                        'sticky left-0 z-20 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                      isFixedRight &&
                        'sticky right-0 z-20 bg-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
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
                      <span className="flex-1 truncate">{column.header}</span>
                      {column.sortable && (
                        <span className="flex-shrink-0">{renderSortIcon(column.key)}</span>
                      )}
                      {resizable && (
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-10"
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
          <tbody
            style={
              virtualScroll
                ? {
                    height: `${virtualizer.getTotalSize()}px`,
                    position: 'relative',
                  }
                : undefined
            }
          >
            {virtualScroll
              ? // Virtual scrolling rendering
                virtualItems.map((virtualItem) => {
                  const row = sortedData[virtualItem.index];
                  const actualIndex = virtualItem.index;

                  return (
                    <tr
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    className={cn(
                      'transition-colors duration-150 hover:bg-gray-50',
                      onRowClick && 'cursor-pointer',
                      'border-b border-gray-100 last:border-b-0'
                    )}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      onClick={() => onRowClick?.(row, actualIndex)}
                    >
                      {visibleColumnsList.map((column) => {
                        const isFixedLeft = isColumnFixed(column.key, 'left');
                        const isFixedRight = isColumnFixed(column.key, 'right');
                        const stickyStyle = getColumnStickyStyle(column.key);
                        const value = getNestedValue(row, column.key);
                        const conditionalFormattingResult = getCellConditionalClass(
                          column.key,
                          value
                        );
                        const width = columnWidths[column.key] || column.width || 150;
                        const alignClass = getAlignClass(column.align);

                        return (
                          <td
                            key={column.key}
                            className={cn(
                              densityConfig.cellPadding,
                              densityConfig.fontSize,
                              'text-gray-900 border-gray-100',
                              alignClass,
                              isFixedLeft &&
                                'sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                              isFixedRight &&
                                'sticky right-0 z-10 bg-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                              conditionalFormattingResult.className,
                              onRowClick && 'group-hover:bg-gray-50'
                            )}
                            style={{
                              ...stickyStyle,
                              ...conditionalFormattingResult.style,
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
                })
              : // Normal rendering without virtualization
                sortedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'transition-colors duration-150 hover:bg-gray-50',
                      onRowClick && 'cursor-pointer',
                      'border-b border-gray-100 last:border-b-0'
                    )}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {visibleColumnsList.map((column) => {
                      const isFixedLeft = isColumnFixed(column.key, 'left');
                      const isFixedRight = isColumnFixed(column.key, 'right');
                      const stickyStyle = getColumnStickyStyle(column.key);
                      const value = getNestedValue(row, column.key);
                      const conditionalFormattingResult = getCellConditionalClass(
                        column.key,
                        value
                      );
                      const width = columnWidths[column.key] || column.width || 150;
                      const alignClass = getAlignClass(column.align);

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            densityConfig.cellPadding,
                            densityConfig.fontSize,
                            'text-gray-900 border-gray-100',
                            alignClass,
                            isFixedLeft &&
                              'sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                            isFixedRight &&
                              'sticky right-0 z-10 bg-white shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]',
                            conditionalFormattingResult.className,
                            onRowClick && 'group-hover:bg-gray-50'
                          )}
                          style={{
                            ...stickyStyle,
                            ...conditionalFormattingResult.style,
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
                ))}
          </tbody>
        </table>
      </div>

      {/* Resizing Overlay */}
      {resizingColumn && <div className="fixed inset-0 z-50 cursor-col-resize" />}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">{t('loading')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTablePro;
