'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Cell,
  Legend,
} from 'recharts';
import { BaseOracleClient } from '@/lib/oracles/base';
import { BandProtocolClient, HistoricalPricePoint } from '@/lib/oracles/bandProtocol';
import { Blockchain } from '@/lib/types/oracle';
import { TimeRange } from './TabNavigation';

type ChartType = 'line' | 'candlestick';
type DataGranularity = 'minute' | 'hour' | 'day';

interface ChartDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ma7?: number;
  isComparison?: boolean;
}

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  hours: number;
}

interface CustomDateRange {
  startDate: string;
  endDate: string;
}

interface ComparisonPeriod {
  enabled: boolean;
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1H', label: '1H', hours: 1 },
  { value: '24H', label: '24H', hours: 24 },
  { value: '7D', label: '7D', hours: 24 * 7 },
  { value: '30D', label: '30D', hours: 24 * 30 },
  { value: '90D', label: '90D', hours: 24 * 90 },
  { value: '1Y', label: '1Y', hours: 24 * 365 },
];

const TIME_RANGE_CONFIG: Record<TimeRange, { hours: number; interval: number; label: string }> = {
  '1H': { hours: 1, interval: 2, label: '1小时' },
  '24H': { hours: 24, interval: 30, label: '24小时' },
  '7D': { hours: 24 * 7, interval: 4, label: '7天' },
  '30D': { hours: 24 * 30, interval: 24, label: '30天' },
  '90D': { hours: 24 * 90, interval: 72, label: '90天' },
  '1Y': { hours: 24 * 365, interval: 168, label: '1年' },
  ALL: { hours: 24 * 365 * 2, interval: 336, label: '全部' },
};

const GRANULARITY_CONFIG: Record<DataGranularity, { intervalMinutes: number; label: string }> = {
  minute: { intervalMinutes: 1, label: '分钟' },
  hour: { intervalMinutes: 60, label: '小时' },
  day: { intervalMinutes: 1440, label: '天' },
};

function generateHistoricalData(basePrice: number, timeRange: TimeRange): ChartDataPoint[] {
  const config = TIME_RANGE_CONFIG[timeRange];
  const now = Date.now();
  const dataPoints: ChartDataPoint[] = [];

  const totalMinutes = config.hours * 60;
  const dataCount = Math.min(Math.floor(totalMinutes / config.interval), 500);

  let currentPrice = basePrice;
  const volatility = 0.015;

  for (let i = dataCount; i >= 0; i--) {
    const timestamp = now - i * config.interval * 60 * 1000;
    const date = new Date(timestamp);

    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    let timeLabel: string;
    if (config.hours <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.hours <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  const dataWithMA = dataPoints.map((point, index) => {
    if (index < 6) {
      return { ...point, ma7: point.price };
    }
    const sum = dataPoints.slice(index - 6, index + 1).reduce((acc, p) => acc + p.price, 0);
    return { ...point, ma7: sum / 7 };
  });

  return dataWithMA;
}

function convertHistoricalPricePoints(
  points: HistoricalPricePoint[],
  isComparison: boolean = false
): ChartDataPoint[] {
  return points.map((point) => {
    const date = new Date(point.timestamp);
    let timeLabel: string;
    const hoursDiff = (Date.now() - point.timestamp) / (1000 * 60 * 60);

    if (hoursDiff <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (hoursDiff <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    return {
      time: timeLabel,
      timestamp: point.timestamp,
      price: point.price,
      volume: point.volume,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      isComparison,
    };
  });
}

function generateDataWithGranularity(
  basePrice: number,
  startDate: Date,
  endDate: Date,
  granularity: DataGranularity
): ChartDataPoint[] {
  const dataPoints: ChartDataPoint[] = [];
  const granularityConfig = GRANULARITY_CONFIG[granularity];
  const intervalMs = granularityConfig.intervalMinutes * 60 * 1000;

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  let currentPrice = basePrice;
  const volatility = 0.015;

  for (let timestamp = startTime; timestamp <= endTime; timestamp += intervalMs) {
    const date = new Date(timestamp);
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    let timeLabel: string;
    if (granularity === 'minute') {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (granularity === 'hour') {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  const dataWithMA = dataPoints.map((point, index) => {
    if (index < 6) {
      return { ...point, ma7: point.price };
    }
    const sum = dataPoints.slice(index - 6, index + 1).reduce((acc, p) => acc + p.price, 0);
    return { ...point, ma7: sum / 7 };
  });

  return dataWithMA;
}

function CustomTooltip({
  active,
  payload,
  label,
  chartType,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: ChartDataPoint }>;
  label?: string;
  chartType: ChartType;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isUp = data.close !== undefined && data.open !== undefined ? data.close >= data.open : true;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
      <p className="text-gray-600 text-xs mb-2 font-medium">{label}</p>

      {chartType === 'candlestick' && data.open !== undefined ? (
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">开盘:</span>
            <span className="text-gray-900 font-mono">${data.open.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">最高:</span>
            <span className="text-green-600 font-mono">${data.high?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">最低:</span>
            <span className="text-red-600 font-mono">${data.low?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">收盘:</span>
            <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              ${data.close?.toFixed(4)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">价格:</span>
          <span className="text-blue-600 font-mono">${data.price.toFixed(4)}</span>
        </div>
      )}

      {data.ma7 !== undefined && chartType === 'line' && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">MA7:</span>
          <span className="text-amber-600 font-mono">${data.ma7.toFixed(4)}</span>
        </div>
      )}

      <div className="flex justify-between gap-4 text-xs mt-2 pt-2 border-t border-gray-200">
        <span className="text-gray-500">成交量:</span>
        <span className="text-gray-700 font-mono">{(data.volume / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
}

function CandlestickShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ChartDataPoint;
}) {
  const { x = 0, y = 0, width = 0, payload } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  if (open === undefined || high === undefined || low === undefined || close === undefined) {
    return null;
  }

  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e';
  const bodyHeight = Math.abs(close - open);

  const centerX = x + width / 2;

  return (
    <g>
      <line
        x1={centerX}
        y1={y}
        x2={centerX}
        y2={y + (props.height || 0)}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x + width * 0.2}
        y={y + (isUp ? 0 : (props.height || 0) * 0.5)}
        width={width * 0.6}
        height={Math.max(bodyHeight, 2)}
        fill={color}
        rx={1}
      />
    </g>
  );
}

interface PriceChartProps {
  client: BaseOracleClient;
  symbol: string;
  chain?: Blockchain;
  initialTimeRange?: TimeRange;
  height?: number;
  showToolbar?: boolean;
  defaultPrice?: number;
}

export function PriceChart({
  client,
  symbol,
  chain,
  initialTimeRange = '24H',
  height = 400,
  showToolbar = true,
  defaultPrice,
}: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [chartType] = useState<ChartType>('line');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [comparisonData, setComparisonData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    startDate: '',
    endDate: '',
  });
  const [granularity, setGranularity] = useState<DataGranularity>('hour');
  const [comparison, setComparison] = useState<ComparisonPeriod>({
    enabled: false,
    period1Start: '',
    period1End: '',
    period2Start: '',
    period2End: '',
  });
  const [showComparisonPanel, setShowComparisonPanel] = useState(false);

  const isBandClient = client instanceof BandProtocolClient;

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);

      if (abortController.signal.aborted) return;

      setCurrentPrice(priceData.price);

      if (isBandClient && symbol.toUpperCase() === 'BAND') {
        const bandClient = client as BandProtocolClient;
        const periodMap: Record<TimeRange, '1d' | '7d' | '30d' | '90d' | '1y'> = {
          '1H': '1d',
          '24H': '1d',
          '7D': '7d',
          '30D': '30d',
          '90D': '90d',
          '1Y': '1y',
          ALL: '1y',
        };
        const historicalPoints = await bandClient.getHistoricalBandPrices(periodMap[timeRange]);
        const chartData = convertHistoricalPricePoints(historicalPoints);
        setData(chartData);
      } else {
        const historicalData = generateHistoricalData(priceData.price, timeRange);
        setData(historicalData);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;

      console.error('Error fetching price data:', error);
      const fallbackPrice = defaultPrice || 100;
      setCurrentPrice(fallbackPrice);
      setData(generateHistoricalData(fallbackPrice, timeRange));
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [chain, client, symbol, timeRange, defaultPrice, isBandClient]);

  const fetchCustomRangeData = useCallback(async () => {
    if (!customDateRange.startDate || !customDateRange.endDate) return;

    setLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);
      setCurrentPrice(priceData.price);

      const startDate = new Date(customDateRange.startDate);
      const endDate = new Date(customDateRange.endDate);

      if (isBandClient && symbol.toUpperCase() === 'BAND') {
        const bandClient = client as BandProtocolClient;
        const diffDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        let period: '1d' | '7d' | '30d' | '90d' | '1y' = '30d';
        if (diffDays <= 1) period = '1d';
        else if (diffDays <= 7) period = '7d';
        else if (diffDays <= 30) period = '30d';
        else if (diffDays <= 90) period = '90d';
        else period = '1y';

        const historicalPoints = await bandClient.getHistoricalBandPrices(period);
        const filteredPoints = historicalPoints.filter(
          (p) => p.timestamp >= startDate.getTime() && p.timestamp <= endDate.getTime()
        );
        const chartData = convertHistoricalPricePoints(filteredPoints);
        setData(chartData);
      } else {
        const chartData = generateDataWithGranularity(
          priceData.price,
          startDate,
          endDate,
          granularity
        );
        setData(chartData);
      }
    } catch (error) {
      console.error('Error fetching custom range data:', error);
    } finally {
      setLoading(false);
    }
  }, [customDateRange, client, symbol, chain, granularity, isBandClient]);

  const fetchComparisonData = useCallback(async () => {
    if (
      !comparison.period1Start ||
      !comparison.period1End ||
      !comparison.period2Start ||
      !comparison.period2End
    )
      return;

    setLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);
      setCurrentPrice(priceData.price);

      const period1Start = new Date(comparison.period1Start);
      const period1End = new Date(comparison.period1End);
      const period2Start = new Date(comparison.period2Start);
      const period2End = new Date(comparison.period2End);

      if (isBandClient && symbol.toUpperCase() === 'BAND') {
        const bandClient = client as BandProtocolClient;
        const historicalPoints = await bandClient.getHistoricalBandPrices('1y');

        const period1Points = historicalPoints.filter(
          (p) => p.timestamp >= period1Start.getTime() && p.timestamp <= period1End.getTime()
        );
        const period2Points = historicalPoints.filter(
          (p) => p.timestamp >= period2Start.getTime() && p.timestamp <= period2End.getTime()
        );

        const period1Data = convertHistoricalPricePoints(period1Points, false);
        const period2Data = convertHistoricalPricePoints(period2Points, true);

        setData(period1Data);
        setComparisonData(period2Data);
      } else {
        const period1Data = generateDataWithGranularity(
          priceData.price,
          period1Start,
          period1End,
          granularity
        );
        const period2Data = generateDataWithGranularity(
          priceData.price * 0.95,
          period2Start,
          period2End,
          granularity
        );

        setData(period1Data);
        setComparisonData(period2Data.map((d) => ({ ...d, isComparison: true })));
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  }, [comparison, client, symbol, chain, granularity, isBandClient]);

  useEffect(() => {
    if (showCustomDatePicker && customDateRange.startDate && customDateRange.endDate) {
      fetchCustomRangeData();
    } else if (comparison.enabled) {
      fetchComparisonData();
    } else {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    fetchData,
    fetchCustomRangeData,
    fetchComparisonData,
    showCustomDatePicker,
    comparison.enabled,
    customDateRange.startDate,
    customDateRange.endDate,
  ]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setShowCustomDatePicker(false);
    setComparison((prev) => ({ ...prev, enabled: false }));
  };

  const handleCustomDateApply = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setShowCustomDatePicker(true);
    }
  };

  const handleComparisonApply = () => {
    if (
      comparison.period1Start &&
      comparison.period1End &&
      comparison.period2Start &&
      comparison.period2End
    ) {
      setComparison((prev) => ({ ...prev, enabled: true }));
    }
  };

  const priceRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const allData = comparison.enabled ? [...data, ...comparisonData] : data;
    const prices = allData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [data, comparisonData, comparison.enabled]);

  const volumeRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 1000000 };
    const allData = comparison.enabled ? [...data, ...comparisonData] : data;
    const volumes = allData.map((d) => d.volume);
    const max = Math.max(...volumes);
    return { min: 0, max: max * 3 };
  }, [data, comparisonData, comparison.enabled]);

  const priceChange = useMemo(() => {
    if (data.length < 2) return { value: 0, percent: 0 };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const change = last - first;
    const percent = (change / first) * 100;
    return { value: change, percent };
  }, [data]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ height }}>
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">加载图表数据...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {showToolbar && (
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-2xl font-bold text-gray-900">${currentPrice.toFixed(4)}</span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    priceChange.percent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {priceChange.percent >= 0 ? '+' : ''}
                  {priceChange.percent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComparisonPanel(!showComparisonPanel)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  showComparisonPanel || comparison.enabled
                    ? 'bg-purple-50 text-purple-600 border-purple-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  对比
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeRangeChange(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    timeRange === option.value && !showCustomDatePicker && !comparison.enabled
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  showCustomDatePicker
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                自定义
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">粒度:</span>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(Object.keys(GRANULARITY_CONFIG) as DataGranularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      granularity === g
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {GRANULARITY_CONFIG[g].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {showCustomDatePicker && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">开始日期:</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) =>
                    setCustomDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">结束日期:</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) =>
                    setCustomDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCustomDateApply}
                disabled={!customDateRange.startDate || !customDateRange.endDate}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                应用
              </button>
              <button
                onClick={() => {
                  setShowCustomDatePicker(false);
                  setCustomDateRange({ startDate: '', endDate: '' });
                }}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          )}

          {showComparisonPanel && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">时间段对比</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 font-medium">时间段 1</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={comparison.period1Start}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period1Start: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-400">至</span>
                    <input
                      type="date"
                      value={comparison.period1End}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period1End: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 font-medium">时间段 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={comparison.period2Start}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period2Start: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-400">至</span>
                    <input
                      type="date"
                      value={comparison.period2End}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period2End: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleComparisonApply}
                  disabled={
                    !comparison.period1Start ||
                    !comparison.period1End ||
                    !comparison.period2Start ||
                    !comparison.period2End
                  }
                  className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  开始对比
                </button>
                <button
                  onClick={() => {
                    setComparison({
                      enabled: false,
                      period1Start: '',
                      period1End: '',
                      period2Start: '',
                      period2End: '',
                    });
                    setShowComparisonPanel(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  取消对比
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height - (showToolbar ? 180 : 0)}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
              minTickGap={30}
            />

            <YAxis
              yAxisId="price"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb', strokeOpacity: 0.5 }}
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
              width={60}
            />

            <YAxis
              yAxisId="volume"
              orientation="right"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              domain={[volumeRange.min, volumeRange.max]}
              hide
            />

            <Tooltip
              content={<CustomTooltip chartType={chartType} />}
              cursor={{
                stroke: '#d1d5db',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {comparison.enabled && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-gray-600">
                    {value === 'price' ? '时间段 1' : '时间段 2'}
                  </span>
                )}
              />
            )}

            <Bar yAxisId="volume" dataKey="volume" fill="#3b82f6" fillOpacity={0.2} stroke="none">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.close !== undefined &&
                    entry.open !== undefined &&
                    entry.close >= entry.open
                      ? '#10b981'
                      : '#f43f5e'
                  }
                  fillOpacity={0.3}
                />
              ))}
            </Bar>

            {chartType === 'line' && (
              <>
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }}
                  name="price"
                />
                {comparison.enabled && comparisonData.length > 0 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    data={comparisonData}
                    dataKey="price"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#7c3aed' }}
                    name="comparison"
                  />
                )}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="ma7"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              </>
            )}

            {chartType === 'candlestick' && (
              <Bar yAxisId="price" dataKey="high" shape={<CandlestickShape />} fill="transparent" />
            )}

            <Brush
              dataKey="time"
              height={30}
              stroke="#3b82f6"
              fill="#f3f4f6"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {chartType === 'line' && (
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-500">价格</span>
          </div>
          {comparison.enabled && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-0.5 bg-purple-500 rounded-full"
                style={{ borderTop: '2px dashed #8b5cf6' }}
              />
              <span className="text-xs text-gray-500">对比价格</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-0.5 bg-amber-500 rounded-full border-dashed"
              style={{ borderTop: '2px dashed #f59e0b' }}
            />
            <span className="text-xs text-gray-500">MA7</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500/30 rounded" />
            <span className="text-xs text-gray-500">成交量</span>
          </div>
        </div>
      )}
    </div>
  );
}
