'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';

import { chartColors, baseColors } from '@/lib/config/colors';
import { type OracleProvider } from '@/types/oracle';

import { oracleNames } from '../constants';

import { ChartTooltip } from './ChartTooltip';

interface FullscreenChartProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  oracleChartColors: Record<OracleProvider, string>;
  getChartData: () => any[];
  zoomLevel: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function FullscreenChart({
  isOpen,
  onClose,
  selectedSymbol,
  selectedOracles,
  oracleChartColors,
  getChartData,
  zoomLevel,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  t,
}: FullscreenChartProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('crossOracle.priceTrend')} - {selectedSymbol}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-3 text-sm text-gray-600 min-w-[4rem] text-center font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {t('crossOracle.chart.reset')}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="stdDevGradient1Fullscreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.15} />
                <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="stdDevGradient2Fullscreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.recharts.primary} stopOpacity={0.05} />
                <stop offset="100%" stopColor={chartColors.recharts.primary} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={baseColors.gray[200]} />
            <XAxis
              dataKey="timestamp"
              stroke={baseColors.gray[500]}
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke={baseColors.gray[500]}
              fontSize={12}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <RechartsTooltip content={<ChartTooltip t={t} />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="upperBound2"
              stroke="none"
              fill="url(#stdDevGradient2Fullscreen)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="lowerBound2"
              stroke="none"
              fill={chartColors.recharts.white}
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="upperBound1"
              stroke="none"
              fill="url(#stdDevGradient1Fullscreen)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="lowerBound1"
              stroke="none"
              fill={chartColors.recharts.white}
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              stroke={chartColors.recharts.purple}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              name={t('crossOracle.chart.avgPriceLine')}
            />
            {selectedOracles.map((oracle) => (
              <Line
                key={oracle}
                type="monotone"
                dataKey={oracleNames[oracle]}
                stroke={oracleChartColors[oracle]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  stroke: baseColors.gray[50],
                  fill: oracleChartColors[oracle],
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-0.5 bg-indigo-500"
            style={{ borderTop: `2px dashed ${chartColors.chart.indigoLight}` }}
          />
          <span>{t('crossOracle.chartLegend.avgPriceLine')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-indigo-500 border border-white" />
          <span>{t('crossOracle.chartLegend.dataPoint')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-3" style={{ backgroundColor: chartColors.chart.blueLight }} />
          <span>{t('crossOracle.chartLegend.stdDev1')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-3" style={{ backgroundColor: baseColors.primary[300] }} />
          <span>{t('crossOracle.chartLegend.stdDev2')}</span>
        </div>
      </div>
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">{t('crossOracle.chartLegend.pinchZoom')}</p>
      </div>
    </div>
  );
}
