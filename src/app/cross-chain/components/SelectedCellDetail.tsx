'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import { baseColors, chartColors } from '@/lib/config/colors';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { chainNames, chainColors } from '../utils';

export interface SelectedCellDetailProps {
  heatmapData: { xChain: Blockchain; yChain: Blockchain; value: number; percent: number }[];
  currentPrices: PriceData[];
  chartData: Record<string, unknown>[];
  selectedCell: { xChain: Blockchain; yChain: Blockchain };
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
}

export function SelectedCellDetail({
  heatmapData,
  currentPrices,
  chartData,
  selectedCell,
  setSelectedCell,
}: SelectedCellDetailProps) {
  if (!selectedCell) return null;

  return (
    <div className="mt-4 border border-gray-200 overflow-hidden bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            {chainNames[selectedCell.xChain]} vs {chainNames[selectedCell.yChain]} Detail Comparison
          </span>
        </div>
        <button
          onClick={() => setSelectedCell(null)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
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
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {chainNames[selectedCell.xChain]} Price
            </div>
            <div className="text-xl font-semibold text-gray-900 font-mono">
              ${currentPrices.find((p) => p.chain === selectedCell.xChain)?.price.toFixed(4) || '-'}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {chainNames[selectedCell.yChain]} Price
            </div>
            <div className="text-xl font-semibold text-gray-900 font-mono">
              ${currentPrices.find((p) => p.chain === selectedCell.yChain)?.price.toFixed(4) || '-'}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Price Difference
            </div>
            <div className="text-xl font-semibold font-mono">
              <span
                className={
                  heatmapData.find(
                    (d) => d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain
                  )?.percent
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }
              >
                $
                {heatmapData
                  .find((d) => d.xChain === selectedCell.xChain && d.yChain === selectedCell.yChain)
                  ?.value.toFixed(4) || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Price Trend Comparison</div>
          <div className="h-48 bg-gray-50 border border-gray-200 p-2 rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={baseColors.gray[200]}
                  vertical={false}
                />
                <XAxis dataKey="time" stroke={chartColors.recharts.axis} tick={{ fontSize: 10 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => {
                    const absV = Math.abs(Number(v));
                    if (absV >= 1000) return `$${(Number(v) / 1000).toFixed(1)}K`;
                    if (absV >= 1) return `$${Number(v).toFixed(4)}`;
                    return `$${Number(v).toFixed(6)}`;
                  }}
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <RechartsTooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, '']} />
                <Line
                  type="monotone"
                  dataKey={selectedCell.xChain}
                  name={chainNames[selectedCell.xChain]}
                  stroke={chainColors[selectedCell.xChain]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={selectedCell.yChain}
                  name={chainNames[selectedCell.yChain]}
                  stroke={chainColors[selectedCell.yChain]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
