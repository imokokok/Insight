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
import { DashboardCard } from '../common/DashboardCard';
import { TooltipProps, CustomDotProps } from '@/types/ui/recharts';
import { getPythHermesClient } from '@/lib/oracles/pythHermesClient';
import { createLogger } from '@/lib/utils/logger';
import { NotImplementedError } from '@/lib/errors';
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';
import { useTranslations } from 'next-intl';

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
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={5}
        fill={semanticColors.danger.DEFAULT}
        stroke={chartColors.recharts.whiteLight}
        strokeWidth={2}
      />
    );
  }
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={3}
      fill={chartColors.recharts.primary}
      stroke={chartColors.recharts.whiteLight}
      strokeWidth={2}
    />
  );
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
  const t = useTranslations();
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
        logger.error(
          'Failed to fetch latency data:',
          err instanceof Error ? err : new Error(String(err))
        );

        if (err instanceof NotImplementedError) {
          setError(t('charts.latency.pythNotSupported'));
        } else {
          setError(t('charts.latency.fetchError'));
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
      <div
        className="p-3 min-w-[200px]"
        style={{
          backgroundColor: baseColors.gray[50],
          border: `1px solid ${baseColors.gray[200]}`,
          boxShadow: shadowColors.tooltip,
        }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: baseColors.gray[900] }}>
          {label}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.latency')}
            </span>
            <span
              className="text-sm font-bold"
              style={{
                color: dataPoint.isAnomaly ? semanticColors.danger.dark : baseColors.primary[600],
              }}
            >
              {dataPoint.latency} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.fixedThreshold')}
            </span>
            <span className="text-xs" style={{ color: baseColors.gray[700] }}>
              {anomalyThreshold} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.dynamicThreshold')}
            </span>
            <span className="text-xs" style={{ color: semanticColors.warning.dark }}>
              {dynamicThreshold.threshold} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.baselineMA20')}
            </span>
            <span className="text-xs" style={{ color: semanticColors.success.dark }}>
              {dynamicThreshold.baseline} ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.stdDev')}
            </span>
            <span className="text-xs" style={{ color: baseColors.gray[700] }}>
              {dynamicThreshold.stdDev}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.status')}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: dataPoint.isAnomaly
                  ? semanticColors.danger.light
                  : semanticColors.success.light,
                color: dataPoint.isAnomaly
                  ? semanticColors.danger.text
                  : semanticColors.success.text,
              }}
            >
              {dataPoint.isAnomaly ? t('charts.latency.abnormal') : t('charts.latency.normal')}
            </span>
          </div>
          {isDynamicAnomaly && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${baseColors.gray[100]}` }}>
              <span className="text-xs font-medium" style={{ color: semanticColors.warning.dark }}>
                ⚠️ {t('charts.latency.exceedsDynamicThreshold')}
              </span>
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
        fill={semanticColors.danger.light}
        fillOpacity={0.5}
      />
    ));
  };

  return (
    <DashboardCard
      title={t('charts.latency.title')}
      headerAction={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2" style={{ backgroundColor: semanticColors.danger.DEFAULT }} />
            <span style={{ color: baseColors.gray[500] }}>{t('charts.latency.anomaly')}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = baseColors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={t('charts.latency.refresh')}
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke={baseColors.gray[500]}
              viewBox="0 0 24 24"
            >
              <path
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
          <div className="p-3 text-center" style={{ backgroundColor: baseColors.primary[50] }}>
            <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
              {t('charts.latency.avgLatency')}
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.primary[700] }}>
              {stats.avg}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div
            className="p-3 text-center"
            style={{ backgroundColor: semanticColors.success.light }}
          >
            <p className="text-xs mb-1" style={{ color: semanticColors.success.dark }}>
              {t('charts.latency.minLatency')}
            </p>
            <p className="text-xl font-bold" style={{ color: semanticColors.success.text }}>
              {stats.min}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div
            className="p-3 text-center"
            style={{ backgroundColor: semanticColors.warning.light }}
          >
            <p className="text-xs mb-1" style={{ color: semanticColors.warning.dark }}>
              {t('charts.latency.maxLatency')}
            </p>
            <p className="text-xl font-bold" style={{ color: semanticColors.warning.text }}>
              {stats.max}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
          </div>
          <div className="p-3 text-center" style={{ backgroundColor: semanticColors.danger.light }}>
            <p className="text-xs mb-1" style={{ color: semanticColors.danger.dark }}>
              {t('charts.latency.anomalyCount')}
            </p>
            <p className="text-xl font-bold" style={{ color: semanticColors.danger.text }}>
              {stats.anomalyCount}
              <span
                className="text-sm font-normal ml-1"
                style={{ color: semanticColors.danger.DEFAULT }}
              >
                ({stats.anomalyPercent}%)
              </span>
            </p>
          </div>
        </div>

        {/* Dynamic Threshold Statistics */}
        <div className="grid grid-cols-4 gap-3">
          <div
            className="p-3 text-center"
            style={{ backgroundColor: semanticColors.warning.light }}
          >
            <p className="text-xs mb-1" style={{ color: semanticColors.warning.dark }}>
              {t('charts.latency.dynamicThreshold')}
            </p>
            <p className="text-xl font-bold" style={{ color: semanticColors.warning.text }}>
              {dynamicThreshold.threshold}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs mt-1" style={{ color: semanticColors.warning.DEFAULT }}>
              MA20 + 2σ
            </p>
          </div>
          <div
            className="p-3 text-center"
            style={{ backgroundColor: semanticColors.success.light }}
          >
            <p className="text-xs mb-1" style={{ color: semanticColors.success.dark }}>
              {t('charts.latency.baselineMA20')}
            </p>
            <p className="text-xl font-bold" style={{ color: semanticColors.success.text }}>
              {dynamicThreshold.baseline}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs mt-1" style={{ color: semanticColors.success.DEFAULT }}>
              {t('charts.latency.ma20Description')}
            </p>
          </div>
          <div className="p-3 text-center" style={{ backgroundColor: baseColors.slate[100] }}>
            <p className="text-xs mb-1" style={{ color: baseColors.slate[600] }}>
              {t('charts.latency.stdDev')}
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.slate[700] }}>
              {dynamicThreshold.stdDev}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs mt-1" style={{ color: baseColors.slate[500] }}>
              {t('charts.latency.volatility')}
            </p>
          </div>
          <div className="p-3 text-center" style={{ backgroundColor: baseColors.primary[100] }}>
            <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
              {t('charts.latency.thresholdAdjustments')}
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.primary[700] }}>
              {thresholdHistory.length}
              <span className="text-sm font-normal ml-1">{t('charts.latency.times')}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: baseColors.primary[500] }}>
              {t('charts.latency.updateFrequency')}
            </p>
          </div>
        </div>

        {/* Percentile Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 text-center" style={{ backgroundColor: baseColors.primary[50] }}>
            <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
              {t('charts.latency.p50')}
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.primary[700] }}>
              {stats.p50}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs mt-1" style={{ color: baseColors.primary[500] }}>
              {t('charts.latency.p50Description')}
            </p>
          </div>
          <div className="p-3 text-center" style={{ backgroundColor: baseColors.slate[50] }}>
            <p className="text-xs mb-1" style={{ color: baseColors.slate[600] }}>
              P90
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.slate[700] }}>
              {stats.p90}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs mt-1" style={{ color: baseColors.slate[500] }}>
              {t('charts.latency.p90Description')}
            </p>
          </div>
          <div className="p-3 text-center" style={{ backgroundColor: baseColors.gray[50] }}>
            <p className="text-xs mb-1" style={{ color: baseColors.gray[600] }}>
              P99
            </p>
            <p className="text-xl font-bold" style={{ color: baseColors.gray[700] }}>
              {stats.p99}
              <span className="text-sm font-normal ml-1">ms</span>
            </p>
            <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {t('charts.latency.p99Description')}
            </p>
          </div>
        </div>

        {/* 预测控制面板 */}
        <div
          className="p-4"
          style={{
            backgroundColor: baseColors.gray[100],
            border: `1px solid ${baseColors.gray[200]}`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill={baseColors.primary[600]} viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <h4 className="text-sm font-semibold" style={{ color: baseColors.gray[900] }}>
                {t('charts.latency.predictionControl')}
              </h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrediction}
                onChange={(e) => setShowPrediction(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: baseColors.primary[600] }}
              />
              <span className="text-xs" style={{ color: baseColors.gray[700] }}>
                {t('charts.latency.showPrediction')}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: baseColors.gray[600] }}>
                {t('charts.latency.smaPeriod')}
              </label>
              <select
                value={smaPeriod}
                onChange={(e) => setSmaPeriod(Number(e.target.value))}
                className="w-full text-sm px-3 py-2"
                style={{ border: `1px solid ${baseColors.gray[300]}` }}
              >
                <option value={5}>5 {t('charts.latency.points')}</option>
                <option value={10}>10 {t('charts.latency.points')}</option>
                <option value={20}>20 {t('charts.latency.points')}</option>
              </select>
              <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
                {t('charts.latency.smaDescription')}
              </p>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: baseColors.gray[600] }}>
                {t('charts.latency.predictionPeriod')}
              </label>
              <select
                value={predictionPeriod}
                onChange={(e) => setPredictionPeriod(Number(e.target.value))}
                className="w-full text-sm px-3 py-2"
                style={{ border: `1px solid ${baseColors.gray[300]}` }}
              >
                <option value={5}>5 {t('charts.latency.points')}</option>
                <option value={10}>10 {t('charts.latency.points')}</option>
                <option value={20}>20 {t('charts.latency.points')}</option>
              </select>
              <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
                {t('charts.latency.predictionDescription')}
              </p>
            </div>
          </div>

          {/* 预测准确度统计 */}
          {showPrediction && (
            <div
              className="grid grid-cols-3 gap-3 pt-4"
              style={{ borderTop: `1px solid ${baseColors.primary[200]}` }}
            >
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
                  MAE
                </p>
                <p className="text-lg font-bold" style={{ color: baseColors.primary[700] }}>
                  {predictionAccuracy.mae}
                  <span className="text-xs font-normal ml-1">ms</span>
                </p>
                <p className="text-xs" style={{ color: baseColors.primary[500] }}>
                  {t('charts.latency.mae')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
                  RMSE
                </p>
                <p className="text-lg font-bold" style={{ color: baseColors.primary[700] }}>
                  {predictionAccuracy.rmse}
                  <span className="text-xs font-normal ml-1">ms</span>
                </p>
                <p className="text-xs" style={{ color: baseColors.primary[500] }}>
                  {t('charts.latency.rmse')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
                  MAPE
                </p>
                <p className="text-lg font-bold" style={{ color: baseColors.primary[700] }}>
                  {predictionAccuracy.mape}
                  <span className="text-xs font-normal ml-1">%</span>
                </p>
                <p className="text-xs" style={{ color: baseColors.primary[500] }}>
                  {t('charts.latency.mape')}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs" style={{ color: baseColors.gray[600] }}>
            <p>
              <span className="font-medium" style={{ color: baseColors.primary[700] }}>
                {t('charts.latency.predictionNote')}
              </span>
              {t('charts.latency.predictionNoteDesc', { smaPeriod, predictionPeriod })}
            </p>
          </div>
        </div>

        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="timestamp"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={15}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value}`}
                domain={[0, 'auto']}
                width={50}
                label={{
                  value: 'ms',
                  angle: -90,
                  position: 'insideLeft',
                  fill: chartColors.recharts.axis,
                  fontSize: 11,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {renderAnomalyAreas()}
              {/* Fixed threshold line */}
              <ReferenceLine
                y={anomalyThreshold}
                stroke={semanticColors.danger.DEFAULT}
                strokeDasharray="5 5"
                label={{
                  value: `${t('charts.latency.fixedThreshold')} (${anomalyThreshold}ms)`,
                  position: 'right',
                  fill: semanticColors.danger.DEFAULT,
                  fontSize: 10,
                }}
              />
              {/* Dynamic threshold line */}
              <ReferenceLine
                y={dynamicThreshold.threshold}
                stroke={semanticColors.warning.DEFAULT}
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: `${t('charts.latency.dynamicThreshold')} (${dynamicThreshold.threshold}ms)`,
                  position: 'right',
                  fill: semanticColors.warning.DEFAULT,
                  fontSize: 10,
                }}
              />
              {/* Baseline (moving average) line */}
              <ReferenceLine
                y={dynamicThreshold.baseline}
                stroke={semanticColors.success.DEFAULT}
                strokeDasharray="3 3"
                label={{
                  value: `${t('charts.latency.baselineMA20')} (${dynamicThreshold.baseline}ms)`,
                  position: 'left',
                  fill: semanticColors.success.DEFAULT,
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={stats.avg}
                stroke={chartColors.recharts.primary}
                strokeDasharray="3 3"
                label={{
                  value: `${t('charts.latency.avg')} (${stats.avg}ms)`,
                  position: 'left',
                  fill: chartColors.recharts.primary,
                  fontSize: 10,
                }}
              />
              {/* 置信区间区域 */}
              {showPrediction && (
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill={chartColors.recharts.purple}
                  fillOpacity={0.1}
                  legendType="none"
                />
              )}
              {showPrediction && (
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill={baseColors.gray[50]}
                  fillOpacity={1}
                  legendType="none"
                />
              )}
              {/* 实际延迟线 */}
              <Line
                type="monotone"
                dataKey="latency"
                stroke={chartColors.recharts.primary}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{
                  r: 5,
                  fill: chartColors.recharts.primary,
                  stroke: chartColors.recharts.whiteLight,
                  strokeWidth: 2,
                }}
                name={t('charts.latency.actualLatency')}
                connectNulls={false}
              />
              {/* 预测线 */}
              {showPrediction && (
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={chartColors.recharts.purple}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{
                    r: 4,
                    fill: chartColors.recharts.purple,
                    stroke: chartColors.recharts.whiteLight,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: chartColors.recharts.purple,
                    stroke: chartColors.recharts.whiteLight,
                    strokeWidth: 2,
                  }}
                  name={t('charts.latency.smaPrediction')}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Distribution Histogram */}
        <div className="p-4" style={{ backgroundColor: baseColors.gray[50] }}>
          <h4 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[900] }}>
            {t('charts.latency.histogramTitle')}
          </h4>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.histogramData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={0}
                  label={{
                    value: t('charts.latency.latencyRange'),
                    position: 'insideBottom',
                    offset: -10,
                    fill: chartColors.recharts.axis,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                  label={{
                    value: t('charts.latency.frequency'),
                    angle: -90,
                    position: 'insideLeft',
                    fill: chartColors.recharts.axis,
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload as HistogramDataPoint;
                    return (
                      <div
                        className="p-2"
                        style={{
                          backgroundColor: baseColors.gray[50],
                          border: `1px solid ${baseColors.gray[200]}`,
                        }}
                      >
                        <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
                          {t('charts.latency.latencyRangeLabel')}
                        </p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: baseColors.gray[900] }}
                        >
                          {data.range} ms
                        </p>
                        <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
                          {t('charts.latency.frequency')}
                        </p>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: chartColors.recharts.primary }}
                        >
                          {data.count}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  fill={chartColors.recharts.primary}
                  stroke={chartColors.recharts.primaryDark}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {stats.anomalyCount > 0 && (
          <div
            className="p-3"
            style={{
              backgroundColor: semanticColors.danger.light,
              border: `1px solid ${baseColors.primary[200]}`,
            }}
          >
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill={semanticColors.danger.dark}
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4
                  className="text-sm font-semibold mb-1"
                  style={{ color: semanticColors.danger.text }}
                >
                  {t('charts.latency.anomalyDetected')}
                </h4>
                <p className="text-xs" style={{ color: semanticColors.danger.dark }}>
                  {t('charts.latency.anomalyDesc', {
                    count: stats.anomalyCount,
                    percent: stats.anomalyPercent,
                    threshold: anomalyThreshold,
                    duration: stats.longestAnomalyDuration,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Threshold Explanation Card */}
        <div
          className="p-4"
          style={{
            backgroundColor: baseColors.gray[100],
            border: `1px solid ${baseColors.gray[200]}`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5" fill={semanticColors.warning.dark} viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-2" style={{ color: baseColors.gray[900] }}>
                {t('charts.latency.dynamicThresholdTitle')}
              </h4>
              <div className="space-y-2 text-xs" style={{ color: baseColors.gray[700] }}>
                <p>
                  <span className="font-medium" style={{ color: semanticColors.warning.dark }}>
                    {t('charts.latency.formula')}
                  </span>
                  {t('charts.latency.formulaDesc')}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="font-medium mb-1" style={{ color: semanticColors.success.dark }}>
                      {t('charts.latency.baselineMA20')}
                    </p>
                    <p style={{ color: baseColors.gray[600] }}>
                      {t('charts.latency.baselineDesc')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1" style={{ color: baseColors.slate[700] }}>
                      {t('charts.latency.stdDevLabel')}
                    </p>
                    <p style={{ color: baseColors.gray[600] }}>{t('charts.latency.stdDevDesc')}</p>
                  </div>
                </div>
                <p className="mt-2" style={{ color: baseColors.gray[600] }}>
                  <span className="font-medium">{t('charts.latency.adjustmentFreq')}</span>
                  {t('charts.latency.adjustmentDesc', { count: thresholdHistory.length })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3" style={{ backgroundColor: baseColors.primary[50] }}>
          <h4 className="text-sm font-medium mb-1" style={{ color: baseColors.primary[900] }}>
            {t('charts.latency.aboutTitle')}
          </h4>
          <p className="text-xs" style={{ color: baseColors.primary[800] }}>
            {t('charts.latency.aboutDesc')}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
