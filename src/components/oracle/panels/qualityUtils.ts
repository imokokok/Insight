'use client';

import { semanticColors, baseColors } from '@/lib/config/colors';
import { getTimeAgo } from '@/lib/utils/timestamp';

export { getTimeAgo };

export type QualityStatus = 'excellent' | 'good' | 'warning' | 'critical';

export interface PriceDeviationData {
  oracle: string;
  price: number;
  deviation: number;
  deviationPercent: number;
  trend: number;
  status: QualityStatus;
  lastUpdate: Date;
}

export interface LatencyDistributionData {
  range: string;
  count: number;
  percentage: number;
}

export interface LatencyMetrics {
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface DataSourceReliability {
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

export interface QualityScore {
  overall: number;
  priceAccuracy: number;
  latency: number;
  reliability: number;
}

export interface DataQualityConfig {
  symbol: string;
  basePrice: number;
  priceDeviations: PriceDeviationData[];
  latencyDistribution: LatencyDistributionData[];
  latencyMetrics: LatencyMetrics;
  dataSources: DataSourceReliability[];
  qualityScore: QualityScore;
  lastUpdated: Date;
}

export interface StatusConfig {
  color: string;
  bgColor: string;
  lightBg: string;
  borderColor: string;
  label: string;
  score: number;
  semanticColor: string;
}

export const getStatusConfig = (
  t: (key: string) => string
): Record<QualityStatus, StatusConfig> => ({
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

export function getStatusFromScore(score: number): QualityStatus {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

export function generatePriceDeviationData(basePrice: number): PriceDeviationData[] {
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

export function generateLatencyDistribution(): LatencyDistributionData[] {
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

export function calculateLatencyMetrics(distribution: LatencyDistributionData[]): LatencyMetrics {
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

export function generateDataSources(): DataSourceReliability[] {
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

export function calculateQualityScore(
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
