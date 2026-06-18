'use client';

import { useMemo } from 'react';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

import type { SpotTwapDeviationPoint } from '../types/index';

// ── Colors ──
const COLORS = {
  spot: '#3B82F6',
  twap: '#10B981',
  consensus: '#9CA3AF',
  deviationNormal: '#3B82F6',
  deviationOver: '#EF4444',
  threshold: '#F59E0B',
} as const;

interface SpotTwapChartProps {
  deviationHistory: SpotTwapDeviationPoint[];
  threshold: number;
  symbol: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

// Custom legend
function ChartLegend() {
  return (
    <div className="flex items-center justify-center gap-5 pb-2 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 bg-blue-500 inline-block" />
        Spot Price
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
        TWAP Price
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 border-t-2 border-dotted border-gray-400 inline-block" />
        Consensus
      </span>
    </div>
  );
}

export function SpotTwapChart({
  deviationHistory,
  threshold,
  symbol: _symbol,
}: SpotTwapChartProps) {
  // Transform data for charts
  const chartData = useMemo(
    () =>
      deviationHistory.map((point) => ({
        time: formatTime(point.timestamp),
        timestamp: point.timestamp,
        spotPrice: point.spotPrice,
        twapPrice: point.twapPrice,
        consensusPrice: point.consensusPrice,
        deviationPercent: point.deviationPercent,
        isOverThreshold: point.isOverThreshold,
        deviationWithin: point.isOverThreshold ? 0 : Math.abs(point.deviationPercent),
        deviationOver: point.isOverThreshold ? Math.abs(point.deviationPercent) : 0,
      })),
    [deviationHistory]
  );

  if (deviationHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Waiting for data...</p>
        <p className="text-xs text-gray-400 mt-1">Spot/TWAP deviation chart will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <ChartLegend />

      {/* Upper: Price lines */}
      <ResponsiveContainer width="100%" height="60%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={formatPrice}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
            labelStyle={{ color: '#6B7280', fontWeight: 500 }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                spotPrice: 'Spot',
                twapPrice: 'TWAP',
                consensusPrice: 'Consensus',
              };
              return [formatPrice(Number(value)), labels[String(name)] || String(name)];
            }}
          />
          <Line
            type="monotone"
            dataKey="spotPrice"
            stroke={COLORS.spot}
            strokeWidth={2}
            dot={false}
            name="spotPrice"
          />
          <Line
            type="monotone"
            dataKey="twapPrice"
            stroke={COLORS.twap}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="twapPrice"
          />
          <Line
            type="monotone"
            dataKey="consensusPrice"
            stroke={COLORS.consensus}
            strokeWidth={1.5}
            strokeDasharray="2 4"
            dot={false}
            name="consensusPrice"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Lower: Deviation area */}
      <div className="mt-1">
        <ResponsiveContainer width="100%" height="35%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: '#6B7280', fontWeight: 500 }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  deviationWithin: 'Within Threshold',
                  deviationOver: 'Over Threshold',
                };
                return [`${Number(value).toFixed(2)}%`, labels[String(name)] || String(name)];
              }}
            />
            <ReferenceLine
              y={threshold}
              stroke={COLORS.threshold}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={-threshold}
              stroke={COLORS.threshold}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="deviationWithin"
              fill={COLORS.deviationNormal}
              fillOpacity={0.2}
              stroke={COLORS.deviationNormal}
              strokeWidth={1}
              name="deviationWithin"
            />
            <Area
              type="monotone"
              dataKey="deviationOver"
              fill={COLORS.deviationOver}
              fillOpacity={0.3}
              stroke={COLORS.deviationOver}
              strokeWidth={1}
              name="deviationOver"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
