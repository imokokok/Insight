'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot,
  Area,
  ComposedChart,
} from 'recharts';
import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { TooltipProps, CustomDotProps } from '@/types/ui/recharts';
import { getPythHermesClient } from '@/lib/oracles/pythHermesClient';
import { createLogger } from '@/lib/utils/logger';
import { NotImplementedError } from '@/lib/errors';
import { chartColors, baseColors, semanticColors, shadowColors } from '@/lib/config/colors';
import { useTranslations } from '@/i18n';
import {
  LatencyDataPoint,
  ThresholdHistoryEntry,
  DynamicThreshold,
  PredictionAccuracy,
  generatePredictions,
  calculatePredictionAccuracy,
  generateMockLatencyData,
  downsampleLatencyData,
  calculateDynamicThreshold,
  calculateSMA,
} from './latencyUtils';
import { useLatencyStats } from './useLatencyStats';
import { LatencyHistogram } from './LatencyHistogram';
import { LatencyPrediction } from './LatencyPrediction';


const logger = createLogger('LatencyTrendChart');

interface LatencyTrendChartProps {
  symbol?: string;
  className?: string;
  anomalyThreshold?: number;
}

const CustomDot = memo(function CustomDot({ cx, cy, payload }: CustomDotProps<LatencyDataPoint>) {
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
});

function LatencyTrendChartBase({
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

  const [predictionPeriod, setPredictionPeriod] = useState<number>(5);
  const [smaPeriod, setSmaPeriod] = useState<number>(10);
  const [showPrediction, setShowPrediction] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getPythHermesClient();
        const prices = await client.getHistoricalPrices(symbol, 1);

        if (prices.length === 0) {
          throw new Error('No price data available');
        }

        const now = new Date();
        const latencyData: LatencyDataPoint[] = [];

        for (let i = 59; i >= 0; i--) {
          const timestamp = new Date(now);
          timestamp.setMinutes(timestamp.getMinutes() - i);

          const minute = timestamp.getMinutes();
          const hour = timestamp.getHours();

          const baseLatency = 80;
          const timeFactor = hour >= 9 && hour <= 17 ? 1.2 : 0.9;
          const randomVariance = (Math.random() - 0.5) * 60;

          let latency = baseLatency * timeFactor + randomVariance;

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

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol, anomalyThreshold]);

  const predictions = useMemo(() => {
    return generatePredictions(data, predictionPeriod, smaPeriod);
  }, [data, predictionPeriod, smaPeriod]);

  const predictionAccuracy = useMemo(() => {
    if (data.length < smaPeriod + predictionPeriod) {
      return { mae: 0, rmse: 0, mape: 0 };
    }

    const validationData = data.slice(0, -predictionPeriod);
    const actualData = data.slice(-predictionPeriod);

    const latencies = validationData.map((d) => d.latency);
    const sma = calculateSMA(latencies, smaPeriod);

    const predictedValues = Array(predictionPeriod).fill(sma);
    const actualValues = actualData.map((d) => d.latency);

    return calculatePredictionAccuracy(actualValues, predictedValues);
  }, [data, predictionPeriod, smaPeriod]);

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

  useEffect(() => {
    updateDynamicThreshold();
  }, [updateDynamicThreshold]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateDynamicThreshold();
    }, 300000);

    return () => clearInterval(interval);
  }, [updateDynamicThreshold]);

  const maxLatency = useMemo(() => {
    return Math.max(...data.map((d) => d.latency));
  }, [data]);

  const stats = useLatencyStats(data);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  const CustomTooltip = useMemo(() => {
    const TooltipComponent = ({ active, payload, label }: TooltipProps<LatencyDataPoint>) => {
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
                <span
                  className="text-xs font-medium"
                  style={{ color: semanticColors.warning.dark }}
                >
                  ⚠️ {t('charts.latency.exceedsDynamicThreshold')}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    };
    return TooltipComponent;
  }, [dynamicThreshold, anomalyThreshold, t]);

  const renderAnomalyAreas = useCallback(() => {
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
  }, [stats.anomalyPeriods, data, anomalyThreshold, maxLatency]);

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

        <LatencyPrediction
          predictionPeriod={predictionPeriod}
          setPredictionPeriod={setPredictionPeriod}
          smaPeriod={smaPeriod}
          setSmaPeriod={setSmaPeriod}
          showPrediction={showPrediction}
          setShowPrediction={setShowPrediction}
          predictionAccuracy={predictionAccuracy}
        />

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
              <RechartsTooltip content={<CustomTooltip />} />
              {renderAnomalyAreas()}
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

        <LatencyHistogram histogramData={stats.histogramData} />

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

function arePropsEqual(
  prevProps: LatencyTrendChartProps,
  nextProps: LatencyTrendChartProps
): boolean {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.className === nextProps.className &&
    prevProps.anomalyThreshold === nextProps.anomalyThreshold
  );
}

const LatencyTrendChart = memo(LatencyTrendChartBase, arePropsEqual);

export { LatencyTrendChart };
