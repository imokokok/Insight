'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  ReferenceDot,
  LabelList,
} from 'recharts';
import { Icons } from './Icons';
import { CustomTooltip } from './CustomTooltip';
import { CustomLegend } from './CustomLegend';
import { QueryResult, oracleColors, oracleI18nKeys } from '../constants';
import { createLogger } from '@/lib/utils/logger';
import {
  addTechnicalIndicators,
  calculateBollingerBands,
  calculateConfidenceIntervals,
} from '../utils/technicalIndicators';
import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';

const logger = createLogger('price-query-PriceChart');

// 异常点接口
interface AnomalyPoint {
  index: number;
  timestamp: number;
  time: string;
  value: number;
  label: string;
  deviation: number;
  reason: string;
}

// 价格突变事件接口
interface PriceSpikeEvent {
  index: number;
  timestamp: number;
  time: string;
  label: string;
  changePercent: number;
  direction: 'up' | 'down';
  magnitude: number;
}

// 计算标准差
function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// 检测异常数据点（超过2个标准差）
function detectAnomalies(
  data: ChartDataPoint[],
  label: string,
  t: (key: string) => string,
  threshold: number = 2
): AnomalyPoint[] {
  const prices = data
    .map((d) => d[label] as number)
    .filter((p) => typeof p === 'number' && !isNaN(p));
  if (prices.length < 10) return [];

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = calculateStandardDeviation(prices);

  const anomalies: AnomalyPoint[] = [];
  data.forEach((point, index) => {
    const value = point[label] as number;
    if (typeof value !== 'number' || isNaN(value)) return;

    const deviation = (value - mean) / stdDev;
    if (Math.abs(deviation) > threshold) {
      anomalies.push({
        index,
        timestamp: point.timestamp,
        time: point.time,
        value,
        label,
        deviation,
        reason: deviation > 0 ? t('priceQuery.chart.priceHigh') : t('priceQuery.chart.priceLow'),
      });
    }
  });

  return anomalies;
}

// 检测价格突变事件
function detectPriceSpikes(
  data: ChartDataPoint[],
  label: string,
  changeThreshold: number = 0.05,
  windowSize: number = 3
): PriceSpikeEvent[] {
  const events: PriceSpikeEvent[] = [];

  for (let i = windowSize; i < data.length; i++) {
    const currentValue = data[i][label] as number;
    const prevValue = data[i - windowSize][label] as number;

    if (typeof currentValue !== 'number' || typeof prevValue !== 'number') continue;
    if (prevValue === 0) continue;

    const changePercent = (currentValue - prevValue) / prevValue;

    if (Math.abs(changePercent) > changeThreshold) {
      // 检查是否已存在相近的事件（避免重复标记）
      const lastEvent = events[events.length - 1];
      if (lastEvent && i - lastEvent.index < windowSize) continue;

      events.push({
        index: i,
        timestamp: data[i].timestamp,
        time: data[i].time,
        label,
        changePercent: changePercent * 100,
        direction: changePercent > 0 ? 'up' : 'down',
        magnitude: Math.abs(changePercent) * 100,
      });
    }
  }

  return events;
}

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
  selectedTimeRange: number;
  selectedRow: string | null;
  compareMode?: boolean;
  compareChartData?: ChartDataPoint[];
  compareQueryResults?: QueryResult[];
  showBaseline?: boolean;
  avgPrice?: number;
}

export function PriceChart({
  chartData,
  queryResults,
  hiddenSeries,
  onToggleSeries,
  selectedTimeRange: _selectedTimeRange,
  selectedRow,
  compareMode = false,
  compareChartData = [],
  compareQueryResults = [],
  showBaseline = false,
  avgPrice = 0,
}: PriceChartProps) {
  const t = useTranslations();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [showMA7, setShowMA7] = useState(false);
  const [showMA30, setShowMA30] = useState(false);
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(false);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});

  // 图表注释功能开关
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [showPriceSpikes, setShowPriceSpikes] = useState(false);
  const [showValueLabels, setShowValueLabels] = useState(false);

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
        ctx.fillStyle = baseColors.gray[50];
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
      const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      return { value: label, color: oracleColors[provider] };
    });
  }, [queryResults, t]);

  // 计算价格范围，用于确定是否需要多Y轴
  const priceRanges = useMemo(() => {
    if (chartData.length === 0) return [];

    return queryResults.map(({ provider, chain }) => {
      const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      const prices = chartData
        .map((d) => d[label] as number)
        .filter((p) => typeof p === 'number' && !isNaN(p));

      if (prices.length === 0) return { label, min: 0, max: 0, avg: 0 };

      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      return { label, min, max, avg };
    });
  }, [chartData, queryResults, t]);

  // 判断是否需要多Y轴（价格差异超过50%）
  const needsMultipleYAxes = useMemo(() => {
    if (priceRanges.length < 2) return false;
    const avgs = priceRanges.map((r) => r.avg).filter((a) => a > 0);
    if (avgs.length < 2) return false;
    const maxAvg = Math.max(...avgs);
    const minAvg = Math.min(...avgs);
    return (maxAvg - minAvg) / minAvg > 0.5;
  }, [priceRanges]);

  // 为每个系列分配Y轴ID
  const yAxisMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!needsMultipleYAxes) {
      queryResults.forEach(({ provider, chain }) => {
        const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
        map[label] = 'left';
      });
      return map;
    }

    // 价格相近的系列共享Y轴
    const sortedRanges = [...priceRanges].sort((a, b) => a.avg - b.avg);
    let currentAxisId = 0;
    let lastAvg = 0;

    sortedRanges.forEach((range, index) => {
      if (index === 0 || Math.abs(range.avg - lastAvg) / lastAvg > 0.3) {
        currentAxisId++;
        lastAvg = range.avg;
      }
      map[range.label] = `yaxis-${currentAxisId}`;
    });

    return map;
  }, [needsMultipleYAxes, priceRanges, queryResults, t]);

  // 获取唯一的Y轴ID列表
  const uniqueYAxisIds = useMemo(() => {
    const ids = new Set(Object.values(yAxisMap));
    return Array.from(ids);
  }, [yAxisMap]);

  // Add technical indicators to chart data
  const enhancedChartData = useMemo(() => {
    if (chartData.length === 0) return chartData;

    let enhanced = [...chartData];

    // Add MA indicators, Bollinger Bands, and Confidence Intervals for each series
    queryResults.forEach(({ provider, chain }) => {
      const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      const prices = enhanced.map((d) => d[label] as number).filter((p) => typeof p === 'number');

      if (prices.length === 0) return;

      // Add MA indicators
      enhanced = addTechnicalIndicators(enhanced, label);

      // Add Bollinger Bands
      const bb = calculateBollingerBands(prices, 20, 2);
      const bbKeys = {
        upper: `${label}_BB_Upper`,
        middle: `${label}_BB_Middle`,
        lower: `${label}_BB_Lower`,
      };

      enhanced = enhanced.map((point, index) => ({
        ...point,
        [bbKeys.upper]: bb.upper[index],
        [bbKeys.middle]: bb.middle[index],
        [bbKeys.lower]: bb.lower[index],
      }));

      // Add Confidence Intervals
      const ci = calculateConfidenceIntervals(prices, 20);
      const ciKeys = {
        upper1: `${label}_CI_Upper1`,
        lower1: `${label}_CI_Lower1`,
        upper2: `${label}_CI_Upper2`,
        lower2: `${label}_CI_Lower2`,
      };

      enhanced = enhanced.map((point, index) => ({
        ...point,
        [ciKeys.upper1]: ci.upper1[index],
        [ciKeys.lower1]: ci.lower1[index],
        [ciKeys.upper2]: ci.upper2[index],
        [ciKeys.lower2]: ci.lower2[index],
      }));
    });

    return enhanced;
  }, [chartData, queryResults, t]);

  // 计算异常数据点
  const anomalyPoints = useMemo(() => {
    if (!showAnomalies || enhancedChartData.length === 0) return [];

    const allAnomalies: AnomalyPoint[] = [];
    queryResults.forEach(({ provider, chain }) => {
      const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      if (hiddenSeries.has(label)) return;

      const anomalies = detectAnomalies(enhancedChartData, label, t, 2);
      allAnomalies.push(...anomalies);
    });

    return allAnomalies;
  }, [enhancedChartData, queryResults, t, hiddenSeries, showAnomalies]);

  // 计算价格突变事件
  const priceSpikeEvents = useMemo(() => {
    if (!showPriceSpikes || enhancedChartData.length === 0) return [];

    const allEvents: PriceSpikeEvent[] = [];
    queryResults.forEach(({ provider, chain }) => {
      const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
      if (hiddenSeries.has(label)) return;

      const events = detectPriceSpikes(enhancedChartData, label, 0.05, 3);
      allEvents.push(...events);
    });

    return allEvents;
  }, [enhancedChartData, queryResults, t, hiddenSeries, showPriceSpikes]);

  // 创建带注释信息的数据副本
  const annotatedChartData = useMemo(() => {
    if (!showAnomalies && !showPriceSpikes) return enhancedChartData;

    return enhancedChartData.map((point, index) => {
      const annotated = { ...point };

      // 检查是否是异常点
      if (showAnomalies) {
        const anomaly = anomalyPoints.find((a) => a.index === index);
        if (anomaly) {
          annotated.isAnomaly = true;
          annotated.anomalyReason = anomaly.reason;
          annotated.deviation = anomaly.deviation;
        }
      }

      // 检查是否是价格突变点
      if (showPriceSpikes) {
        const spike = priceSpikeEvents.find((e) => e.index === index);
        if (spike) {
          annotated.isPriceSpike = true;
          annotated.spikeDirection = spike.direction;
          annotated.spikeMagnitude = spike.magnitude;
        }
      }

      return annotated;
    });
  }, [enhancedChartData, anomalyPoints, priceSpikeEvents, showAnomalies, showPriceSpikes]);

  // 计算Brush的默认范围
  const brushDefaultRange = useMemo(() => {
    if (annotatedChartData.length === 0) return { startIndex: 0, endIndex: 0 };
    const dataLength = annotatedChartData.length;
    // 默认显示最近70%的数据
    const startIndex = Math.floor(dataLength * 0.3);
    return { startIndex, endIndex: dataLength - 1 };
  }, [annotatedChartData]);

  // 获取线条透明度
  const getLineOpacity = useCallback(
    (provider: string, chain: string): number => {
      if (!selectedRow) return 1;
      const rowKey = `${provider}-${chain}`;
      return selectedRow === rowKey ? 1 : 0.2;
    },
    [selectedRow]
  );

  // 获取线条粗细
  const getLineStrokeWidth = useCallback(
    (provider: string, chain: string): number => {
      if (!selectedRow) return 2;
      const rowKey = `${provider}-${chain}`;
      return selectedRow === rowKey ? 3 : 1;
    },
    [selectedRow]
  );

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 表头 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icons.chart className="w-4 h-4" />
          {t('priceQuery.chart.title')}
        </h2>
        <button
          onClick={handleExportChart}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors rounded"
        >
          <Icons.image className="w-3.5 h-3.5" />
          {t('priceQuery.chart.exportImage')}
        </button>
      </div>

      {/* 指标控制 */}
      <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-medium text-gray-600">
            {t('priceQuery.chart.indicators')}:
          </span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showMA7}
              onChange={(e) => setShowMA7(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">MA7</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showMA30}
              onChange={(e) => setShowMA30(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">MA30</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showBollingerBands}
              onChange={(e) => setShowBollingerBands(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">{t('priceQuery.chart.bollingerBands')}</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showConfidenceInterval}
              onChange={(e) => setShowConfidenceInterval(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">{t('priceQuery.chart.confidenceInterval')}</span>
          </label>
        </div>

        {/* 图表注释控制 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <Icons.alert className="w-3 h-3" />
            {t('priceQuery.chart.annotations')}:
          </span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAnomalies}
              onChange={(e) => setShowAnomalies(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">{t('priceQuery.chart.anomalyMarkers')}</span>
            {anomalyPoints.length > 0 && (
              <span className="text-[10px] text-red-600 font-medium">({anomalyPoints.length})</span>
            )}
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showPriceSpikes}
              onChange={(e) => setShowPriceSpikes(e.target.checked)}
              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">{t('priceQuery.chart.priceSpikes')}</span>
            {priceSpikeEvents.length > 0 && (
              <span className="text-[10px] text-orange-600 font-medium">({priceSpikeEvents.length})</span>
            )}
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showValueLabels}
              onChange={(e) => setShowValueLabels(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="text-xs text-gray-600">{t('priceQuery.chart.valueLabels')}</span>
          </label>
        </div>
      </div>

      {/* 图表 */}
      <div ref={chartContainerRef} className="p-4">
        <div className="h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={annotatedChartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 50 }}
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
                {/* 置信区间渐变色 */}
                {queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-ci`;
                  const color = oracleColors[provider];
                  return (
                    <linearGradient key={key} id={`ciGradient${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="50%" stopColor={color} stopOpacity={0.05} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.2} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartColors.recharts.grid}
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
                tickLine={false}
                axisLine={false}
                dy={10}
                minTickGap={40}
                interval="preserveStartEnd"
              />
              {/* 主Y轴 */}
              <YAxis
                yAxisId="left"
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              {/* 额外的Y轴（当价格差异大时） */}
              {needsMultipleYAxes &&
                uniqueYAxisIds
                  .filter((id) => id !== 'left')
                  .map((id, index) => (
                    <YAxis
                      key={id}
                      yAxisId={id}
                      orientation="right"
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 9, fill: chartColors.recharts.tick }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      offset={index * 50}
                    />
                  ))}
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

              {/* 置信区间阴影区域 - 2σ */}
              {showConfidenceInterval &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-ci2`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);
                  if (isHidden || opacity < 0.5) return null;

                  return (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={`${label}_CI_Upper2`}
                      stroke="none"
                      fill={`url(#ciGradient${provider}-${chain}-ci)`}
                      fillOpacity={opacity * 0.3}
                      yAxisId={yAxisMap[label] || 'left'}
                      baseLine={undefined}
                    />
                  );
                })}

              {/* 置信区间阴影区域 - 1σ */}
              {showConfidenceInterval &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-ci1`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);
                  if (isHidden || opacity < 0.5) return null;

                  return (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={`${label}_CI_Upper1`}
                      stroke="none"
                      fill={`url(#ciGradient${provider}-${chain}-ci)`}
                      fillOpacity={opacity * 0.5}
                      yAxisId={yAxisMap[label] || 'left'}
                      baseLine={undefined}
                    />
                  );
                })}

              {/* 布林带下轨 */}
              {showBollingerBands &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-bb-lower`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={`${label}_BB_Lower`}
                      name={`${label} BB Lower`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={opacity}
                      dot={false}
                      activeDot={false}
                      yAxisId={yAxisMap[label] || 'left'}
                    />
                  );
                })}

              {/* 布林带中轨 */}
              {showBollingerBands &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-bb-middle`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={`${label}_BB_Middle`}
                      name={`${label} BB Middle`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      strokeOpacity={opacity}
                      dot={false}
                      activeDot={false}
                      yAxisId={yAxisMap[label] || 'left'}
                    />
                  );
                })}

              {/* 布林带上轨 */}
              {showBollingerBands &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-bb-upper`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={`${label}_BB_Upper`}
                      name={`${label} BB Upper`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={opacity}
                      dot={false}
                      activeDot={false}
                      yAxisId={yAxisMap[label] || 'left'}
                    />
                  );
                })}

              {/* MA30 Lines */}
              {showMA30 &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-MA30`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const maKey = `${label}_MA30`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={maKey}
                      name={`${label} MA30`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="10 5"
                      strokeOpacity={opacity}
                      dot={false}
                      activeDot={false}
                      yAxisId={yAxisMap[label] || 'left'}
                    />
                  );
                })}

              {/* MA7 Lines */}
              {showMA7 &&
                queryResults.map(({ provider, chain }) => {
                  const key = `${provider}-${chain}-MA7`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const maKey = `${label}_MA7`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain);

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={maKey}
                      name={`${label} MA7`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      strokeOpacity={opacity}
                      dot={false}
                      activeDot={false}
                      yAxisId={yAxisMap[label] || 'left'}
                    />
                  );
                })}

              {/* 价格突变事件参考线 */}
              {showPriceSpikes &&
                priceSpikeEvents.map((event, index) => {
                  const color =
                    event.direction === 'up'
                      ? semanticColors.success.dark
                      : semanticColors.danger.DEFAULT;
                  const label = `${event.direction === 'up' ? '↑' : '↓'} ${event.magnitude.toFixed(1)}%`;

                  return (
                    <ReferenceLine
                      key={`spike-${index}`}
                      x={event.time}
                      stroke={color}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      yAxisId={yAxisMap[event.label] || 'left'}
                      label={{
                        value: label,
                        position: 'top',
                        fill: color,
                        fontSize: 9,
                      }}
                    />
                  );
                })}

              {/* 异常数据点标记 */}
              {showAnomalies &&
                anomalyPoints.map((anomaly, index) => {
                  const color =
                    anomaly.deviation > 0 ? semanticColors.danger.DEFAULT : baseColors.primary[500];
                  const strokeColor =
                    anomaly.deviation > 0 ? semanticColors.danger.dark : baseColors.primary[600];

                  return (
                    <ReferenceDot
                      key={`anomaly-${index}`}
                      x={anomaly.time}
                      y={anomaly.value}
                      r={5}
                      fill={color}
                      stroke={strokeColor}
                      strokeWidth={2}
                      yAxisId={yAxisMap[anomaly.label] || 'left'}
                    />
                  );
                })}

              {/* 基准线 - 使用 ReferenceLine 组件 */}
              {showBaseline && avgPrice > 0 && (
                <ReferenceLine
                  y={avgPrice}
                  label={{
                    value: `${t('priceQuery.chart.baseline')}: $${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    position: 'right',
                    fill: baseColors.gray[500],
                    fontSize: 10,
                  }}
                  stroke={baseColors.gray[500]}
                  strokeDasharray="8 4"
                  strokeWidth={1}
                  yAxisId="left"
                />
              )}

              {/* 对比数据价格线（虚线） */}
              {compareMode &&
                compareQueryResults.map(({ provider, chain }) => {
                  const key = `compare-${provider}-${chain}`;
                  const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                  const color = oracleColors[provider];
                  const isHidden = hiddenSeries.has(label);
                  const opacity = getLineOpacity(provider, chain) * 0.5; // 对比数据使用半透明度

                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={label}
                      name={`${label} ${t('priceQuery.chart.compareSuffix')}`}
                      stroke={isHidden ? 'transparent' : color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      strokeOpacity={opacity}
                      dot={false}
                      activeDot={false}
                      yAxisId={yAxisMap[label] || 'left'}
                      data={compareChartData}
                    />
                  );
                })}

              {/* 主价格线 */}
              {queryResults.map(({ provider, chain }) => {
                const key = `${provider}-${chain}`;
                const label = `${t(`navbar.${oracleI18nKeys[provider]}`)} (${t(`blockchain.${chain.toLowerCase()}`)})`;
                const color = oracleColors[provider];
                const isHidden = hiddenSeries.has(label);
                const opacity = getLineOpacity(provider, chain);
                const strokeWidth = getLineStrokeWidth(provider, chain);

                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={label}
                    name={label}
                    stroke={isHidden ? 'transparent' : color}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    dot={false}
                    activeDot={
                      isHidden
                        ? false
                        : { r: selectedRow === `${provider}-${chain}` ? 5 : 4, strokeWidth: 0 }
                    }
                    yAxisId={yAxisMap[label] || 'left'}
                  >
                    {showValueLabels && !isHidden && (
                      <LabelList
                        dataKey={label}
                        position="top"
                        formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                        fill={color}
                        fontSize={9}
                        offset={4}
                      />
                    )}
                  </Line>
                );
              })}

              {/* Brush 组件 - 用于缩放 */}
              <Brush
                dataKey="time"
                height={24}
                stroke={baseColors.gray[500]}
                fill={baseColors.gray[100]}
                startIndex={brushRange.startIndex ?? brushDefaultRange.startIndex}
                endIndex={brushRange.endIndex ?? brushDefaultRange.endIndex}
                onChange={(range) => {
                  if (
                    range &&
                    typeof range.startIndex === 'number' &&
                    typeof range.endIndex === 'number'
                  ) {
                    setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                  }
                }}
                travellerWidth={6}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
