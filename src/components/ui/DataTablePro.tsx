'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type CSSProperties,
} from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';

import {
  DensityToggle,
  ColumnVisibilityDropdown,
  TableHeader,
  TableBody,
} from './DataTablePro/components';
import { useColumnResize, useScrollPosition } from './DataTablePro/hooks';
import { isColumnFixed, getColumnStickyStyle } from './DataTablePro/utils/columns';
import {
  evaluateCondition,
  getConditionalStyle,
  getConditionalStyleCSS,
} from './DataTablePro/utils/formatting';
import { sortData, handleMultiSort } from './DataTablePro/utils/sorting';

import type { DataTableProProps, SortConfig, DensityConfig } from './DataTablePro/types';

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
  scrollPositionKey,
  onRowClick,
  onSort,
  onDensityChange,
  className,
}: DataTableProProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>(initialDensity);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.key))
  );

  const { columnWidths, resizingColumn, handleResizeStart } = useColumnResize(
    resizable,
    columns,
    {}
  );
  const { getSavedScrollPosition, saveScrollPosition } = useScrollPosition(scrollPositionKey);

  useEffect(() => setDensity(initialDensity), [initialDensity]);

  const handleDensityChange = useCallback(
    (newDensity: 'compact' | 'normal' | 'comfortable') => {
      setDensity(newDensity);
      onDensityChange?.(newDensity);
    },
    [onDensityChange]
  );

  const visibleColumnsList = useMemo(
    () => columns.filter((col) => visibleColumns.has(col.key)),
    [columns, visibleColumns]
  );

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
    setVisibleColumns((prev) =>
      prev.size === columns.length
        ? new Set(columns.filter((c) => c.fixed).map((c) => c.key))
        : new Set(columns.map((c) => c.key))
    );
  }, [columns]);

  const densityConfig = useMemo<DensityConfig>(() => {
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

  const handleSort = useCallback(
    (key: string) => setSortConfig((prev) => handleMultiSort(prev, key, multiSort, onSort)),
    [multiSort, onSort]
  );

  const sortedData = useMemo(() => sortData(data, sortConfig), [data, sortConfig]);

  const getCellConditionalClass = useCallback(
    (columnKey: string, value: unknown): { className: string; style: CSSProperties } => {
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

  const currentRowHeight = rowHeight || densityConfig.rowHeight;

  const virtualizer = useVirtualizer({
    count: virtualScroll ? sortedData.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => currentRowHeight,
    overscan: 10,
    enabled: virtualScroll,
    initialOffset: getSavedScrollPosition(),
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (!virtualScroll || !scrollPositionKey) return;
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    const handleScroll = () => saveScrollPosition(scrollElement.scrollTop);
    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [virtualScroll, scrollPositionKey, saveScrollPosition]);

  const isColumnFixedCallback = useCallback(
    (key: string, position: 'left' | 'right') => isColumnFixed(key, position, fixedColumns),
    [fixedColumns]
  );

  const getColumnStickyStyleCallback = useCallback(
    (key: string) => getColumnStickyStyle(key, fixedColumns, columns, columnWidths),
    [fixedColumns, columns, columnWidths]
  );

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
        <p className="text-gray-500 text-sm">{emptyText || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {(columnVisibility || densityToggle) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50/50">
          <div className="text-xs text-gray-500">
            Total {data.length} records
            {sortConfig.length > 0 && (
              <span className="ml-2 text-blue-600">
                Sorted:{' '}
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

      <div
        ref={scrollRef}
        className={cn('overflow-auto', virtualScroll && 'overflow-y-auto')}
        style={{ maxHeight: virtualScroll ? maxHeight : undefined }}
      >
        <table className="w-full border-collapse">
          <TableHeader
            columns={columns}
            visibleColumns={visibleColumnsList}
            sortConfig={sortConfig}
            columnWidths={columnWidths}
            densityConfig={densityConfig}
            fixedColumns={fixedColumns}
            resizable={resizable}
            onSort={handleSort}
            onResizeStart={handleResizeStart}
            getColumnStickyStyle={getColumnStickyStyleCallback}
            isColumnFixed={isColumnFixedCallback}
          />
          <TableBody
            data={data}
            visibleColumns={visibleColumnsList}
            columnWidths={columnWidths}
            densityConfig={densityConfig}
            fixedColumns={fixedColumns}
            virtualScroll={virtualScroll}
            virtualItems={virtualItems}
            sortedData={sortedData}
            getCellConditionalClass={getCellConditionalClass}
            getColumnStickyStyle={getColumnStickyStyleCallback}
            isColumnFixed={isColumnFixedCallback}
            onRowClick={onRowClick}
            virtualizer={virtualizer}
          />
        </table>
      </div>

      {resizingColumn && <div className="fixed inset-0 z-50 cursor-col-resize" />}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ColumnDef, ConditionalFormattingRule } from './DataTablePro/types';
