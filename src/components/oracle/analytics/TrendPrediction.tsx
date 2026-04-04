'use client';

import { useState, useCallback, useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  Settings,
  Calendar,
  Target,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

import { useAPI3Analytics, type DataPoint, type PredictionResult } from '@/hooks/api3';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

export interface TrendPredictionProps {
  historicalData: DataPoint[];
  predictionDays: number;
  confidenceLevel: number;
}

const confidenceOptions = [
  { value: 0.9, label: '90%' },
  { value: 0.95, label: '95%' },
  { value: 0.99, label: '99%' },
];

const predictionHorizons = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
];

export function TrendPrediction({
  historicalData,
  predictionDays: initialDays,
  confidenceLevel: initialConfidence,
}: TrendPredictionProps) {
  const t = useTranslations();
  const { predictTrend, calculateMovingAverage, calculateTrendDirection, calculateVolatility } =
    useAPI3Analytics();

  const [predictionDays, setPredictionDays] = useState(initialDays);
  const [confidenceLevel, setConfidenceLevel] = useState(initialConfidence);
  const [showSettings, setShowSettings] = useState(false);
  const [movingAverageWindow, setMovingAverageWindow] = useState(7);

  const predictions = useMemo(() => {
    if (historicalData.length < 2) return [];
    return predictTrend(historicalData, predictionDays, confidenceLevel);
  }, [historicalData, predictionDays, confidenceLevel, predictTrend]);

  const trendDirection = useMemo(() => {
    return calculateTrendDirection(historicalData);
  }, [historicalData, calculateTrendDirection]);

  const volatility = useMemo(() => {
    return calculateVolatility(historicalData);
  }, [historicalData, calculateVolatility]);

  const movingAverageData = useMemo(() => {
    const values = historicalData.map((d) => d.value);
    const ma = calculateMovingAverage(values, movingAverageWindow);
    return historicalData.map((d, i) => ({
      ...d,
      ma: ma[i],
      time: new Date(d.timestamp).toLocaleDateString(),
    }));
  }, [historicalData, movingAverageWindow, calculateMovingAverage]);

  const chartData = useMemo(() => {
    const historical = movingAverageData.map((d) => ({
      time: d.time,
      timestamp: d.timestamp,
      actual: d.value,
      ma: d.ma,
      predicted: null,
      lowerBound: null,
      upperBound: null,
    }));

    const future = predictions.map((p) => ({
      time: new Date(p.timestamp).toLocaleDateString(),
      timestamp: p.timestamp,
      actual: null,
      ma: null,
      predicted: p.predicted,
      lowerBound: p.lowerBound,
      upperBound: p.upperBound,
    }));

    return [...historical, ...future];
  }, [movingAverageData, predictions]);

  const statistics = useMemo(() => {
    if (historicalData.length === 0) return null;

    const values = historicalData.map((d) => d.value);
    const lastValue = values[values.length - 1];
    const predictedValue =
      predictions.length > 0 ? predictions[predictions.length - 1].predicted : null;
    const change = predictedValue ? ((predictedValue - lastValue) / lastValue) * 100 : null;

    return {
      lastValue,
      predictedValue,
      change,
      volatility,
      trendDirection,
    };
  }, [historicalData, predictions, volatility, trendDirection]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.analytics.prediction.title') || 'Trend Prediction'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.analytics.prediction.subtitle') ||
              'Historical trend analysis and price prediction'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Settings className="w-4 h-4" />
          {t('api3.analytics.prediction.settings') || 'Settings'}
        </button>
      </div>

      {showSettings && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('api3.analytics.prediction.predictionHorizon') || 'Prediction Horizon'}
              </label>
              <select
                value={predictionDays}
                onChange={(e) => setPredictionDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {predictionHorizons.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('api3.analytics.prediction.confidenceLevel') || 'Confidence Level'}
              </label>
              <select
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {confidenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('api3.analytics.prediction.maWindow') || 'Moving Average Window'}
              </label>
              <input
                type="number"
                value={movingAverageWindow}
                onChange={(e) => setMovingAverageWindow(Number(e.target.value))}
                min={2}
                max={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {t('api3.analytics.prediction.currentPrice') || 'Current Price'}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              ${statistics.lastValue.toFixed(2)}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {t('api3.analytics.prediction.predictedPrice') || 'Predicted Price'}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              ${statistics.predictedValue?.toFixed(2) || '-'}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(statistics.trendDirection)}
              <span className="text-xs text-gray-500">
                {t('api3.analytics.prediction.trend') || 'Trend'}
              </span>
            </div>
            <div className={`text-xl font-bold ${getTrendColor(statistics.trendDirection)}`}>
              {statistics.trendDirection.toUpperCase()}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {t('api3.analytics.prediction.expectedChange') || 'Expected Change'}
              </span>
            </div>
            <div
              className={`text-xl font-bold ${
                statistics.change && statistics.change >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {statistics.change
                ? `${statistics.change >= 0 ? '+' : ''}${statistics.change.toFixed(2)}%`
                : '-'}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          {t('api3.analytics.prediction.chartTitle') || 'Historical Data & Prediction'}
        </h3>
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="text-xs text-gray-500 mb-2">{label as string}</p>
                        {payload.map((entry, index) => {
                          const value = entry.value as number | undefined;
                          const name = entry.name as string | undefined;
                          const color = entry.color as string | undefined;
                          return value !== null && value !== undefined ? (
                            <p key={index} className="text-sm" style={{ color: color || '#666' }}>
                              {name}: {value.toFixed(4)}
                            </p>
                          ) : null;
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={chartColors.oracle.api3}
                strokeWidth={2}
                dot={false}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="ma"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name={`MA(${movingAverageWindow})`}
              />
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill={chartColors.oracle.api3}
                fillOpacity={0.1}
                name="Upper Bound"
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill={chartColors.oracle.api3}
                fillOpacity={0.1}
                name="Lower Bound"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Predicted"
              />
              <ReferenceLine
                x={
                  (
                    chartData as Array<{
                      time: string;
                      actual: number | null;
                      predicted: number | null;
                    }>
                  ).find((d) => d.actual !== null && d.predicted !== null)?.time || undefined
                }
                stroke="#6b7280"
                strokeDasharray="3 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('api3.analytics.prediction.predictionDetails') || 'Prediction Details'}
          </h3>
          {predictions.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {predictions.map((pred, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-600">
                    {new Date(pred.timestamp).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      ${pred.predicted.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400">
                      (${pred.lowerBound.toFixed(2)} - ${pred.upperBound.toFixed(2)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('api3.analytics.prediction.accuracyMetrics') || 'Accuracy Metrics'}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {t('api3.analytics.prediction.volatility') || 'Annualized Volatility'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {(volatility * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(volatility * 100, 100)}%`,
                    backgroundColor:
                      volatility < 0.3 ? '#10b981' : volatility < 0.6 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {t('api3.analytics.prediction.confidenceWidth') || 'Confidence Interval Width'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {predictions.length > 0
                    ? (
                        ((predictions[predictions.length - 1].upperBound -
                          predictions[predictions.length - 1].lowerBound) /
                          predictions[predictions.length - 1].predicted) *
                        100
                      ).toFixed(2)
                    : 0}
                  %
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {t('api3.analytics.prediction.disclaimer') ||
                    'Predictions are based on historical linear regression and should not be used as financial advice. Market conditions can change rapidly.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrendPrediction;
