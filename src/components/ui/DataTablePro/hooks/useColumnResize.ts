import { useCallback, useEffect, useState } from 'react';

import type { ColumnDef } from '../types';

export function useColumnResize<T>(
  resizable: boolean,
  columns: ColumnDef<T>[],
  columnWidths: Record<string, number>
) {
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>(columnWidths);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnKey: string) => {
      if (!resizable) return;
      e.preventDefault();
      e.stopPropagation();

      const currentWidth =
        widths[columnKey] || columns.find((c) => c.key === columnKey)?.width || 150;

      setResizingColumn(columnKey);
      setStartX(e.clientX);
      setStartWidth(currentWidth);
    },
    [resizable, widths, columns]
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

      setWidths((prev) => ({
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

  return {
    columnWidths: widths,
    resizingColumn,
    handleResizeStart,
  };
}

export function useScrollPosition(scrollPositionKey: string | undefined) {
  const getSavedScrollPosition = useCallback((): number => {
    if (!scrollPositionKey || typeof window === 'undefined') return 0;
    try {
      const saved = sessionStorage.getItem(`datatable-scroll-${scrollPositionKey}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }, [scrollPositionKey]);

  const saveScrollPosition = useCallback(
    (offset: number) => {
      if (!scrollPositionKey || typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(`datatable-scroll-${scrollPositionKey}`, String(offset));
      } catch {
        // Ignore sessionStorage errors
      }
    },
    [scrollPositionKey]
  );

  return {
    getSavedScrollPosition,
    saveScrollPosition,
  };
}
