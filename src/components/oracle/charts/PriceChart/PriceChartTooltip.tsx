'use client';

import React from 'react';

import { useTranslations } from '@/i18n';

import { type ChartType } from './priceChartConfig';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
}

interface MainChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  chartType?: ChartType;
  showBollingerBands?: boolean;
  showRSI?: boolean;
  showMACD?: boolean;
  isMobile?: boolean;
}

export function MainChartTooltip({ active, payload, label }: MainChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface RSITooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

export function RSITooltip({ active, payload, label }: RSITooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const rsiValue = payload[0]?.value;

  let interpretation = '';
  if (rsiValue !== undefined) {
    if (rsiValue >= 70) {
      interpretation = 'Overbought';
    } else if (rsiValue <= 30) {
      interpretation = 'Oversold';
    } else {
      interpretation = 'Neutral';
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        RSI: <span className="font-medium">{rsiValue?.toFixed(2)}</span>
      </p>
      <p className="text-xs text-gray-500">{interpretation}</p>
    </div>
  );
}

interface MACDTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

export function MACDTooltip({ active, payload, label }: MACDTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CandlestickShape(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload?: { open: number; close: number; high: number; low: number };
}) {
  const { x, y, width, height, payload } = props;

  if (!payload) {
    return null;
  }

  const { open, close, high, low } = payload;
  const isGreen = close >= open;
  const fillColor = isGreen ? '#10b981' : '#ef4444';

  const bodyTop = Math.min(y, y + height);
  const bodyHeight = Math.abs(height);

  return (
    <g>
      <line
        x1={x + width / 2}
        y1={y - (high - Math.max(open, close)) * 10}
        x2={x + width / 2}
        y2={bodyTop}
        stroke={fillColor}
        strokeWidth={1}
      />
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={Math.max(1, bodyHeight)}
        fill={fillColor}
        stroke={fillColor}
        strokeWidth={1}
      />
      <line
        x1={x + width / 2}
        y1={bodyTop + bodyHeight}
        x2={x + width / 2}
        y2={y + height + (low - Math.min(open, close)) * 10}
        stroke={fillColor}
        strokeWidth={1}
      />
    </g>
  );
}
