'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Icons } from './Icons';
import { CustomTooltip } from './CustomTooltip';
import { CustomLegend } from './CustomLegend';
import { QueryResult, oracleColors } from '../constants';
import { createLogger } from '@/lib/utils/logger';
import { addTechnicalIndicators } from '../utils/technicalIndicators';

const logger = createLogger('price-query-PriceChart');

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: unknown;
}

interface PriceChartProps {
  chartData: ChartDataPoint[];
  queryResults: QueryResult[];
  hiddenSeries: Set<string>;
  onToggleSeries: (seriesName: string) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  selectedTimeRange: number;
}

export function PriceChart({
  chartData,
  queryResults,
  hiddenSeries,
  onToggleSeries,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  selectedTimeRange,
}: PriceChartProps) {
  const { t } = useI18n();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showMA7, setShowMA7] = useState(false);
  const [showMA30, setShowMA30] = useState(false);

  const generateFilename = useCallback((extension: string): string => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    return `price-query-${timestamp}.${extension}`;
  }, []);

  const handleExportChart = useCallback(async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const chartElement = chartContainerRef.current;
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = generateFilename('png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (error) {
      logger.error(
        'Failed to export chart',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, [generateFilename]);

  const legendPayload = useMemo(() => {
    return queryResults.map(({ provider, chain }) => {
      const label = `${t(`navbar.${provider.toLowerCase()}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      return { value: label, color: oracleColors[provider] };
    });
  }, [queryResults, t]);

  // Add technical indicators to chart data
  const enhancedChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;

    let enhanced = [...chartData];

    // Add MA indicators for each series
    queryResults.forEach(({ provider, chain }) => {
      const label = `${t(`navbar.${provider.toLowerCase()}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      enhanced = addTechnicalIndicators(enhanced, label);
    });

    return enhanced;
  }, [chartData, queryResults, t]);

  if (chartData.length === 0) return null;

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Icons.chart />
          {t('priceQuery.chart.title')}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300">
            <button
              onClick={onZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('priceQuery.chart.zoomOut')}
            >
              <Icons.zoomOut />
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700 border-x border-gray-300 min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              disabled={zoomLevel >= 3}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('priceQuery.chart.zoomIn')}
            >
              <Icons.zoomIn />
            </button>
          </div>
          <button
            onClick={onResetZoom}
            disabled={zoomLevel === 1}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={t('priceQuery.chart.reset')}
          >
            <Icons.reset />
            {t('priceQuery.chart.reset')}
          </button>
          <button
            onClick={handleExportChart}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            title={t('priceQuery.chart.exportImage')}
          >
            <Icons.image />
            {t('priceQuery.chart.exportImage')}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm font-medium text-gray-700">
          {t('priceQuery.chart.indicators')}:
        </span>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA7}
            onChange={(e) => setShowMA7(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">MA7</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA30}
            onChange={(e) => setShowMA30(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">MA30</span>
        </label>
      </div>
      <div
        ref={chartContainerRef}
        className="overflow-hidden"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          width: `${100 / zoomLevel}%`,
        }}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={enhancedChartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <defs>
                {queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}`;
                  const color = oracleColors[provider];
                  return (
                    <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={
                  <CustomLegend
                    payload={legendPayload}
                    onToggleSeries={onToggleSeries}
                    hiddenSeries={hiddenSeries}
                  />
                }
              />
              {queryResults.map(({ provider, chain }) => {
                const key = `${provider}-${chain}`;
                const label = `${t(`navbar.${provider.toLowerCase()}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                const color = oracleColors[provider];
                const isHidden = hiddenSeries.has(label);
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={label}
                    name={label}
                    stroke={isHidden ? 'transparent' : color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={isHidden ? false : { r: 5, strokeWidth: 0 }}
                  />
                );
              })}
              {/* MA7 Lines */}
              {showMA7 &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-MA7`;
                  const label = `${t(`navbar.${provider.toLowerCase()}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const maKey = `${label}_MA7`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={maKey}
                      name={`${label} MA7`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  );
                })}
              {/* MA30 Lines */}
              {showMA30 &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-MA30`;
                  const label = `${t(`navbar.${provider.toLowerCase()}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const maKey = `${label}_MA30`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={maKey}
                      name={`${label} MA30`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="10 5"
                      dot={false}
                      activeDot={false}
                    />
                  );
                })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
