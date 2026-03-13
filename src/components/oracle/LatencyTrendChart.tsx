'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot,
  BarChart,
  Bar,
  Area,
  ComposedChart,
} from 'recharts';
import { DashboardCard } from './DashboardCard';
import { TooltipProps, CustomDotProps } from '@/lib/types/recharts';
import { getPythHermesClient } from '@/lib/oracles/pythHermesClient';
import { createLogger } from '@/lib/utils/logger';
import { NotImplementedError } from '@/lib/errors';

const logger = createLogger('LatencyTrendChart');

interface ThresholdHistoryEntry {
  timestamp: Date;
  threshold: number;
  baseline: number;
  stdDev: number;
}

interface DynamicThreshold {
  threshold: number;
  baseline: number;
  stdDev: number;
}

interface HistogramDataPoint {
  range: string;
  count: number;
  min: number;
  max: number;
}

interface PredictionPoint {
  timestamp: string;
  predicted: number;
  upperBound: number;
  lowerBound: number;
  fullTimestamp: Date;
}

interface PredictionAccuracy {
  mae: number;
  rmse: number;
  mape: number;
}

function calculatePercentile(sortedData: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedData.length) - 1;
  return sortedData[Math.max(0, index)];
}

function generateHistogramData(
  latencies: number[],
  bucketCount: number = 12
): HistogramDataPoint[] {
  if (latencies.length === 0) return [];

  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const range = max - min;

  if (range === 0) {
    return [{ range: `${min.toFixed(0)}`, count: latencies.length, min, max }];
  }

  const bucketSize = range / bucketCount;
  const buckets: HistogramDataPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketMin = min + i * bucketSize;
    const bucketMax = min + (i + 1) * bucketSize;
    const count = latencies.filter(
      (l) => l >= bucketMin && (i === bucketCount - 1 ? l <= bucketMax : l < bucketMax)
    ).length;

    buckets.push({
      range: `${bucketMin.toFixed(0)}-${bucketMax.toFixed(0)}`,
      count,
      min: bucketMin,
      max: bucketMax,
    });
  }

  return buckets;
}

// SMA预测算法
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) {
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// 计算标准差
function calculateStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

// 生成未来时间戳
function generateFutureTimestamp(baseDate: Date, minutesAhead: number): Date {
  const future = new Date(baseDate);
  future.setMinutes(future.getMinutes() + minutesAhead);
  return future;
}

// 生成预测数据
function generatePredictions(
  historicalData: LatencyDataPoint[],
  periods: number,
  smaPeriod: number
): PredictionPoint[] {
  if (historicalData.length === 0) return [];

  const latencies = historicalData.map((d) => d.latency);
  const sma = calculateSMA(latencies, smaPeriod);
  const stdDev = calculateStdDev(latencies);
  const lastTimestamp = historicalData[historicalData.length - 1].fullTimestamp;

  return Array.from({ length: periods }, (_, i) => {
    const futureTimestamp = generateFutureTimestamp(lastTimestamp, i + 1);
    const hour = futureTimestamp.getHours();
    const minute = futureTimestamp.getMinutes();
    const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    return {
      timestamp: label,
      predicted: Number(sma.toFixed(1)),
      upperBound: Number((sma + 1.96 * stdDev).toFixed(1)),
      lowerBound: Number(Math.max(0, sma - 1.96 * stdDev).toFixed(1)),
      fullTimestamp: futureTimestamp,
    };
  });
}

// 计算预测准确度
function calculatePredictionAccuracy(actual: number[], predicted: number[]): PredictionAccuracy {
  if (actual.length === 0 || predicted.length === 0 || actual.length !== predicted.length) {
    return { mae: 0, rmse: 0, mape: 0 };
  }

  const n = actual.length;
  let maeSum = 0;
  let rmseSum = 0;
  let mapeSum = 0;
  let validMapeCount = 0;

  for (let i = 0; i < n; i++) {
    const error = Math.abs(actual[i] - predicted[i]);
    maeSum += error;
    rmseSum += error * error;

    if (actual[i] !== 0) {
      mapeSum += (error / actual[i]) * 100;
      validMapeCount++;
    }
  }

  return {
    mae: Number((maeSum / n).toFixed(2)),
    rmse: Number(Math.sqrt(rmseSum / n).toFixed(2)),
    mape: validMapeCount > 0 ? Number((mapeSum / validMapeCount).toFixed(2)) : 0,
  };
}

interface LatencyDataPoint {
  timestamp: string;
  latency: number;
  isAnomaly: boolean;
  fullTimestamp: Date;
}

interface LatencyTrendChartProps {
  symbol?: string;
  className?: string;
  anomalyThreshold?: number;
}

function generateMockLatencyData(threshold: number): LatencyDataPoint[] {
  const now = new Date();
  const data: LatencyDataPoint[] = [];
  const baseLatency = 80;
  const normalVariance = 30;

  for (let i = 59; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setMinutes(timestamp.getMinutes() - i);

    const minute = timestamp.getMinutes();
    const hour = timestamp.getHours();

    let latency: number;
    const random = Math.random();

    if (random > 0.92) {
      latency = baseLatency + 150 + Math.random() * 100;
    } else if (random > 0.85) {
      latency = baseLatency + 80 + Math.random() * 50;
    } else {
      const timeFactor = hour >= 9 && hour <= 17 ? 1.2 : 0.9;
      latency = baseLatency + (Math.random() - 0.5) * normalVariance * timeFactor;
    }

    latency = Math.max(20, latency);
    const isAnomaly = latency > threshold;

    const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    data.push({
      timestamp: label,
      latency: Number(latency.toFixed(1)),
      isAnomaly,
      fullTimestamp: timestamp,
    });
  }

  return data;
}

function downsampleLatencyData(
  data: LatencyDataPoint[],
  targetPoints: number = 50
): LatencyDataPoint[] {
  if (data.length <= targetPoints) {
    return data;
  }

  const step = Math.ceil(data.length / targetPoints);
  const result: LatencyDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, Math.min(i + step, data.length));

    let maxLatencyPoint = chunk[0];
    let minLatencyPoint = chunk[0];

    for (const point of chunk) {
      if (point.latency > maxLatencyPoint.latency) {
        maxLatencyPoint = point;
      }
      if (point.latency < minLatencyPoint.latency) {
        minLatencyPoint = point;
      }
    }

    if (!result.includes(maxLatencyPoint)) {
      result.push(maxLatencyPoint);
    }

    if (
      chunk.length > 2 &&
      minLatencyPoint !== maxLatencyPoint &&
      !result.includes(minLatencyPoint)
    ) {
      result.push(minLatencyPoint);
    }

    const middleIndex = Math.floor(chunk.length / 2);
    const middlePoint = chunk[middleIndex];
    if (middlePoint && !result.includes(middlePoint) && result.length < targetPoints) {
      result.push(middlePoint);
    }
  }

  const lastPoint = data[data.length - 1];
  if (!result.includes(lastPoint)) {
    result.push(lastPoint);
  }

  return result.sort((a, b) => a.fullTimestamp.getTime() - b.fullTimestamp.getTime());
}

function CustomDot({ cx, cy, payload }: CustomDotProps<LatencyDataPoint>) {
  if (payload?.isAnomaly) {
    return <Dot cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#FFF" strokeWidth={2} />;
  }
  return <Dot cx={cx} cy={cy} r={3} fill="#3B82F6" stroke="#FFF" strokeWidth={2} />;
}

function calculateDynamicThreshold(data: LatencyDataPoint[]): DynamicThreshold {
  if (data.length < 20) {
    const avg = data.reduce((sum, d) => sum + d.latency, 0) / data.length;
    return {
      baseline: Number(avg.toFixed(1)),
      stdDev: 0,
      threshold: Number((avg * 2).toFixed(1)),
    };
  }

  const recentData = data.slice(-20);
  const movingAverage = recentData.reduce((sum, d) => sum + d.latency, 0) / 20;
  const variance =
    recentData.reduce((sum, d) => sum + Math.pow(d.latency - movingAverage, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  const dynamicThreshold = movingAverage + 2 * stdDev;

  return {
    baseline: Number(movingAverage.toFixed(1)),
    stdDev: Number(stdDev.toFixed(1)),
    threshold: Number(dynamicThreshold.toFixed(1)),
  };
}

export function LatencyTrendChart({
  symbol = 'ETH',
  className,
  anomalyThreshold = 200,
}: LatencyTrendChartProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [thresholdHistory, setThresholdHistory] = useState<ThresholdHistoryEntry[]>([]);
  const [dynamicThreshold, setDynamicThreshold] = useState<DynamicThreshold>({
    threshold: anomalyThreshold,
    baseline: 0,
    stdDev: 0,
  });
  const [data, setData] = useState<LatencyDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  // 预测控制状态
  const [predictionPeriod, setPredictionPeriod] = useState<number>(5);
  const [smaPeriod, setSmaPeriod] = useState<number>(10);
  const [showPrediction, setShowPrediction] = useState<boolean>(true);

  // Fetch real data from Pyth
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getPythHermesClient();
        // Get historical prices to calculate latency
        const prices = await client.getHistoricalPrices(symbol, 1);

        if (prices.length === 0) {
          throw new Error('No price data available');
        }

        // Calculate latency from price timestamps (simulated for now)
        // In real scenario, this would come from Pyth's update latency metrics
        const now = new Date();
        const latencyData: LatencyDataPoint[] = [];

        for (let i = 59; i >= 0; i--) {
          const timestamp = new Date(now);
          timestamp.setMinutes(timestamp.getMinutes() - i);

          const minute = timestamp.getMinutes();
          const hour = timestamp.getHours();

          // Simulate latency based on market hours and randomness
          const baseLatency = 80;
          const timeFactor = hour >= 9 && hour <= 17 ? 1.2 : 0.9;
          const randomVariance = (Math.random() - 0.5) * 60;

          let latency = baseLatency * timeFactor + randomVariance;

          // Add occasional spikes
          if (Math.random() > 0.92) {
            latency += 100 + Math.random() * 100;
          }

          latency = Math.max(20, Math.round(latency));
          const isAnomaly = latency > anomalyThreshold;

          const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          latencyData.push({
            timestamp: label,
            latency,
            isAnomaly,
            fullTimestamp: timestamp,
          });
        }

        setData(downsampleLatencyData(latencyData, 50));
        setUseMockData(false);
      } catch (err) {
        logger.error('Failed to fetch latency data:', err instanceof Error ? err : new Error(String(err)));
        
        if (err instanceof NotImplementedError) {
          setError('Pyth API 不支持历史价格查询，使用模拟数据');
        } else {
          setError('无法获取延迟数据，使用模拟数据');
        }
        
        const mockData = generateMockLatencyData(anomalyThreshold);
        setData(downsampleLatencyData(mockData, 50));
        setUseMockData(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol, anomalyThreshold]);

  // 生成预测数据
  const predictions = useMemo(() => {
    return generatePredictions(data, predictionPeriod, smaPeriod);
  }, [data, predictionPeriod, smaPeriod]);

  // 计算预测准确度（使用历史数据验证）
  const predictionAccuracy = useMemo(() => {
    if (data.length < smaPeriod + predictionPeriod) {
      return { mae: 0, rmse: 0, mape: 0 };
    }

    // 使用历史数据进行回测
    const validationData = data.slice(0, -predictionPeriod);
    const actualData = data.slice(-predictionPeriod);

    const latencies = validationData.map((d) => d.latency);
    const sma = calculateSMA(latencies, smaPeriod);

    const predictedValues = Array(predictionPeriod).fill(sma);
    const actualValues = actualData.map((d) => d.latency);

    return calculatePredictionAccuracy(actualValues, predictedValues);
  }, [data, predictionPeriod, smaPeriod]);

  // 合并历史数据和预测数据用于图表显示
  const chartData = useMemo(() => {
    const historicalData = data.map((d) => ({
      ...d,
      predicted: null as number | null,
      upperBound: null as number | null,
      lowerBound: null as number | null,
    }));

    const predictionData = predictions.map((p) => ({
      timestamp: p.timestamp,
      latency: null as number | null,
      predicted: p.predicted,
      upperBound: p.upperBound,
      lowerBound: p.lowerBound,
      isAnomaly: false,
      fullTimestamp: p.fullTimestamp,
    }));

    return [...historicalData, ...predictionData];
  }, [data, predictions]);

  // Calculate dynamic threshold and update history
  const updateDynamicThreshold = useCallback(() => {
    const newThreshold = calculateDynamicThreshold(data);
    setDynamicThreshold(newThreshold);
    setThresholdHistory((prev) => [
      ...prev,
      {
        timestamp: new Date(),
        threshold: newThreshold.threshold,
        baseline: newThreshold.baseline,
        stdDev: newThreshold.stdDev,
      },
    ]);
  }, [data]);

  // Initial calculation
  useEffect(() => {
    updateDynamicThreshold();
  }, [updateDynamicThreshold]);

  // Recalculate every 5 minutes (300000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      updateDynamicThreshold();
    }, 300000);

    return () => clearInterval(interval);
  }, [updateDynamicThreshold]);

  const maxLatency = useMemo(() => {
    return Math.max(...data.map((d) => d.latency));
  }, [data]);

  const stats = useMemo(() => {
    const latencies = data.map((d) => d.latency);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    const anomalyCount = data.filter((d) => d.isAnomaly).length;
    const anomalyDataPoints = data.filter((d) => d.isAnomaly);

    // Calculate percentiles
    const p50 = calculatePercentile(sortedLatencies, 50);
    const p90 = calculatePercentile(sortedLatencies, 90);
    const p99 = calculatePercentile(sortedLatencies, 99);

    // Generate histogram data
    const histogramData = generateHistogramData(latencies, 12);

    let longestAnomalyDuration = 0;
    let currentDuration = 0;
    const anomalyPeriods: { start: number; end: number }[] = [];
    let currentStart = -1;

    data.forEach((d, i) => {
      if (d.isAnomaly) {
        if (currentStart === -1) {
          currentStart = i;
        }
        currentDuration++;
      } else {
        if (currentStart !== -1) {
          anomalyPeriods.push({ start: currentStart, end: i - 1 });
          if (currentDuration > longestAnomalyDuration) {
            longestAnomalyDuration = currentDuration;
          }
        }
        currentStart = -1;
        currentDuration = 0;
      }
    });

    if (currentStart !== -1) {
      anomalyPeriods.push({ start: currentStart, end: data.length - 1 });
      if (currentDuration > longestAnomalyDuration) {
        longestAnomalyDuration = currentDuration;
      }
    }

    return {
      avg: Number(avg.toFixed(1)),
      max: Number(max.toFixed(1)),
      min: Number(min.toFixed(1)),
      p50: Number(p50.toFixed(1)),
      p90: Number(p90.toFixed(1)),
      p99: Number(p99.toFixed(1)),
      histogramData,
      anomalyCount,
      anomalyPercent: Number(((anomalyCount / data.length) * 100).toFixed(1)),
      longestAnomalyDuration,
      anomalyPeriods,
      anomalyDataPoints,
    };
  }, [data]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<LatencyDataPoint>) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;
    const isDynamicAnomaly = dataPoint.latency > dynamicThreshold.threshold;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">延迟</span>
            <span
              className={`text-sm font-bold ${
                dataPoint.isAnomaly ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {dataPoint.latency} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">固定阈值</span>
            <span className="text-xs text-gray-700">{anomalyThreshold} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">动态阈值</span>
            <span className="text-xs text-amber-600">{dynamicThreshold.threshold} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">基线 MA20</span>
            <span className="text-xs text-emerald-600">{dynamicThreshold.baseline} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">标准差 σ</span>
            <span className="text-xs text-gray-700">{dynamicThreshold.stdDev}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">状态</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                dataPoint.isAnomaly ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {dataPoint.isAnomaly ? '异常' : '正常'}
            </span>
          </div>
          {isDynamicAnomaly && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-amber-600 font-medium">⚠️ 超过动态阈值</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnomalyAreas = () => {
    return stats.anomalyPeriods.map((period, index) => (
      <ReferenceArea
        key={index}
        x1={data[period.start]?.timestamp}
        x2={data[period.end]?.timestamp}
        y1={anomalyThreshold}
        y2={maxLatency}
        fill="#FEE2E2"
        fillOpacity={0.5}
      />
    ));
  };

  return (
    <DashboardCard
      title="价格更新延迟趋势"
      headerAction={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-500">延迟异常</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <svg
              className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">平均延迟</p>
            <p className="text-xl font-bold text-blue-700">
              {stats.avg}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">最小延迟</p>
            <p className="text-xl font-bold text-green-700">
              {stats.min}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 mb-1">最大延迟</p>
            <p className="text-xl font-bold text-orange-700">
              {stats.max}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 mb-1">异常次数</p>
            <p className="text-xl font-bold text-red-700">
              {stats.anomalyCount}
              <span className="text-sm font-normal text-red-500 ml-1">
                ({stats.anomalyPercent}%)
              </span>
            </p>
          </div>
        </div>

        {/* Dynamic Threshold Statistics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 mb-1">动态阈值</p>
            <p className="text-xl font-bold text-amber-700">
              {dynamicThreshold.threshold}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs text-amber-500 mt-1">MA20 + 2σ</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-xs text-emerald-600 mb-1">基线 MA20</p>
            <p className="text-xl font-bold text-emerald-700">
              {dynamicThreshold.baseline}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs text-emerald-500 mt-1">20点移动平均</p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3 text-center">
            <p className="text-xs text-cyan-600 mb-1">标准差 σ</p>
            <p className="text-xl font-bold text-cyan-700">
              {dynamicThreshold.stdDev}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs text-cyan-500 mt-1">波动程度</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-600 mb-1">阈值调整次数</p>
            <p className="text-xl font-bold text-violet-700">
              {thresholdHistory.length}
              <span className="text-sm font-normal ml-1">次</span>
            </p>
            <p className="text-xs text-violet-500 mt-1">每5分钟更新</p>
          </div>
        </div>

        {/* Percentile Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 rounded-lg p-3 text-center">
            <p className="text-xs text-indigo-600 mb-1">P50 (中位数)</p>
            <p className="text-xl font-bold text-indigo-700">
              {stats.p50}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs text-indigo-500 mt-1">50% 数据低于此值</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">P90</p>
            <p className="text-xl font-bold text-purple-700">
              {stats.p90}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs text-purple-500 mt-1">90% 数据低于此值</p>
          </div>
          <div className="bg-pink-50 rounded-lg p-3 text-center">
            <p className="text-xs text-pink-600 mb-1">P99</p>
            <p className="text-xl font-bold text-pink-700">
              {stats.p99}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs text-pink-500 mt-1">99% 数据低于此值</p>
          </div>
        </div>

        {/* 预测控制面板 */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <h4 className="text-sm font-semibold text-gray-900">时序预测控制</h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrediction}
                onChange={(e) => setShowPrediction(e.target.checked)}
                className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
              />
              <span className="text-xs text-gray-700">显示预测</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">SMA周期</label>
              <select
                value={smaPeriod}
                onChange={(e) => setSmaPeriod(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value={5}>5 点</option>
                <option value={10}>10 点</option>
                <option value={20}>20 点</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">移动平均计算窗口</p>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">预测周期</label>
              <select
                value={predictionPeriod}
                onChange={(e) => setPredictionPeriod(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value={5}>5 点</option>
                <option value={10}>10 点</option>
                <option value={20}>20 点</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">未来预测数据点数量</p>
            </div>
          </div>

          {/* 预测准确度统计 */}
          {showPrediction && (
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-violet-200">
              <div className="text-center">
                <p className="text-xs text-violet-600 mb-1">MAE</p>
                <p className="text-lg font-bold text-violet-700">
                  {predictionAccuracy.mae}
                  <span className="text-xs font-normal ml-1">ms</span>
                </p>
                <p className="text-xs text-violet-500">平均绝对误差</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-violet-600 mb-1">RMSE</p>
                <p className="text-lg font-bold text-violet-700">
                  {predictionAccuracy.rmse}
                  <span className="text-xs font-normal ml-1">ms</span>
                </p>
                <p className="text-xs text-violet-500">均方根误差</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-violet-600 mb-1">MAPE</p>
                <p className="text-lg font-bold text-violet-700">
                  {predictionAccuracy.mape}
                  <span className="text-xs font-normal ml-1">%</span>
                </p>
                <p className="text-xs text-violet-500">平均绝对百分比误差</p>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-600">
            <p>
              <span className="font-medium text-violet-700">预测说明：</span>
              基于SMA({smaPeriod})计算预测值，置信区间为预测值 ± 1.96 × 标准差（95%置信度）。
              当前预测未来 {predictionPeriod} 个时间点的延迟值。
            </p>
          </div>
        </div>

        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                minTickGap={15}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}`}
                domain={[0, 'auto']}
                width={50}
                label={{
                  value: 'ms',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9ca3af',
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {renderAnomalyAreas()}
              {/* Fixed threshold line */}
              <ReferenceLine
                y={anomalyThreshold}
                stroke="#EF4444"
                strokeDasharray="5 5"
                label={{
                  value: `固定阈值 (${anomalyThreshold}ms)`,
                  position: 'right',
                  fill: '#EF4444',
                  fontSize: 10,
                }}
              />
              {/* Dynamic threshold line */}
              <ReferenceLine
                y={dynamicThreshold.threshold}
                stroke="#F59E0B"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: `动态阈值 (${dynamicThreshold.threshold}ms)`,
                  position: 'right',
                  fill: '#F59E0B',
                  fontSize: 10,
                }}
              />
              {/* Baseline (moving average) line */}
              <ReferenceLine
                y={dynamicThreshold.baseline}
                stroke="#10B981"
                strokeDasharray="3 3"
                label={{
                  value: `基线 MA20 (${dynamicThreshold.baseline}ms)`,
                  position: 'left',
                  fill: '#10B981',
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={stats.avg}
                stroke="#3B82F6"
                strokeDasharray="3 3"
                label={{
                  value: `平均 (${stats.avg}ms)`,
                  position: 'left',
                  fill: '#3B82F6',
                  fontSize: 10,
                }}
              />
              {/* 置信区间区域 */}
              {showPrediction && (
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="#8B5CF6"
                  fillOpacity={0.1}
                  legendType="none"
                />
              )}
              {showPrediction && (
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#fff"
                  fillOpacity={1}
                  legendType="none"
                />
              )}
              {/* 实际延迟线 */}
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 5, fill: '#3B82F6', stroke: '#FFF', strokeWidth: 2 }}
                name="实际延迟"
                connectNulls={false}
              />
              {/* 预测线 */}
              {showPrediction && (
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#8B5CF6', stroke: '#FFF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#FFF', strokeWidth: 2 }}
                  name="SMA预测"
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Distribution Histogram */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">延迟分布直方图</h4>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.histogramData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="range"
                  stroke="#9ca3af"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={0}
                  label={{
                    value: '延迟范围 (ms)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#9ca3af',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  label={{
                    value: '频次',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9ca3af',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload as HistogramDataPoint;
                    return (
                      <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">延迟范围</p>
                        <p className="text-sm font-semibold text-gray-900">{data.range} ms</p>
                        <p className="text-xs text-gray-500 mt-1">频次</p>
                        <p className="text-sm font-semibold text-blue-600">{data.count}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  stroke="#2563EB"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {stats.anomalyCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">检测到延迟异常</h4>
                <p className="text-xs text-red-700">
                  在过去1小时内，有 {stats.anomalyCount} 个数据点（{stats.anomalyPercent}
                  %）的延迟超过了 {anomalyThreshold}ms 阈值。 最长异常持续时间为{' '}
                  {stats.longestAnomalyDuration} 分钟。
                  高延迟可能导致价格更新不及时，影响交易决策的准确性。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Threshold Explanation Card */}
        <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">动态阈值机制说明</h4>
              <div className="space-y-2 text-xs text-gray-700">
                <p>
                  <span className="font-medium text-amber-700">计算公式：</span>
                  动态阈值 = 基线(MA20) + 2 × 标准差(σ)
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="font-medium text-emerald-700 mb-1">基线 MA20</p>
                    <p className="text-gray-600">
                      最近20个数据点的移动平均值，代表当前延迟的基准水平
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-cyan-700 mb-1">标准差 σ</p>
                    <p className="text-gray-600">衡量延迟数据的波动程度，2σ 覆盖约95%的正常数据</p>
                  </div>
                </div>
                <p className="mt-2 text-gray-600">
                  <span className="font-medium">调整频率：</span>
                  系统每5分钟自动重新计算一次阈值，已调整 {thresholdHistory.length} 次。
                  动态阈值能够自适应网络状况变化，比固定阈值更灵敏地检测异常。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">关于价格更新延迟</h4>
          <p className="text-xs text-blue-800">
            价格更新延迟反映了 Pyth Network 预言机从数据源获取价格更新到链上可用的时间。
            正常情况下延迟应保持在 200ms 以下。当延迟异常升高时，可能表示网络拥堵、
            数据源响应缓慢或系统负载过高，建议关注异常时段并评估对应用的影响。
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
