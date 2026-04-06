import type { ReactNode, CSSProperties } from 'react';

import type { VirtualItem } from '@tanstack/react-virtual';

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
  scrollPositionKey?: string;
  onRowClick?: (row: T, index: number) => void;
  onSort?: (sortConfig: SortConfig[]) => void;
  onDensityChange?: (density: 'compact' | 'normal' | 'comfortable') => void;
  className?: string;
}

export interface DensityToggleProps {
  density: 'compact' | 'normal' | 'comfortable';
  onChange: (density: 'compact' | 'normal' | 'comfortable') => void;
}

export interface ColumnVisibilityDropdownProps<T> {
  columns: ColumnDef<T>[];
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onToggleAll: () => void;
}

export interface DensityConfig {
  rowHeight: number;
  cellPadding: string;
  headerPadding: string;
  fontSize: string;
}

export interface TableHeaderProps<T> {
  columns: ColumnDef<T>[];
  visibleColumns: ColumnDef<T>[];
  sortConfig: SortConfig[];
  columnWidths: Record<string, number>;
  densityConfig: DensityConfig;
  fixedColumns?: FixedColumnsConfig;
  resizable: boolean;
  onSort: (key: string) => void;
  onResizeStart: (e: React.MouseEvent, columnKey: string) => void;
  getColumnStickyStyle: (key: string) => CSSProperties;
  isColumnFixed: (key: string, position: 'left' | 'right') => boolean;
}

export interface TableBodyProps<T> {
  data: T[];
  visibleColumns: ColumnDef<T>[];
  columnWidths: Record<string, number>;
  densityConfig: DensityConfig;
  fixedColumns?: FixedColumnsConfig;
  virtualScroll: boolean;
  virtualItems?: VirtualItem[];
  sortedData: T[];
  getCellConditionalClass: (
    columnKey: string,
    value: unknown
  ) => { className: string; style: CSSProperties };
  getColumnStickyStyle: (key: string) => CSSProperties;
  isColumnFixed: (key: string, position: 'left' | 'right') => boolean;
  onRowClick?: (row: T, index: number) => void;
  virtualizer?: {
    getTotalSize: () => number;
    measureElement: (element: HTMLElement | null) => void;
  };
}

export type { VirtualItem };
