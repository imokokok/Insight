'use client';

import { useState } from 'react';
import { SortConfig } from '../types';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface WinklinkDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  isLoading?: boolean;
}

export function WinklinkDataTable<T extends Record<string, unknown> | object>({
  data,
  columns,
  sortConfig: externalSortConfig,
  onSort: externalOnSort,
  isLoading,
}: WinklinkDataTableProps<T>) {
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig | undefined>();

  const sortConfig = externalSortConfig ?? internalSortConfig;

  const handleSort = (key: string) => {
    if (externalOnSort) {
      externalOnSort(key);
    } else {
      setInternalSortConfig((current) => {
        if (!current || current.key !== key) {
          return { key, direction: 'asc' };
        }
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      });
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = (a as Record<string, unknown>)[sortConfig.key];
    const bValue = (b as Record<string, unknown>)[sortConfig.key];
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-50 border-b border-gray-200" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 border-b border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.sortable ? 'cursor-pointer hover:text-gray-700' : ''}
                  ${column.width ? column.width : ''}
                `}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortConfig?.key === column.key && (
                    <span className="text-gray-400">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => (
            <tr
              key={index}
              className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-gray-900">
                  {column.render ? column.render(item as T) : String((item as Record<string, unknown>)[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
