'use client';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import { getAlignClass, getNestedValue } from '../utils/formatting';

import type { TableBodyProps, ColumnDef, VirtualItem } from '../types';

function renderCell<T>(column: ColumnDef<T>, row: T) {
  const value = getNestedValue(row, column.key);

  if (column.formatter) {
    return column.formatter(value, row);
  }

  if (value === null || value === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  return String(value);
}

interface TableRowProps<T> {
  row: T;
  rowIndex: number;
  visibleColumns: ColumnDef<T>[];
  columnWidths: Record<string, number>;
  densityConfig: {
    rowHeight: number;
    cellPadding: string;
    headerPadding: string;
    fontSize: string;
  };
  getCellConditionalClass: (
    columnKey: string,
    value: unknown
  ) => { className: string; style: CSSProperties };
  getColumnStickyStyle: (key: string) => CSSProperties;
  isColumnFixed: (key: string, position: 'left' | 'right') => boolean;
  onRowClick?: (row: T, index: number) => void;
  virtualStyle?: CSSProperties;
  virtualItem?: VirtualItem;
  virtualizer?: {
    getTotalSize: () => number;
    measureElement: (element: HTMLElement | null) => void;
  };
}

function TableRow<T extends Record<string, unknown>>({
  row,
  rowIndex,
  visibleColumns,
  columnWidths,
  densityConfig,
  getCellConditionalClass,
  getColumnStickyStyle,
  isColumnFixed,
  onRowClick,
  virtualStyle,
  virtualItem,
  virtualizer,
}: TableRowProps<T>) {
  const actualIndex = virtualItem?.index ?? rowIndex;

  return (
    <tr
      key={virtualItem?.key ?? rowIndex}
      data-index={virtualItem?.index}
      ref={virtualizer?.measureElement}
      className={cn(
        'transition-colors duration-150 hover:bg-gray-50',
        onRowClick && 'cursor-pointer',
        'border-b border-gray-100 last:border-b-0'
      )}
      style={virtualStyle}
      onClick={() => onRowClick?.(row, actualIndex)}
    >
      {visibleColumns.map((column) => {
        const isFixedLeft = isColumnFixed(column.key, 'left');
        const isFixedRight = isColumnFixed(column.key, 'right');
        const stickyStyle = getColumnStickyStyle(column.key);
        const value = getNestedValue(row, column.key);
        const conditionalFormattingResult = getCellConditionalClass(column.key, value);
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
              isFixedLeft && 'sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
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
}

export function TableBody<T extends Record<string, unknown>>({
  visibleColumns,
  columnWidths,
  densityConfig,
  virtualScroll,
  virtualItems,
  sortedData,
  getCellConditionalClass,
  getColumnStickyStyle,
  isColumnFixed,
  onRowClick,
  virtualizer,
}: TableBodyProps<T>) {
  return (
    <tbody
      style={
        virtualScroll
          ? {
              height: `${virtualizer?.getTotalSize()}px`,
              position: 'relative',
            }
          : undefined
      }
    >
      {virtualScroll
        ? virtualItems?.map((virtualItem) => {
            const row = sortedData[virtualItem.index];

            return (
              <TableRow
                key={virtualItem.key}
                row={row}
                rowIndex={virtualItem.index}
                visibleColumns={visibleColumns}
                columnWidths={columnWidths}
                densityConfig={densityConfig}
                getCellConditionalClass={getCellConditionalClass}
                getColumnStickyStyle={getColumnStickyStyle}
                isColumnFixed={isColumnFixed}
                onRowClick={onRowClick}
                virtualStyle={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                virtualItem={virtualItem}
                virtualizer={virtualizer}
              />
            );
          })
        : sortedData.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              row={row}
              rowIndex={rowIndex}
              visibleColumns={visibleColumns}
              columnWidths={columnWidths}
              densityConfig={densityConfig}
              getCellConditionalClass={getCellConditionalClass}
              getColumnStickyStyle={getColumnStickyStyle}
              isColumnFixed={isColumnFixed}
              onRowClick={onRowClick}
            />
          ))}
    </tbody>
  );
}
