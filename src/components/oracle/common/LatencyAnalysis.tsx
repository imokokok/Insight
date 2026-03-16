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
  Legend,
  Cell,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { chartColors, chainColors } from '@/lib/config/colors';

interface LatencyDataPoint {
  range: string;
  count: number;
  percentage: number;
}

interface TrendDataPoint {
  time: string;
  latency: number;
  p50: number;
  p95: number;
  p99: number;
}

interface ChainLatencyData {
  chain: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  minLatency: number;
  maxLatency: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: number;
}

interface AnomalyData {
  id: string;
  timestamp: Date;
  type: 'spike' | 'timeout' | 'high_latency';
  chain: string;
  value: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

interface LatencyStats {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
  totalSamples: number;
}

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: chainColors.ethereum,
  Arbitrum: chainColors.arbitrum,
  Optimism: chainColors.optimism,
  Polygon: chainColors.polygon,
};

const STATUS_CONFIG = {
  excellent: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    labelKey: 'latencyAnalysis.status.excellent',
  },
  good: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    labelKey: 'latencyAnalysis.status.good',
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    labelKey: 'latencyAnalysis.status.warning',
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    labelKey: 'latencyAnalysis.status.critical',
  },
};

function generateLatencyDistribution(): LatencyDataPoint[] {
  const distribution: LatencyDataPoint[] = [
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
  const weights = [0.05, 0.15, 0.25, 0.2, 0.15, 0.08, 0.05, 0.03, 0.02, 0.015, 0.005];

  distribution.forEach((item, index) => {
    const baseCount = Math.round(totalSamples * weights[index]);
    const variance = Math.round(baseCount * (Math.random() * 0.2 - 0.1));
    item.count = Math.max(0, baseCount + variance);
  });

  const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);
  return distribution.map((item) => ({
    ...item,
    percentage: (item.count / totalCount) * 100,
  }));
}

function generateTrendData(): TrendDataPoint[] {
  const now = Date.now();
  const data: TrendDataPoint[] = [];

  for (let i = 23; i >= 0; i--) {
    const timestamp = now - i * 60 * 60 * 1000;
    const date = new Date(timestamp);

    const baseLatency = 150 + Math.random() * 50;
    const spike = Math.random() > 0.9 ? Math.random() * 100 : 0;

    data.push({
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      latency: Math.round(baseLatency + spike),
      p50: Math.round(baseLatency * 0.9 + Math.random() * 20),
      p95: Math.round(baseLatency * 1.3 + Math.random() * 30),
      p99: Math.round(baseLatency * 1.5 + Math.random() * 50),
    });
  }

  return data;
}

function generateChainLatencyData(): ChainLatencyData[] {
  const chains = ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon'];

  return chains.map((chain) => {
    const baseLatency =
      {
        Ethereum: 200,
        Arbitrum: 150,
        Optimism: 120,
        Polygon: 180,
      }[chain] || 150;

    const variance = baseLatency * 0.2;
    const avgLatency = baseLatency + (Math.random() - 0.5) * variance;

    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (avgLatency < 100) status = 'excellent';
    else if (avgLatency < 200) status = 'good';
    else if (avgLatency < 300) status = 'warning';
    else status = 'critical';

    return {
      chain,
      avgLatency: Math.round(avgLatency),
      p50: Math.round(avgLatency * 0.85),
      p95: Math.round(avgLatency * 1.3),
      p99: Math.round(avgLatency * 1.5),
      minLatency: Math.round(avgLatency * 0.5),
      maxLatency: Math.round(avgLatency * 2),
      status,
      trend: Math.round((Math.random() - 0.5) * 20 * 100) / 100,
    };
  });
}

function generateAnomalies(): AnomalyData[] {
  const anomalies: AnomalyData[] = [];
  const types: Array<'spike' | 'timeout' | 'high_latency'> = ['spike', 'timeout', 'high_latency'];
  const chains = ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon'];

  const now = Date.now();
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000);
    const type = types[Math.floor(Math.random() * types.length)];
    const chain = chains[Math.floor(Math.random() * chains.length)];

    let value: number;
    let severity: 'low' | 'medium' | 'high';
    let messageKey: string;

    switch (type) {
      case 'spike':
        value = Math.round(500 + Math.random() * 500);
        severity = value > 800 ? 'high' : value > 600 ? 'medium' : 'low';
        messageKey = `spike:${value}`;
        break;
      case 'timeout':
        value = Math.round(Math.random() * 5 + 1);
        severity = value > 3 ? 'high' : value > 1 ? 'medium' : 'low';
        messageKey = `timeout:${value}`;
        break;
      case 'high_latency':
        value = Math.round(300 + Math.random() * 200);
        severity = value > 450 ? 'high' : value > 350 ? 'medium' : 'low';
        messageKey = `highLatency:${value}`;
        break;
    }

    anomalies.push({
      id: `anomaly-${i}`,
      timestamp,
      type,
      chain,
      value,
      severity,
      message: messageKey,
    });
  }

  return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function calculateStats(distribution: LatencyDataPoint[]): LatencyStats {
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
    totalSamples: totalCount,
  };
}

function LatencyDistributionChart({ data }: { data: LatencyDataPoint[] }) {
  const t = useTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('latencyAnalysis.distribution.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {t('latencyAnalysis.distribution.description')}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            vertical={false}
          />
          <XAxis
            dataKey="range"
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
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload as LatencyDataPoint;
              return (
                <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
                  <p className="text-xs text-gray-600 font-medium">
                    {t('latencyAnalysis.distribution.range')}: {data.range}ms
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('latencyAnalysis.distribution.percentage')}: {data.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('latencyAnalysis.distribution.count')}: {data.count}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="percentage">
            {data.map((entry, index) => {
              let color: string = chartColors.recharts.success;
              if (index >= 7) color = chartColors.recharts.danger;
              else if (index >= 5) color = chartColors.recharts.warning;
              else if (index >= 3) color = chartColors.recharts.primary;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-xs text-gray-500">0-150ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-xs text-gray-500">150-250ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-xs text-gray-500">250-350ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-xs text-gray-500">350ms+</span>
        </div>
      </div>
    </div>
  );
}

function PercentileCards({ stats }: { stats: LatencyStats }) {
  const t = useTranslations();

  const percentiles = [
    {
      label: 'P50',
      value: stats.p50,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      desc: t('latencyAnalysis.percentiles.p50Desc'),
    },
    {
      label: 'P95',
      value: stats.p95,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      desc: t('latencyAnalysis.percentiles.p95Desc'),
    },
    {
      label: 'P99',
      value: stats.p99,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      desc: t('latencyAnalysis.percentiles.p99Desc'),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {percentiles.map((p) => (
        <div key={p.label} className={`bg-white border border-gray-200 rounded p-4 ${p.bgColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">{p.label}</span>
            <span className={`text-xs font-semibold ${p.color}`}>
              {t('latencyAnalysis.percentiles.latency')}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${p.color}`}>{p.value}</span>
            <span className="text-sm text-gray-500">ms</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{p.desc}</p>
        </div>
      ))}
    </div>
  );
}

function LatencyTrendChart({ data }: { data: TrendDataPoint[] }) {
  const t = useTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('latencyAnalysis.trend.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{t('latencyAnalysis.trend.description')}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.recharts.grid}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            minTickGap={30}
          />
          <YAxis
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload as TrendDataPoint;
              return (
                <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
                  <p className="text-xs text-gray-600 font-medium mb-2">{label}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('latencyAnalysis.trend.current')}:</span>
                      <span className="text-gray-900 font-mono">{data.latency}ms</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-green-600">P50:</span>
                      <span className="text-green-600 font-mono">{data.p50}ms</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-yellow-600">P95:</span>
                      <span className="text-yellow-600 font-mono">{data.p95}ms</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-red-600">P99:</span>
                      <span className="text-red-600 font-mono">{data.p99}ms</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="latency"
            fill={chartColors.recharts.primary}
            fillOpacity={0.1}
            stroke="none"
            name={t('latencyAnalysis.trend.current')}
          />
          <Line
            type="monotone"
            dataKey="p50"
            stroke={chartColors.recharts.success}
            strokeWidth={2}
            dot={false}
            name="P50"
          />
          <Line
            type="monotone"
            dataKey="p95"
            stroke={chartColors.recharts.warning}
            strokeWidth={2}
            dot={false}
            name="P95"
          />
          <Line
            type="monotone"
            dataKey="p99"
            stroke={chartColors.recharts.danger}
            strokeWidth={2}
            dot={false}
            name="P99"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CrossChainLatencyComparison({ data }: { data: ChainLatencyData[] }) {
  const t = useTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('latencyAnalysis.crossChain.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-1">{t('latencyAnalysis.crossChain.description')}</p>
      </div>

      <div className="space-y-3">
        {data.map((chain) => {
          const statusConfig = STATUS_CONFIG[chain.status];
          return (
            <div
              key={chain.chain}
              className="border border-gray-200 rounded p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: CHAIN_COLORS[chain.chain] }}
                  />
                  <span className="font-medium text-gray-900">{chain.chain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1  ${statusConfig.lightBg} ${statusConfig.color}`}
                  >
                    {t(statusConfig.labelKey)}
                  </span>
                  <span
                    className={`text-xs font-medium ${chain.trend > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {chain.trend > 0 ? '↑' : '↓'} {Math.abs(chain.trend)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('latencyAnalysis.crossChain.avgLatency')}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">{chain.avgLatency}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">P50</p>
                  <p className="text-sm font-semibold text-green-600">{chain.p50}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">P95</p>
                  <p className="text-sm font-semibold text-yellow-600">{chain.p95}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">P99</p>
                  <p className="text-sm font-semibold text-red-600">{chain.p99}ms</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {t('latencyAnalysis.crossChain.latencyRange')}: {chain.minLatency}ms -{' '}
                    {chain.maxLatency}ms
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (chain.avgLatency / 500) * 100)}%`,
                      backgroundColor: CHAIN_COLORS[chain.chain],
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnomalyDetection({ anomalies }: { anomalies: AnomalyData[] }) {
  const t = useTranslations();

  const severityConfig = {
    low: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: t('latencyAnalysis.anomalies.severity.low'),
    },
    medium: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: t('latencyAnalysis.anomalies.severity.medium'),
    },
    high: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: t('latencyAnalysis.anomalies.severity.high'),
    },
  };

  const typeConfig = {
    spike: { icon: '📈', label: t('latencyAnalysis.anomalies.types.spike') },
    timeout: { icon: '⏱️', label: t('latencyAnalysis.anomalies.types.timeout') },
    high_latency: { icon: '⚠️', label: t('latencyAnalysis.anomalies.types.highLatency') },
  };

  const getLocalizedMessage = (anomaly: AnomalyData): string => {
    const [type, value] = anomaly.message.split(':');
    switch (type) {
      case 'spike':
        return t('latencyAnalysis.anomalies.messages.spike', { value });
      case 'timeout':
        return t('latencyAnalysis.anomalies.messages.timeout', { value });
      case 'highLatency':
        return t('latencyAnalysis.anomalies.messages.highLatency', { value });
      default:
        return anomaly.message;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('latencyAnalysis.anomalies.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{t('latencyAnalysis.anomalies.description')}</p>
        </div>
        <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded">
          {anomalies.length} {t('latencyAnalysis.anomalies.count')}
        </span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {anomalies.map((anomaly) => {
          const severity = severityConfig[anomaly.severity];
          const type = typeConfig[anomaly.type];

          return (
            <div
              key={anomaly.id}
              className={`border ${severity.borderColor} ${severity.bgColor} rounded p-3`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="text-lg">{type.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{type.label}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${severity.bgColor} ${severity.color}`}
                      >
                        {severity.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{getLocalizedMessage(anomaly)}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{anomaly.chain}</span>
                      <span>•</span>
                      <span>{anomaly.timestamp.toLocaleTimeString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsOverview({ stats }: { stats: LatencyStats }) {
  const t = useTranslations();

  const statItems = [
    { label: t('latencyAnalysis.stats.avg'), value: `${stats.avg}ms`, icon: '📊' },
    { label: t('latencyAnalysis.stats.min'), value: `${stats.min}ms`, icon: '⬇️' },
    { label: t('latencyAnalysis.stats.max'), value: `${stats.max}ms`, icon: '⬆️' },
    { label: t('latencyAnalysis.stats.stdDev'), value: `${stats.stdDev}ms`, icon: '📐' },
    {
      label: t('latencyAnalysis.stats.samples'),
      value: stats.totalSamples.toLocaleString(),
      icon: '🔢',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {statItems.map((item) => (
        <div key={item.label} className="bg-white border border-gray-200 rounded p-4 text-center">
          <span className="text-2xl mb-2 block">{item.icon}</span>
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className="text-sm font-semibold text-gray-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

interface LatencyAnalysisProps {
  autoUpdate?: boolean;
  updateInterval?: number;
}

export function LatencyAnalysis({
  autoUpdate = true,
  updateInterval = 30000,
}: LatencyAnalysisProps) {
  const t = useTranslations();
  const [distribution, setDistribution] = useState<LatencyDataPoint[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [chainData, setChainData] = useState<ChainLatencyData[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [stats, setStats] = useState<LatencyStats>({
    avg: 0,
    min: 0,
    max: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    stdDev: 0,
    totalSamples: 0,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateData = useCallback(() => {
    const newDistribution = generateLatencyDistribution();
    const newTrendData = generateTrendData();
    const newChainData = generateChainLatencyData();
    const newAnomalies = generateAnomalies();
    const newStats = calculateStats(newDistribution);

    setDistribution(newDistribution);
    setTrendData(newTrendData);
    setChainData(newChainData);
    setAnomalies(newAnomalies);
    setStats(newStats);
    setLastUpdated(new Date());
  }, []);

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
          <h2 className="text-lg font-semibold text-gray-900">{t('latencyAnalysis.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('latencyAnalysis.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {t('latencyAnalysis.lastUpdated')}: {lastUpdated.toLocaleTimeString('zh-CN')}
          </span>
          <button
            onClick={updateData}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded hover:bg-blue-100 transition-colors"
          >
            {t('latencyAnalysis.refresh')}
          </button>
        </div>
      </div>

      <StatsOverview stats={stats} />

      <PercentileCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyDistributionChart data={distribution} />
        <LatencyTrendChart data={trendData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrossChainLatencyComparison data={chainData} />
        <AnomalyDetection anomalies={anomalies} />
      </div>
    </div>
  );
}

export type { LatencyDataPoint, TrendDataPoint, ChainLatencyData, AnomalyData, LatencyStats };
