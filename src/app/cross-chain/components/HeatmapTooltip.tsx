'use client';

import { useMemo } from 'react';

import { type Blockchain, type PriceData } from '@/types/oracle';

import { chainNames } from '../utils';

export interface HeatmapTooltipProps {
  cell: { xChain: Blockchain; yChain: Blockchain; x?: number; y?: number } | null;
  heatmapData: { xChain: Blockchain; yChain: Blockchain; value: number; percent: number }[];
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  tooltipPosition: { x: number; y: number };
  isPinned: boolean;
  onClose: () => void;
}

export function HeatmapTooltip({
  cell,
  heatmapData,
  currentPrices,
  historicalPrices,
  tooltipPosition,
  isPinned,
  onClose,
}: HeatmapTooltipProps) {
  const cellData = cell
    ? heatmapData.find((d) => d.xChain === cell.xChain && d.yChain === cell.yChain)
    : null;
  const xPrice = cell ? currentPrices.find((p) => p.chain === cell.xChain)?.price : undefined;
  const yPrice = cell ? currentPrices.find((p) => p.chain === cell.yChain)?.price : undefined;

  const historicalPercentile = useMemo(() => {
    if (!cell) return null;

    const xHistorical = historicalPrices[cell.xChain] || [];
    const yHistorical = historicalPrices[cell.yChain] || [];

    if (xHistorical.length < 2 || yHistorical.length < 2 || !cellData) return null;

    const historicalDiffs: number[] = [];
    const timestamps = new Set<number>();

    xHistorical.forEach((p) => timestamps.add(p.timestamp));
    yHistorical.forEach((p) => timestamps.add(p.timestamp));

    timestamps.forEach((timestamp) => {
      const xHistPrice = xHistorical.find((p) => p.timestamp === timestamp)?.price;
      const yHistPrice = yHistorical.find((p) => p.timestamp === timestamp)?.price;
      if (
        xHistPrice !== undefined &&
        yHistPrice !== undefined &&
        xHistPrice > 0 &&
        yHistPrice > 0
      ) {
        const diffPercent = (Math.abs(xHistPrice - yHistPrice) / xHistPrice) * 100;
        historicalDiffs.push(diffPercent);
      }
    });

    if (historicalDiffs.length < 2) return null;

    const sortedDiffs = [...historicalDiffs].sort((a, b) => a - b);
    const currentValue = cellData.percent;

    let count = 0;
    for (const diff of sortedDiffs) {
      if (diff <= currentValue) count++;
    }

    return (count / sortedDiffs.length) * 100;
  }, [cell, cellData, historicalPrices]);

  if (!cell) return null;

  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 80) return 'text-red-600';
    if (percentile >= 60) return 'text-amber-500';
    if (percentile >= 40) return 'text-amber-600';
    return 'text-emerald-600';
  };

  return (
    <div
      className={`fixed z-50 bg-white border border-gray-200 p-4 min-w-[280px] rounded-lg shadow-lg ${
        isPinned ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      style={{
        left: `${Math.min(tooltipPosition.x + 15, typeof window !== 'undefined' ? window.innerWidth - 320 : 1000)}px`,
        top: `${Math.min(tooltipPosition.y + 15, typeof window !== 'undefined' ? window.innerHeight - 350 : 800)}px`,
      }}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span>{chainNames[cell.xChain]}</span>
          <span className="text-gray-400">vs</span>
          <span>{chainNames[cell.yChain]}</span>
        </div>
        {isPinned && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{chainNames[cell.xChain]} Price</span>
          <span className="font-mono text-gray-900 font-medium">
            $
            {xPrice?.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            }) || '-'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">{chainNames[cell.yChain]} Price</span>
          <span className="font-mono text-gray-900 font-medium">
            $
            {yPrice?.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            }) || '-'}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Absolute Difference</span>
          <span className="font-mono font-medium text-gray-900">
            ${cellData?.value.toFixed(4) || '-'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Percent Difference</span>
          <span
            className={`font-mono font-medium ${
              (cellData?.percent || 0) > 0.1 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {cellData?.percent.toFixed(2) || '-'}%
          </span>
        </div>

        {historicalPercentile !== null && (
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
            <span className="text-gray-600">Historical Percentile</span>
            <span className={`font-mono font-medium ${getPercentileColor(historicalPercentile)}`}>
              Higher than {historicalPercentile.toFixed(0)}% of historical data
            </span>
          </div>
        )}
      </div>

      {isPinned && (
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1 text-xs text-blue-600">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          <span>Pinned Comparison</span>
        </div>
      )}
    </div>
  );
}
