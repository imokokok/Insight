'use client';

import { Fragment, useMemo } from 'react';

import { motion } from 'framer-motion';

import { Tooltip } from '@/components/ui/Tooltip';
import type { RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';

export interface HeatmapCell {
  rowId: string;
  colId: string;
  value: number;
  label: string;
  riskLevel?: RiskLevel;
  verificationType?: 'on-chain' | 'api';
  sourceChain?: string;
  dexName?: string;
}

interface RiskHeatmapProps {
  rows: { id: string; label: string }[];
  cols: { id: string; label: string }[];
  cells: HeatmapCell[];
  thresholds: { warning: number; critical: number; severe: number };
  onCellClick?: (cell: HeatmapCell) => void;
  valueFormatter?: (value: number) => string;
  className?: string;
}

interface HeatmapColor {
  bg: string;
  text: string;
}

function interpolateColor(color1: number[], color2: number[], factor: number): string {
  const r = Math.round(color1[0] + (color2[0] - color1[0]) * factor);
  const g = Math.round(color1[1] + (color2[1] - color1[1]) * factor);
  const b = Math.round(color1[2] + (color2[2] - color1[2]) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function getHeatmapColor(
  deviation: number,
  thresholds: RiskHeatmapProps['thresholds']
): HeatmapColor {
  const abs = Math.abs(deviation);

  // Color stops (RGB)
  const normal = [209, 250, 229]; // emerald-100
  const warning = [254, 243, 199]; // amber-100
  const critical = [254, 226, 226]; // red-100
  const severe = [243, 232, 255]; // purple-100
  const extreme = [237, 233, 254]; // purple-200

  if (abs <= thresholds.warning) {
    const factor = thresholds.warning === 0 ? 0 : abs / thresholds.warning;
    return { bg: interpolateColor(normal, warning, factor), text: '#065f46' };
  }
  if (abs <= thresholds.critical) {
    const factor = (abs - thresholds.warning) / (thresholds.critical - thresholds.warning);
    return { bg: interpolateColor(warning, critical, factor), text: '#92400e' };
  }
  if (abs <= thresholds.severe) {
    const factor = (abs - thresholds.critical) / (thresholds.severe - thresholds.critical);
    return { bg: interpolateColor(critical, severe, factor), text: '#991b1b' };
  }
  const factor = Math.min(1, (abs - thresholds.severe) / thresholds.severe);
  return { bg: interpolateColor(severe, extreme, factor), text: '#6b21a8' };
}

function getRiskLevelFromDeviation(
  deviation: number,
  thresholds: RiskHeatmapProps['thresholds']
): RiskLevel {
  const abs = Math.abs(deviation);
  if (abs >= thresholds.severe) return 'severe';
  if (abs >= thresholds.critical) return 'critical';
  if (abs >= thresholds.warning) return 'warning';
  return 'normal';
}

function formatRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'normal':
      return 'Normal';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
    case 'severe':
      return 'Severe';
  }
}

export function RiskHeatmap({
  rows,
  cols,
  cells,
  thresholds,
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

  const legendItems = useMemo(
    () => [
      { label: 'Normal', color: getHeatmapColor(0, thresholds).bg },
      { label: 'Warning', color: getHeatmapColor(thresholds.warning, thresholds).bg },
      { label: 'Critical', color: getHeatmapColor(thresholds.critical, thresholds).bg },
      { label: 'Severe', color: getHeatmapColor(thresholds.severe, thresholds).bg },
    ],
    [thresholds]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <div
          className="grid gap-px bg-slate-200 min-w-max"
          style={{
            gridTemplateColumns: `120px repeat(${cols.length}, minmax(100px, 1fr))`,
          }}
        >
          {/* Top-left corner */}
          <div className="sticky top-0 left-0 z-30 bg-white p-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-end">
            Asset / Source
          </div>

          {/* Header */}
          {cols.map((col) => (
            <div
              key={col.id}
              className="sticky top-0 z-20 bg-white p-2.5 text-[10px] font-semibold text-slate-600 text-center truncate border-b border-slate-100"
              title={col.label}
            >
              {col.label}
            </div>
          ))}

          {/* Rows */}
          {rows.map((row) => (
            <Fragment key={row.id}>
              <div
                className="sticky left-0 z-10 bg-white p-3 text-xs font-medium text-slate-900 flex items-center border-r border-slate-100"
                title={row.label}
              >
                {row.label}
              </div>
              {cols.map((col) => {
                const cell = cellMap.get(`${row.id}:${col.id}`);
                const color = cell
                  ? getHeatmapColor(cell.value, thresholds)
                  : { bg: '#f8fafc', text: '#cbd5e1' };
                const riskLevel = cell
                  ? (cell.riskLevel ?? getRiskLevelFromDeviation(cell.value, thresholds))
                  : undefined;

                return (
                  <Tooltip
                    key={`${row.id}:${col.id}`}
                    content={
                      cell ? (
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {row.label} · {col.label}
                          </div>
                          <div className="text-slate-300">{cell.label}</div>
                          {riskLevel && (
                            <div className="text-xs text-slate-300">
                              Risk: {formatRiskLabel(riskLevel)}
                            </div>
                          )}
                          {cell.verificationType && (
                            <div className="text-xs text-slate-300">
                              {cell.verificationType === 'on-chain' ? '🛡️ On-chain' : '🌐 API'}
                            </div>
                          )}
                        </div>
                      ) : (
                        'No data'
                      )
                    }
                    placement="top"
                  >
                    <motion.button
                      whileHover={cell ? { scale: 1.05 } : undefined}
                      transition={{ duration: 0.15 }}
                      onClick={() => cell && onCellClick?.(cell)}
                      disabled={!cell}
                      className={cn(
                        'p-2 text-[11px] font-mono text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        !cell && 'border border-dashed border-slate-200'
                      )}
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                      }}
                      title={cell ? `${row.label} · ${col.label}: ${cell.label}` : 'No data'}
                    >
                      {cell ? valueFormatter(cell.value) : '-'}
                    </motion.button>
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border border-slate-200"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-500">{item.label}</span>
          </div>
        ))}
        <span className="text-slate-400">· Continuous scale by deviation magnitude</span>
      </div>
    </div>
  );
}
