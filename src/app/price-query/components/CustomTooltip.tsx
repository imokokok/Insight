'use client';

/**
 * @fileoverview Custom chart tooltip component
 * @description Displays detailed data point information, including multi-dimensional data display, change percentage calculation, data source identification, overflow detection
 */

import { useEffect, useRef, useState } from 'react';

import { chartColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatDateString, formatTimeString } from '@/lib/utils/format';

import { type ChartDataPoint } from '../constants';

import { Icons } from './Icons';

interface CustomTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
  payload?: ChartDataPoint & {
    isAnomaly?: boolean;
    anomalyReason?: string;
    deviation?: number;
    isPriceSpike?: boolean;
    spikeDirection?: 'up' | 'down';
    spikeMagnitude?: number;
    _avgPrice?: number;
    _prevValues?: Record<string, number>;
    _oracleInfo?: Record<string, { chain?: string; provider?: string }>;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string | number;
  coordinate?: { x: number; y: number };
}

/**
 * Calculate change percentage
 */
function calculateChangePercent(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate deviation percentage from average price
 */
function calculateDeviationPercent(value: number, avgPrice: number | undefined): number | null {
  if (avgPrice === undefined || avgPrice === 0) return null;
  return ((value - avgPrice) / avgPrice) * 100;
}

/**
 * Format change percentage display
 */
function formatChangePercent(percent: number | null): string {
  if (percent === null) return '-';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Detect and calculate tooltip position to avoid viewport overflow
 */
function calculateTooltipPosition(
  coordinate: { x: number; y: number } | undefined,
  tooltipWidth: number,
  tooltipHeight: number
): { left: number; top: number; transform: string } {
  if (!coordinate) {
    return { left: 0, top: 0, transform: 'translate(0, 0)' };
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const margin = 16;

  const chartContainer = document.querySelector('.recharts-wrapper');
  let containerRect = { left: 0, top: 0 };
  if (chartContainer) {
    const rect = chartContainer.getBoundingClientRect();
    containerRect = { left: rect.left, top: rect.top };
  }

  const left = containerRect.left + coordinate.x;
  let top = containerRect.top + coordinate.y;
  let transform = 'translate(10px, -50%)';

  if (left + tooltipWidth + margin > viewportWidth) {
    transform = 'translate(calc(-100% - 10px), -50%)';
  }

  if (top + tooltipHeight / 2 > viewportHeight - margin) {
    top = viewportHeight - tooltipHeight / 2 - margin;
  }

  if (top - tooltipHeight / 2 < margin) {
    top = tooltipHeight / 2 + margin;
  }

  return { left, top, transform };
}

/**
 * Custom chart tooltip component
 *
 * Displays timestamp and corresponding price data, including:
 * - Precise time (with date)
 * - Price (highlighted with large font)
 * - Change percentage from previous time point
 * - Deviation from average price
 * - Data source identification (oracle name, chain name)
 * - Overflow detection and automatic position adjustment
 */
export function CustomTooltip({ active, payload, label, coordinate }: CustomTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, transform: 'translate(0, 0)' });

  useEffect(() => {
    if (active && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const newPosition = calculateTooltipPosition(coordinate, rect.width, rect.height);
      setPosition(newPosition);
    }
  }, [active, coordinate, payload]);

  if (!active || !payload || payload.length === 0) return null;

  const firstPayload = payload[0]?.payload;
  const avgPrice = firstPayload?._avgPrice;
  const prevValues = firstPayload?._prevValues;
  const oracleInfo = firstPayload?._oracleInfo;

  const formatDateTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${formatDateString(date, 'full')}, ${formatTimeString(date)}`;
  };

  return (
    <div
      ref={tooltipRef}
      className="border shadow-lg rounded-lg p-3 min-w-[220px] fixed pointer-events-none"
      style={{
        backgroundColor: chartColors.recharts.white,
        borderColor: chartColors.recharts.border,
        left: position.left,
        top: position.top,
        transform: position.transform,
        zIndex: 1000,
      }}
    >
      {/* Time header */}
      <div
        className="flex items-center gap-1.5 mb-2 pb-2 border-b"
        style={{ borderColor: chartColors.recharts.border }}
      >
        <span style={{ color: chartColors.recharts.tick }}>
          <Icons.clock className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs" style={{ color: chartColors.recharts.tick }}>
          {formatDateTime(label)}
        </span>
      </div>

      {/* Data item list */}
      <div className="space-y-3">
        {payload.map((entry, index) => {
          const provider = entry.name as string;
          const color = entry.color as string;
          const value = entry.value as number;
          const dataKey = entry.dataKey as string;

          const prevValue = prevValues?.[dataKey];
          const changePercent = calculateChangePercent(value, prevValue);
          const isUp = changePercent !== null && changePercent >= 0;
          const isDown = changePercent !== null && changePercent < 0;

          const deviationPercent = calculateDeviationPercent(value, avgPrice);

          const info = oracleInfo?.[dataKey];
          const chainName = info?.chain;

          return (
            <div key={index} className="space-y-1.5">
              {/* Data source identifier row */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: chartColors.recharts.tickDark }}
                >
                  {provider}
                </span>
                {chainName && (
                  <span className="text-xs" style={{ color: chartColors.recharts.tick }}>
                    ({chainName})
                  </span>
                )}
              </div>

              {/* Price and change row */}
              <div className="flex items-baseline justify-between gap-3 pl-4.5">
                <span
                  className="text-lg font-bold"
                  style={{ color: chartColors.recharts.tickDark }}
                >
                  {formatPrice(value)}
                </span>
                {changePercent !== null && (
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-gray-500'
                    }`}
                  >
                    {isUp && <Icons.arrowUp className="w-3 h-3" />}
                    {isDown && <Icons.arrowDown className="w-3 h-3" />}
                    <span>{formatChangePercent(changePercent)}</span>
                  </div>
                )}
              </div>

              {/* Deviation info row */}
              {deviationPercent !== null && (
                <div className="flex items-center justify-between pl-4.5">
                  <span className="text-xs" style={{ color: chartColors.recharts.tick }}>
                    Deviation from avg
                  </span>
                  <span
                    className={`text-xs ${
                      Math.abs(deviationPercent) > 1
                        ? deviationPercent > 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatChangePercent(deviationPercent)}
                  </span>
                </div>
              )}

              {/* Divider (if not the last item) */}
              {index < payload.length - 1 && (
                <div
                  className="border-t mt-2 pt-2"
                  style={{ borderColor: chartColors.recharts.border }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
