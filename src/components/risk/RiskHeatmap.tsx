'use client';

import { useMemo } from 'react';

import type { RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

interface HeatmapCell {
  rowId: string;
  colId: string;
  value: number;
  label: string;
  riskLevel?: RiskLevel;
}

interface RiskHeatmapProps {
  rows: { id: string; label: string }[];
  cols: { id: string; label: string }[];
  cells: HeatmapCell[];
  onCellClick?: (cell: HeatmapCell) => void;
  valueFormatter?: (value: number) => string;
  className?: string;
}

function getRiskColor(riskLevel?: RiskLevel): string {
  switch (riskLevel) {
    case 'normal':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'warning':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'severe':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-50 text-gray-500 border-gray-200';
  }
}

export function RiskHeatmap({
  rows,
  cols,
  cells,
  onCellClick,
  valueFormatter = (v) => `${v.toFixed(2)}%`,
  className,
}: RiskHeatmapProps) {
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of cells) {
      map.set(`${cell.rowId}:${cell.colId}`, cell);
    }
    return map;
  }, [cells]);

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `140px repeat(${cols.length}, minmax(90px, 1fr))`,
        }}
      >
        {/* Header */}
        <div className="p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Asset / Source
        </div>
        {cols.map((col) => (
          <div
            key={col.id}
            className="p-2 text-xs font-medium text-gray-600 text-center truncate"
            title={col.label}
          >
            {col.label}
          </div>
        ))}

        {/* Rows */}
        {rows.map((row) => (
          <>
            <div
              key={`label-${row.id}`}
              className="p-2 text-sm font-medium text-gray-900 flex items-center"
            >
              {row.label}
            </div>
            {cols.map((col) => {
              const cell = cellMap.get(`${row.id}:${col.id}`);
              return (
                <button
                  key={`${row.id}:${col.id}`}
                  onClick={() => cell && onCellClick?.(cell)}
                  disabled={!cell}
                  className={cn(
                    'p-2 rounded-md border text-xs font-mono transition-all hover:opacity-80',
                    cell ? getRiskColor(cell.riskLevel) : 'bg-gray-50 border-gray-100 text-gray-300'
                  )}
                  title={cell ? `${row.label} · ${col.label}: ${cell.label}` : 'No data'}
                >
                  {cell ? valueFormatter(cell.value) : '-'}
                </button>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export function formatPriceHeatmapValue(value: number): string {
  return formatPrice(value);
}
