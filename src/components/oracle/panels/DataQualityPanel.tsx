'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, semanticColors, baseColors, animationColors } from '@/lib/config/colors';

type QualityStatus = 'excellent' | 'good' | 'warning' | 'critical';

interface PriceDeviationData {
  oracle: string;
  price: number;
  deviation: number;
  deviationPercent: number;
  trend: number;
  status: QualityStatus;
  lastUpdate: Date;
}

interface LatencyDistributionData {
  range: string;
  count: number;
  percentage: number;
}

interface LatencyMetrics {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

interface DataSourceReliability {
  id: string;
  name: string;
  availability: number;
  updateFrequency: number;
  lastSuccessfulUpdate: Date;
  status: QualityStatus;
  trend: number;
  totalUpdates: number;
  failedUpdates: number;
}

interface QualityScore {
  overall: number;
  priceAccuracy: number;
  latency: number;
  reliability: number;
}

interface DataQualityConfig {
  symbol: string;
  basePrice: number;
  priceDeviations: PriceDeviationData[];
  latencyDistribution: LatencyDistributionData[];
  latencyMetrics: LatencyMetrics;
  dataSources: DataSourceReliability[];
  qualityScore: QualityScore;
  lastUpdated: Date;
}

const ORACLE_COLORS: Record<string, string> = {
  Chainlink: chartColors.recharts.primary,
  Pyth: chartColors.recharts.purple,
  Band: chartColors.semantic.success,
  UMA: chartColors.recharts.warning,
  API3: chartColors.semantic.danger,
  DIA: chartColors.recharts.cyan,
};

const getStatusConfig = (t: (key: string) => string) => ({
  excellent: {
    color: semanticColors.success.DEFAULT,
    bgColor: semanticColors.success.DEFAULT,
    lightBg: semanticColors.success.light,
    borderColor: semanticColors.success.light,
    label: t('dataQuality.excellent'),
    score: 90,
    semanticColor: semanticColors.success.DEFAULT,
  },
  good: {
    color: baseColors.primary[600],
    bgColor: baseColors.primary[500],
    lightBg: baseColors.primary[50],
    borderColor: baseColors.primary[100],
    label: t('dataQuality.good'),
    score: 70,
    semanticColor: baseColors.primary[500],
  },
  warning: {
    color: semanticColors.warning.DEFAULT,
    bgColor: semanticColors.warning.DEFAULT,
    lightBg: semanticColors.warning.light,
    borderColor: semanticColors.warning.light,
    label: t('dataQuality.warning'),
    score: 50,
    semanticColor: semanticColors.warning.DEFAULT,
  },
  critical: {
    color: semanticColors.danger.DEFAULT,
    bgColor: semanticColors.danger.DEFAULT,
    lightBg: semanticColors.danger.light,
    borderColor: semanticColors.danger.light,
    label: t('dataQuality.critical'),
    score: 30,
    semanticColor: semanticColors.danger.DEFAULT,
  },
});

function getStatusFromScore(score: number): QualityStatus {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

function generatePriceDeviationData(basePrice: number): PriceDeviationData[] {
  const oracles = ['Chainlink', 'Pyth', 'Band', 'UMA', 'API3'];

  return oracles.map((oracle) => {
    const deviationPercent = (Math.random() - 0.5) * 1.5;
    const deviation = basePrice * (deviationPercent / 100);
    const price = basePrice + deviation;
    const trend = (Math.random() - 0.5) * 0.5;

    let status: QualityStatus = 'excellent';
    if (Math.abs(deviationPercent) >= 1.0) status = 'critical';
    else if (Math.abs(deviationPercent) >= 0.5) status = 'warning';
    else if (Math.abs(deviationPercent) >= 0.2) status = 'good';

    return {
      oracle,
      price,
      deviation,
      deviationPercent,
      trend,
      status,
      lastUpdate: new Date(Date.now() - Math.random() * 60000),
    };
  });
}

function generateLatencyDistribution(): LatencyDistributionData[] {
  const distribution: LatencyDistributionData[] = [
    { range: '0-50', count: 0, percentage: 0 },
    { range: '50-100', count: 0, percentage: 0 },
    { range: '100-150', count: 0, percentage: 0 },
    { range: '150-200', count: 0, percentage: 0 },
    { range: '200-250', count: 0, percentage: 0 },
    { range: '250-300', count: 0, percentage: 0 },
    { range: '300-350', count: 0, percentage: 0 },
    { range: '350-400', count: 0, percentage: 0 },
    { range: '400-450', count: 0, percentage: 0 },
    { range: '450-500', count: 0, percentage: 0 },
    { range: '500+', count: 0, percentage: 0 },
  ];

  const totalSamples = 1000;
  const weights = [0.08, 0.18, 0.25, 0.2, 0.12, 0.07, 0.04, 0.03, 0.015, 0.01, 0.005];

  distribution.forEach((item, index) => {
    const baseCount = Math.round(totalSamples * weights[index]);
    const variance = Math.round(baseCount * (Math.random() * 0.2 - 0.1));
    item.count = Math.max(0, baseCount + variance);
  });

  const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);
  distribution.forEach((item) => {
    item.percentage = (item.count / totalCount) * 100;
  });

  return distribution;
}

function calculateLatencyMetrics(distribution: LatencyDistributionData[]): LatencyMetrics {
  let totalLatency = 0;
  let totalCount = 0;
  const latencies: number[] = [];

  distribution.forEach((item, index) => {
    const midPoint = index < 10 ? index * 50 + 25 : 525;
    for (let i = 0; i < item.count; i++) {
      latencies.push(midPoint + (Math.random() - 0.5) * 50);
    }
    totalLatency += midPoint * item.count;
    totalCount += item.count;
  });

  latencies.sort((a, b) => a - b);

  const avg = totalLatency / totalCount;
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;

  const p50Index = Math.floor(latencies.length * 0.5);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);

  const variance =
    latencies.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / latencies.length;
  const stdDev = Math.sqrt(variance);

  return {
    avg: Math.round(avg),
    min: Math.round(min),
    max: Math.round(max),
    p50: Math.round(latencies[p50Index] || 0),
    p95: Math.round(latencies[p95Index] || 0),
    p99: Math.round(latencies[p99Index] || 0),
    stdDev: Math.round(stdDev),
  };
}

function generateDataSources(): DataSourceReliability[] {
  const sources = [
    { id: 'src-1', name: 'CoinGecko', baseAvail: 99.5 },
    { id: 'src-2', name: 'CoinMarketCap', baseAvail: 99.8 },
    { id: 'src-3', name: 'Binance', baseAvail: 99.2 },
    { id: 'src-4', name: 'Coinbase', baseAvail: 98.9 },
    { id: 'src-5', name: 'Kraken', baseAvail: 99.1 },
  ];

  return sources.map((src) => {
    const availability = src.baseAvail + (Math.random() - 0.5) * 1;
    const updateFrequency = Math.round(5 + Math.random() * 25);
    const totalUpdates = Math.round(10000 + Math.random() * 50000);
    const failedUpdates = Math.round(totalUpdates * (1 - availability / 100));
    const trend = (Math.random() - 0.5) * 2;

    const status = getStatusFromScore(availability);

    return {
      id: src.id,
      name: src.name,
      availability: Math.min(100, Math.max(95, availability)),
      updateFrequency,
      lastSuccessfulUpdate: new Date(Date.now() - Math.random() * 300000),
      status,
      trend,
      totalUpdates,
      failedUpdates,
    };
  });
}

function calculateQualityScore(
  deviations: PriceDeviationData[],
  metrics: LatencyMetrics,
  sources: DataSourceReliability[]
): QualityScore {
  const avgDeviation =
    deviations.reduce((sum, d) => sum + Math.abs(d.deviationPercent), 0) / deviations.length;
  const priceAccuracy = Math.max(0, 100 - avgDeviation * 50);

  const latencyScore = Math.max(0, 100 - (metrics.avg - 50) / 5);

  const avgAvailability = sources.reduce((sum, s) => sum + s.availability, 0) / sources.length;
  const reliability = avgAvailability;

  const overall = priceAccuracy * 0.4 + latencyScore * 0.3 + reliability * 0.3;

  return {
    overall: Math.round(overall * 10) / 10,
    priceAccuracy: Math.round(priceAccuracy * 10) / 10,
    latency: Math.round(latencyScore * 10) / 10,
    reliability: Math.round(reliability * 10) / 10,
  };
}

function PriceDeviationCard({
  data,
  basePrice,
}: {
  data: PriceDeviationData[];
  basePrice: number;
}) {
  const { t } = useI18n();
  const STATUS_CONFIG = getStatusConfig(t);
  const avgDeviation = data.reduce((sum, d) => sum + Math.abs(d.deviationPercent), 0) / data.length;
  const maxDeviation = Math.max(...data.map((d) => Math.abs(d.deviationPercent)));

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.priceDeviationMonitor')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('dataQuality.comparisonWithOracles')}</p>
        </div>
        <div className="p-2 bg-blue-50 ">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.basePrice')}</p>
          <p className="text-lg font-bold text-gray-900">${basePrice.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.avgDeviation')}</p>
          <p
            className={`text-lg font-bold ${avgDeviation >= 0.5 ? 'text-orange-600' : 'text-gray-900'}`}
          >
            {avgDeviation.toFixed(3)}%
          </p>
        </div>
        <div className="bg-gray-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.maxDeviation')}</p>
          <p
            className={`text-lg font-bold ${maxDeviation >= 1.0 ? 'text-red-600' : 'text-gray-900'}`}
          >
            {maxDeviation.toFixed(3)}%
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item) => {
          const config = STATUS_CONFIG[item.status];
          return (
            <div
              key={item.oracle}
              className="flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: baseColors.gray[50] }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 " style={{ backgroundColor: ORACLE_COLORS[item.oracle] }} />
                <span className="font-medium text-sm" style={{ color: baseColors.gray[900] }}>{item.oracle}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-mono" style={{ color: baseColors.gray[900] }}>${item.price.toFixed(4)}</p>
                  <p
                    className="text-xs"
                    style={{ color: item.deviationPercent >= 0 ? semanticColors.success.DEFAULT : semanticColors.danger.DEFAULT }}
                  >
                    {item.deviationPercent >= 0 ? '+' : ''}
                    {item.deviationPercent.toFixed(3)}%
                  </p>
                </div>
                <span
                  className="px-2 py-1 text-xs font-medium"
                  style={{ backgroundColor: config.lightBg, color: config.color }}
                >
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceDeviationChart({ data }: { data: PriceDeviationData[] }) {
  const { t } = useI18n();

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('dataQuality.deviationDistribution')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('dataQuality.deviationPercentByOracle')}</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            vertical={false}
          />
          <XAxis
            dataKey="oracle"
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
          />
          <YAxis
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0].payload as PriceDeviationData;
              return (
                <div className="bg-white border border-gray-200  p-3 ">
                  <p className="text-xs text-gray-600 font-medium mb-2">{item.oracle}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('dataQuality.price')}:</span>
                      <span className="text-gray-900 font-mono">${item.price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('dataQuality.deviation')}:</span>
                      <span
                        className={`font-mono ${item.deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {item.deviationPercent >= 0 ? '+' : ''}
                        {item.deviationPercent.toFixed(3)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine y={0} stroke={chartColors.recharts.tick} strokeWidth={1} />
          <ReferenceLine y={0.5} stroke={chartColors.semantic.warning} strokeDasharray="5 5" />
          <ReferenceLine y={-0.5} stroke={chartColors.semantic.warning} strokeDasharray="5 5" />
          <ReferenceLine y={1.0} stroke={chartColors.semantic.danger} strokeDasharray="5 5" />
          <ReferenceLine y={-1.0} stroke={chartColors.semantic.danger} strokeDasharray="5 5" />
          <Bar dataKey="deviationPercent">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.status === 'critical'
                    ? chartColors.semantic.danger
                    : entry.status === 'warning'
                      ? chartColors.semantic.warning
                      : chartColors.semantic.success
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded" style={{ backgroundColor: semanticColors.success.DEFAULT }} />
          <span className="text-xs text-gray-500">{t('dataQuality.normal')} (&lt;0.2%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded" style={{ backgroundColor: semanticColors.warning.DEFAULT }} />
          <span className="text-xs text-gray-500">{t('dataQuality.warningRange')} (0.2-0.5%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded" style={{ backgroundColor: semanticColors.danger.DEFAULT }} />
          <span className="text-xs text-gray-500">{t('dataQuality.criticalRange')} (&gt;0.5%)</span>
        </div>
      </div>
    </div>
  );
}

function LatencyDistributionChart({
  data,
  metrics,
}: {
  data: LatencyDistributionData[];
  metrics: LatencyMetrics;
}) {
  const { t } = useI18n();

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.latencyDistributionAnalysis')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dataQuality.responseLatencyHistogram')}
          </p>
        </div>
        <div className="p-2 bg-purple-50 ">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">P50</p>
          <p className="text-lg font-bold text-green-600">
            {metrics.p50}
            <span className="text-sm text-gray-500 ml-1">ms</span>
          </p>
        </div>
        <div className="bg-yellow-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">P95</p>
          <p className="text-lg font-bold text-yellow-600">
            {metrics.p95}
            <span className="text-sm text-gray-500 ml-1">ms</span>
          </p>
        </div>
        <div className="bg-red-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">P99</p>
          <p className="text-lg font-bold text-red-600">
            {metrics.p99}
            <span className="text-sm text-gray-500 ml-1">ms</span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            vertical={false}
          />
          <XAxis
            dataKey="range"
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
          />
          <YAxis
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0].payload as LatencyDistributionData;
              return (
                <div className="bg-white border border-gray-200  p-3 ">
                  <p className="text-xs text-gray-600 font-medium">
                    {t('dataQuality.latencyRange')}: {item.range}ms
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('dataQuality.percentage')}: {item.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('dataQuality.sampleCount')}: {item.count}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="percentage">
            {data.map((entry, index) => {
              let color: string = chartColors.semantic.success;
              if (index >= 7) color = semanticColors.danger.DEFAULT;
              else if (index >= 5) color = chartColors.semantic.warning;
              else if (index >= 3) color = chartColors.recharts.primary;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.avgValue')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.avg}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.minValue')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.min}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.maxValue')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.max}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('dataQuality.stdDev')}</p>
          <p className="text-sm font-semibold text-gray-900">{metrics.stdDev}ms</p>
        </div>
      </div>
    </div>
  );
}

function DataSourceReliabilityCard({ sources }: { sources: DataSourceReliability[] }) {
  const { t } = useI18n();
  const STATUS_CONFIG = getStatusConfig(t);

  const avgAvailability = sources.reduce((sum, s) => sum + s.availability, 0) / sources.length;
  const avgUpdateFrequency =
    sources.reduce((sum, s) => sum + s.updateFrequency, 0) / sources.length;
  const mostRecentUpdate = sources.reduce(
    (latest, s) => (s.lastSuccessfulUpdate > latest ? s.lastSuccessfulUpdate : latest),
    new Date(0)
  );

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}${t('dataQuality.secondsAgo')}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}${t('dataQuality.minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    return `${hours}${t('dataQuality.hoursAgo')}`;
  };

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.dataSourceReliability')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dataQuality.availabilityAndUpdateStatus')}
          </p>
        </div>
        <div className="p-2 bg-green-50 ">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.avgAvailability')}</p>
          <p className="text-lg font-bold text-green-600">{avgAvailability.toFixed(2)}%</p>
        </div>
        <div className="bg-gray-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.avgUpdateFrequency')}</p>
          <p className="text-lg font-bold text-gray-900">
            {avgUpdateFrequency.toFixed(0)}
            <span className="text-sm text-gray-500 ml-1">
              {t('dataQuality.secondsAgo').replace('前', '')}
            </span>
          </p>
        </div>
        <div className="bg-gray-50  p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.recentUpdate')}</p>
          <p className="text-sm font-bold text-gray-900">{getTimeAgo(mostRecentUpdate)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {sources.map((source) => {
          const statusConfig = STATUS_CONFIG[source.status];
          return (
            <div
              key={source.id}
              className="border border-gray-200  p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 text-sm">{source.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${source.trend > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {source.trend > 0 ? '↑' : '↓'} {Math.abs(source.trend).toFixed(2)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium  ${statusConfig.lightBg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-gray-100  overflow-hidden">
                  <div
                    className={`h-full  transition-all duration-300 ${statusConfig.bgColor}`}
                    style={{ width: `${source.availability}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-14 text-right">
                  {source.availability.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {t('dataQuality.updateFrequency')}: {source.updateFrequency}s
                </span>
                <span>
                  {t('dataQuality.lastUpdate')}: {getTimeAgo(source.lastSuccessfulUpdate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QualityScoreCard({ score }: { score: QualityScore }) {
  const { t } = useI18n();
  const STATUS_CONFIG = getStatusConfig(t);

  const overallStatus = getStatusFromScore(score.overall);
  const statusConfig = STATUS_CONFIG[overallStatus];

  const scoreItems = [
    {
      label: t('dataQuality.priceAccuracy'),
      value: score.priceAccuracy,
      color: chartColors.recharts.primary,
    },
    {
      label: t('dataQuality.latencyPerformance'),
      value: score.latency,
      color: chartColors.recharts.purple,
    },
    {
      label: t('dataQuality.reliability'),
      value: score.reliability,
      color: chartColors.semantic.success,
    },
  ];

  const getStrokeColor = () => {
    switch (overallStatus) {
      case 'excellent':
        return chartColors.semantic.success;
      case 'good':
        return chartColors.recharts.primary;
      case 'warning':
        return chartColors.semantic.warning;
      case 'critical':
        return chartColors.semantic.danger;
      default:
        return chartColors.recharts.tick;
    }
  };

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.compositeQualityScore')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dataQuality.comprehensiveDataAssessment')}
          </p>
        </div>
        <div className={`p-2  ${statusConfig.lightBg}`}>
          <svg
            className={`w-5 h-5 ${statusConfig.color}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={chartColors.recharts.grid}
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={getStrokeColor()}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${score.overall * 3.52} 352`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-3xl font-bold ${statusConfig.color}`}>{score.overall}</p>
              <p className="text-xs text-gray-500">{t('dataQuality.totalScore')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {scoreItems.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{item.label}</span>
              <span className="text-sm font-semibold text-gray-900">{item.value}</span>
            </div>
            <div className="h-2 bg-gray-100  overflow-hidden">
              <div
                className="h-full  transition-all duration-300"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataQualityPanelProps {
  symbol?: string;
  basePrice?: number;
  autoUpdate?: boolean;
  updateInterval?: number;
}

export function DataQualityPanel({
  symbol = 'ETH',
  basePrice = 2500,
  autoUpdate = true,
  updateInterval = 30000,
}: DataQualityPanelProps) {
  const { t } = useI18n();
  const [config, setConfig] = useState<DataQualityConfig>({
    symbol,
    basePrice,
    priceDeviations: [],
    latencyDistribution: [],
    latencyMetrics: { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, stdDev: 0 },
    dataSources: [],
    qualityScore: { overall: 0, priceAccuracy: 0, latency: 0, reliability: 0 },
    lastUpdated: new Date(),
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateData = useCallback(() => {
    const priceDeviations = generatePriceDeviationData(basePrice);
    const latencyDistribution = generateLatencyDistribution();
    const latencyMetrics = calculateLatencyMetrics(latencyDistribution);
    const dataSources = generateDataSources();
    const qualityScore = calculateQualityScore(priceDeviations, latencyMetrics, dataSources);

    setConfig({
      symbol,
      basePrice,
      priceDeviations,
      latencyDistribution,
      latencyMetrics,
      dataSources,
      qualityScore,
      lastUpdated: new Date(),
    });
    setLastUpdated(new Date());
  }, [symbol, basePrice]);

  useEffect(() => {
    updateData();

    if (autoUpdate) {
      intervalRef.current = setInterval(updateData, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateData, autoUpdate, updateInterval]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('dataQuality.dataQualityAnalysis')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('dataQuality.oracleDataQualityMetrics')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {t('dataQuality.lastUpdated')}: {lastUpdated.toLocaleTimeString('zh-CN')}
          </span>
          <button
            onClick={updateData}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ backgroundColor: baseColors.primary[50], color: baseColors.primary[600] }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = baseColors.primary[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = baseColors.primary[50];
            }}
          >
            {t('dataQuality.refreshData')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceDeviationCard data={config.priceDeviations} basePrice={config.basePrice} />
        </div>
        <QualityScoreCard score={config.qualityScore} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriceDeviationChart data={config.priceDeviations} />
        <LatencyDistributionChart
          data={config.latencyDistribution}
          metrics={config.latencyMetrics}
        />
      </div>

      <DataSourceReliabilityCard sources={config.dataSources} />
    </div>
  );
}

export type {
  DataQualityPanelProps,
  DataQualityConfig,
  PriceDeviationData,
  LatencyDistributionData,
  LatencyMetrics,
  DataSourceReliability,
  QualityScore,
  QualityStatus,
};
