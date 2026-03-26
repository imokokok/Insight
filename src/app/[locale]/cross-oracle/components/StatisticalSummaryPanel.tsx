'use client';

import { useMemo } from 'react';

import { TrendingUp, BarChart3, Activity, Sigma, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

import type { PriceData } from '@/types/oracle';

interface StatisticalSummaryPanelProps {
  priceData: PriceData[];
  avgPrice: number;
  standardDeviation: number;
  variance: number;
  t: (key: string) => string;
}

interface HistogramData {
  bin: string;
  binStart: number;
  binEnd: number;
  count: number;
  frequency: number;
  normalCurve: number;
}

interface ConfidenceInterval {
  level: number;
  zScore: number;
  lower: number;
  upper: number;
  width: number;
  widthPercent: number;
}

interface StatisticalMetrics {
  skewness: number;
  kurtosis: number;
  coefficientOfVariation: number;
  standardError: number;
  iqr: number;
  mad: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
}

export function StatisticalSummaryPanel({
  priceData,
  avgPrice,
  standardDeviation,
  variance,
  t,
}: StatisticalSummaryPanelProps) {
  const prices = useMemo(() => priceData.map((p) => p.price), [priceData]);

  const metrics = useMemo<StatisticalMetrics>(() => {
    const n = prices.length;
    if (n === 0) {
      return {
        skewness: 0,
        kurtosis: 0,
        coefficientOfVariation: 0,
        standardError: 0,
        iqr: 0,
        mad: 0,
        median: 0,
        mode: 0,
        min: 0,
        max: 0,
        q1: 0,
        q3: 0,
      };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];

    const median =
      n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const frequency: Map<number, number> = new Map();
    sorted.forEach((p) => {
      frequency.set(p, (frequency.get(p) || 0) + 1);
    });
    let mode = sorted[0];
    let maxFreq = 0;
    frequency.forEach((freq, value) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    });

    const mad = sorted.reduce((sum, p) => sum + Math.abs(p - avgPrice), 0) / n;

    const skewness =
      sorted.reduce((sum, p) => {
        return sum + Math.pow((p - avgPrice) / standardDeviation, 3);
      }, 0) / n;

    const kurtosis =
      sorted.reduce((sum, p) => {
        return sum + Math.pow((p - avgPrice) / standardDeviation, 4);
      }, 0) /
        n -
      3;

    const coefficientOfVariation = avgPrice !== 0 ? (standardDeviation / avgPrice) * 100 : 0;
    const standardError = standardDeviation / Math.sqrt(n);

    return {
      skewness,
      kurtosis,
      coefficientOfVariation,
      standardError,
      iqr,
      mad,
      median,
      mode,
      min,
      max,
      q1,
      q3,
    };
  }, [prices, avgPrice, standardDeviation]);

  const histogramData = useMemo<HistogramData[]>(() => {
    if (prices.length === 0) return [];

    const n = prices.length;
    const binCount = Math.min(20, Math.ceil(Math.sqrt(n)));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const binWidth = (max - min) / binCount || 1;

    const bins: HistogramData[] = [];
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      const count = prices.filter(
        (p) => p >= binStart && (i === binCount - 1 ? p <= binEnd : p < binEnd)
      ).length;
      const frequency = count / n;

      const midPoint = (binStart + binEnd) / 2;
      const normalCurve =
        (1 / (standardDeviation * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * Math.pow((midPoint - avgPrice) / standardDeviation, 2));

      bins.push({
        bin: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        binStart,
        binEnd,
        count,
        frequency,
        normalCurve,
      });
    }

    return bins;
  }, [prices, avgPrice, standardDeviation]);

  const confidenceIntervals = useMemo<ConfidenceInterval[]>(() => {
    const levels = [
      { level: 90, zScore: 1.645 },
      { level: 95, zScore: 1.96 },
      { level: 99, zScore: 2.576 },
    ];

    return levels.map(({ level, zScore }) => {
      const margin = zScore * metrics.standardError;
      const lower = avgPrice - margin;
      const upper = avgPrice + margin;
      const width = upper - lower;
      const widthPercent = avgPrice !== 0 ? (width / avgPrice) * 100 : 0;

      return {
        level,
        zScore,
        lower,
        upper,
        width,
        widthPercent,
      };
    });
  }, [avgPrice, metrics.standardError]);

  const formatNumber = (num: number, decimals = 4) => {
    if (!isFinite(num) || isNaN(num)) return 'N/A';
    return num.toFixed(decimals);
  };

  const formatPrice = (num: number) => {
    if (!isFinite(num) || isNaN(num)) return 'N/A';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const getSkewnessInterpretation = (skewness: number) => {
    if (Math.abs(skewness) < 0.5) return t('crossOracle.statistics.symmetrical');
    if (skewness > 0.5) return t('crossOracle.statistics.rightSkewed');
    return t('crossOracle.statistics.leftSkewed');
  };

  const getKurtosisInterpretation = (kurtosis: number) => {
    if (Math.abs(kurtosis) < 0.5) return t('crossOracle.statistics.normalTails');
    if (kurtosis > 0.5) return t('crossOracle.statistics.heavyTails');
    return t('crossOracle.statistics.lightTails');
  };

  return (
    <div className="space-y-4">
      {/* 高级统计指标卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {t('crossOracle.statistics.skewness')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(metrics.skewness, 4)}
            </p>
            <p className="text-xs text-gray-500">{getSkewnessInterpretation(metrics.skewness)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 rounded">
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {t('crossOracle.statistics.kurtosis')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(metrics.kurtosis, 4)}
            </p>
            <p className="text-xs text-gray-500">{getKurtosisInterpretation(metrics.kurtosis)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 rounded">
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {t('crossOracle.statistics.cv')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(metrics.coefficientOfVariation, 2)}%
            </p>
            <p className="text-xs text-gray-500">
              {t('crossOracle.statistics.relativeDispersion')}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 rounded">
              <Sigma className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {t('crossOracle.statistics.sem')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">
              {formatPrice(metrics.standardError)}
            </p>
            <p className="text-xs text-gray-500">
              {t('crossOracle.statistics.sampleMeanPrecision')}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-rose-50 rounded">
              <Target className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {t('crossOracle.statistics.iqr')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{formatPrice(metrics.iqr)}</p>
            <p className="text-xs text-gray-500">{t('crossOracle.statistics.middle50Range')}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-cyan-50 rounded">
              <Activity className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">
              {t('crossOracle.statistics.mad')}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{formatPrice(metrics.mad)}</p>
            <p className="text-xs text-gray-500">
              {t('crossOracle.statistics.meanAbsoluteDeviation')}
            </p>
          </div>
        </div>
      </div>

      {/* 价格分布直方图 */}
      <div className="bg-white border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          {t('crossOracle.statistics.priceDistribution')}
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="bin"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                stroke="#6b7280"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                label={{
                  value: t('crossOracle.statistics.frequency'),
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 10,
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                label={{
                  value: t('crossOracle.statistics.density'),
                  angle: 90,
                  position: 'insideRight',
                  fontSize: 10,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'frequency')
                    return [
                      `${(Number(value) * 100).toFixed(2)}%`,
                      t('crossOracle.statistics.frequency'),
                    ];
                  return [Number(value).toFixed(6), t('crossOracle.statistics.normalCurve')];
                }}
                labelFormatter={(label) =>
                  `${t('crossOracle.statistics.priceRange')}: ${String(label)}`
                }
              />
              <Bar
                yAxisId="left"
                dataKey="frequency"
                fill="#3b82f6"
                fillOpacity={0.6}
                stroke="#2563eb"
                strokeWidth={1}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="normalCurve"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <ReferenceLine
                x={histogramData.find((d) => d.binStart <= avgPrice && d.binEnd >= avgPrice)?.bin}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{
                  value: `${t('crossOracle.statistics.mean')}: ${formatPrice(avgPrice)}`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#10b981',
                }}
              />
              <ReferenceLine
                x={
                  histogramData.find(
                    (d) => d.binStart <= metrics.median && d.binEnd >= metrics.median
                  )?.bin
                }
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: `${t('crossOracle.statistics.median')}: ${formatPrice(metrics.median)}`,
                  position: 'top',
                  fontSize: 10,
                  fill: '#f59e0b',
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/60 border border-blue-600" />
            <span className="text-gray-600">{t('crossOracle.statistics.actualDistribution')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-red-500" />
            <span className="text-gray-600">{t('crossOracle.statistics.normalCurve')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-0.5 bg-emerald-500 border-dashed"
              style={{ borderTop: '2px dashed #10b981' }}
            />
            <span className="text-gray-600">{t('crossOracle.statistics.mean')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-0.5 bg-amber-500 border-dashed"
              style={{ borderTop: '2px dashed #f59e0b' }}
            />
            <span className="text-gray-600">{t('crossOracle.statistics.median')}</span>
          </div>
        </div>
      </div>

      {/* 置信区间展示 */}
      <div className="bg-white border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">
          {t('crossOracle.statistics.confidenceIntervals')}
        </h4>
        <div className="space-y-3">
          {confidenceIntervals.map((ci) => (
            <div key={ci.level} className="border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {ci.level}% {t('crossOracle.statistics.ci')}
                  </span>
                  <span className="text-xs text-gray-500">(z = {ci.zScore})</span>
                </div>
                <span className="text-xs font-medium text-gray-600">
                  {t('crossOracle.statistics.width')}: {formatPrice(ci.width)} (
                  {formatNumber(ci.widthPercent, 2)}%)
                </span>
              </div>
              <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 border-l-2 border-r-2 border-blue-500"
                  style={{
                    left: `${Math.max(0, ((ci.lower - metrics.min) / (metrics.max - metrics.min)) * 100)}%`,
                    right: `${Math.max(0, 100 - ((ci.upper - metrics.min) / (metrics.max - metrics.min)) * 100)}%`,
                  }}
                />
                <div
                  className="absolute top-0 w-0.5 h-full bg-red-500"
                  style={{
                    left: `${((avgPrice - metrics.min) / (metrics.max - metrics.min)) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{formatPrice(ci.lower)}</span>
                <span className="font-medium text-gray-700">{formatPrice(avgPrice)}</span>
                <span>{formatPrice(ci.upper)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 统计摘要表格 */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.statistics.summaryTable')}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                  {t('crossOracle.statistics.metric')}
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">
                  {t('crossOracle.statistics.value')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                  {t('crossOracle.statistics.description')}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                  {t('crossOracle.statistics.formula')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.count')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">{prices.length}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.countDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">n</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.mean')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(avgPrice)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.meanDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">x̄ = Σxᵢ/n</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.median')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.median)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.medianDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">Q₂</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.mode')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.mode)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.modeDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">max(frequency)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.min')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.min)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.minDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">min(x)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.max')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.max)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.maxDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">max(x)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.range')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.max - metrics.min)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.rangeDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">max - min</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.variance')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatNumber(variance)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.varianceDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">σ² = Σ(xᵢ-x̄)²/n</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.stdDev')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatNumber(standardDeviation)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.stdDevDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">σ = √σ²</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.cv')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatNumber(metrics.coefficientOfVariation, 2)}%
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.cvDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">CV = σ/x̄ × 100%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.skewness')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatNumber(metrics.skewness, 4)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.skewnessDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">γ₁ = Σ[(xᵢ-x̄)/σ]³/n</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.kurtosis')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatNumber(metrics.kurtosis, 4)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.kurtosisDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">
                  γ₂ = Σ[(xᵢ-x̄)/σ]⁴/n - 3
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.q1')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.q1)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.q1Desc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">Q₁ (25th percentile)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.q3')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.q3)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.q3Desc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">Q₃ (75th percentile)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.iqr')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.iqr)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.iqrDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">IQR = Q₃ - Q₁</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.mad')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.mad)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.madDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">MAD = Σ|xᵢ-x̄|/n</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-700">{t('crossOracle.statistics.sem')}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatPrice(metrics.standardError)}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {t('crossOracle.statistics.semDesc')}
                </td>
                <td className="px-4 py-2 text-gray-400 text-xs font-mono">SEM = σ/√n</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
