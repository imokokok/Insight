import type { CSSProperties } from 'react';

import type { FixedColumnsConfig, ColumnDef } from '../types';

export function isColumnFixed(
  key: string,
  position: 'left' | 'right',
  fixedColumns?: FixedColumnsConfig
): boolean {
  if (!fixedColumns) return false;
  return fixedColumns[position]?.includes(key) ?? false;
}

export function getColumnStickyStyle<T>(
  key: string,
  fixedColumns: FixedColumnsConfig | undefined,
  columns: ColumnDef<T>[],
  columnWidths: Record<string, number>
): CSSProperties {
  if (!fixedColumns) return {};

  if (isColumnFixed(key, 'left', fixedColumns)) {
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

  if (isColumnFixed(key, 'right', fixedColumns)) {
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
}
