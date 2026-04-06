'use client';

import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

import { getAlignClass } from '../utils/formatting';

import type { TableHeaderProps, ColumnDef, SortConfig } from '../types';

function renderSortIcon(columnKey: string, sortConfig: SortConfig[]) {
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
}

export function TableHeader<T extends Record<string, unknown>>({
  visibleColumns,
  sortConfig,
  columnWidths,
  densityConfig,
  resizable,
  onSort,
  onResizeStart,
  getColumnStickyStyle,
  isColumnFixed,
}: TableHeaderProps<T>) {
  return (
    <thead className="sticky top-0 z-30">
      <tr className="bg-transparent">
        {visibleColumns.map((column) => {
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
              onClick={() => column.sortable && onSort(column.key)}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate">{column.header}</span>
                {column.sortable && (
                  <span className="flex-shrink-0">{renderSortIcon(column.key, sortConfig)}</span>
                )}
                {resizable && (
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-10"
                    onMouseDown={(e) => onResizeStart(e, column.key)}
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
  );
}
