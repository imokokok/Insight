'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { baseColors, semanticColors } from '@/lib/config/colors';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { chainNames } from '../utils';

interface HeatmapTooltipProps {
  cell: { xChain: Blockchain; yChain: Blockchain } | null;
  heatmapData: { xChain: Blockchain; yChain: Blockchain; value: number; percent: number }[];
  currentPrices: PriceData[];
  historicalPrices?: Record<string, unknown>;
  tooltipPosition: { x: number; y: number };
  isPinned?: boolean;
  onClose?: () => void;
}

const subscribeToViewport = (onStoreChange: () => void) => {
  window.addEventListener('resize', onStoreChange);
  return () => window.removeEventListener('resize', onStoreChange);
};

const getViewportWidth = () => window.innerWidth;
const getServerViewportWidth = () => 0;

export function HeatmapTooltip({
  cell,
  heatmapData,
  currentPrices,
  tooltipPosition,
  isPinned = false,
  onClose,
}: HeatmapTooltipProps) {
  const cellData = useMemo(() => {
    if (!cell) return null;
    return heatmapData.find((d) => d.xChain === cell.xChain && d.yChain === cell.yChain);
  }, [cell, heatmapData]);

  const priceData = useMemo(() => {
    if (!cell) return { xPrice: null, yPrice: null };
    const xPrice = currentPrices.find((p) => p.chain === cell.xChain)?.price ?? null;
    const yPrice = currentPrices.find((p) => p.chain === cell.yChain)?.price ?? null;
    return { xPrice, yPrice };
  }, [cell, currentPrices]);

  const viewportWidth = useSyncExternalStore(
    subscribeToViewport,
    getViewportWidth,
    getServerViewportWidth
  );

  if (!cell || !cellData) return null;

  const tooltipStyle = {
    position: 'fixed' as const,
    left: Math.min(tooltipPosition.x + 10, viewportWidth - 220),
    top: Math.max(tooltipPosition.y - 10, 10),
    transform: 'translateY(-100%)',
    zIndex: 1000,
  };

  return (
    <div
      className="min-w-[200px] border border-gray-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
      style={tooltipStyle}
    >
      {isPinned && onClose && (
        <button onClick={onClose} className="absolute right-1 top-1 p-1 hover:bg-gray-100">
          <svg
            className="w-4 h-4 text-gray-400"
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

      <div className="text-xs font-medium text-gray-500 mb-2">
        {chainNames[cell.xChain]} vs {chainNames[cell.yChain]}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">{chainNames[cell.xChain]}:</span>
          <span className="font-mono font-medium">
            {priceData.xPrice !== null ? `$${priceData.xPrice.toFixed(4)}` : '-'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{chainNames[cell.yChain]}:</span>
          <span className="font-mono font-medium">
            {priceData.yPrice !== null ? `$${priceData.yPrice.toFixed(4)}` : '-'}
          </span>
        </div>
        <div className="border-t pt-1.5 mt-1.5" style={{ borderColor: baseColors.gray[200] }}>
          <div className="flex justify-between">
            <span className="text-gray-500">Difference:</span>
            <span
              className="font-mono font-medium"
              style={{
                color:
                  cellData.percent > 0 ? semanticColors.danger.main : semanticColors.success.main,
              }}
            >
              {cellData.percent >= 0 ? '+' : ''}
              {cellData.percent.toFixed(4)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
