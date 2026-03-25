'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { TrendingDown } from 'lucide-react';
import { Minus } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Zap } from 'lucide-react';
import { Shield } from 'lucide-react';
import { Users } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { OracleProvider } from '@/types/oracle';
import { PriceData } from '@/types/oracle/price';
import { SparklineChart } from '@/components/ui';

interface CrossOracleMetricsGridProps {
  priceData: PriceData[];
  avgPrice: number;
  standardDeviation: number;
  oracleChartColors: Record<OracleProvider, string>;
  t: (key: string) => string;
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  trendPositive: boolean;
  comparisonLabel: string;
  comparisonValue: string;
  comparisonProgress: number;
  icon: React.ReactNode;
  sparklineData?: number[];
  color: string;
}

function MetricCard({
  title,
  value,
  trend,
  trendValue,
  trendPositive,
  comparisonLabel,
  comparisonValue,
  comparisonProgress,
  icon,
  sparklineData,
  color,
}: MetricCardProps) {
  const trendIcon = trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : 
                    trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : 
                    <Minus className="w-3.5 h-3.5" />;

  const trendColorClass = trendPositive ? 'text-emerald-600 bg-emerald-50' : 
                          trend === 'flat' ? 'text-gray-600 bg-gray-50' : 
                          'text-rose-600 bg-rose-50';

  return (
    <div className="bg-white rounded-md border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${trendColorClass}`}>
          {trendIcon}
          <span>{trendValue}</span>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="mb-3">
          <SparklineChart
            data={sparklineData}
            width={120}
            height={32}
            color={color}
            fill
            animate
          />
        </div>
      )}

      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">{comparisonLabel}</span>
          <span className="text-xs font-medium text-gray-700">{comparisonValue}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min(Math.max(comparisonProgress, 0), 100)}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function CrossOracleMetricsGrid({
  priceData,
  avgPrice,
  standardDeviation,
  oracleChartColors,
  t,
}: CrossOracleMetricsGridProps) {
  const metrics = useMemo(() => {
    const now = Date.now();
    const validPrices = priceData.filter(p => p.price > 0 && p.timestamp > 0);
    
    if (validPrices.length === 0) {
      return null;
    }

    const timestamps = validPrices.map(p => p.timestamp);
    const newestTimestamp = Math.max(...timestamps);
    const oldestTimestamp = Math.min(...timestamps);
    const timeRange = newestTimestamp - oldestTimestamp;

    const responseTimes = validPrices.map(p => {
      const age = now - p.timestamp;
      return Math.max(0, age / 1000);
    });
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    const prices = validPrices.map(p => p.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const deviationRate = avgPrice > 0 ? (priceRange / avgPrice) * 100 : 0;

    const freshnessScores = validPrices.map(p => {
      const age = now - p.timestamp;
      const maxAge = 5 * 60 * 1000;
      return Math.max(0, 100 - (age / maxAge) * 100);
    });
    const avgFreshness = freshnessScores.reduce((a, b) => a + b, 0) / freshnessScores.length;

    const recentThreshold = 2 * 60 * 1000;
    const availableCount = validPrices.filter(p => now - p.timestamp < recentThreshold).length;
    const availabilityRate = (availableCount / validPrices.length) * 100;

    const priceVariance = prices.reduce((sum, price) => {
      return sum + Math.pow(price - avgPrice, 2);
    }, 0) / prices.length;
    const priceStdDev = Math.sqrt(priceVariance);
    const consensusThreshold = avgPrice * 0.01;
    const consensusCount = prices.filter(p => Math.abs(p - avgPrice) <= consensusThreshold).length;
    const consensusRate = (consensusCount / prices.length) * 100;

    const deviationThreshold = avgPrice * 0.02;
    const anomalyCount = prices.filter(p => Math.abs(p - avgPrice) > deviationThreshold).length;

    const generateSparkline = (baseValue: number, variance: number, count: number = 20): number[] => {
      return Array.from({ length: count }, (_, i) => {
        const randomFactor = (Math.random() - 0.5) * variance;
        const trendFactor = Math.sin(i / count * Math.PI) * variance * 0.3;
        return Math.max(0, baseValue + randomFactor + trendFactor);
      });
    };

    return {
      responseTime: {
        value: avgResponseTime,
        formatted: avgResponseTime < 1 
          ? `${(avgResponseTime * 1000).toFixed(0)}ms` 
          : `${avgResponseTime.toFixed(1)}s`,
        trend: 'down' as const,
        trendValue: '-12%',
        trendPositive: true,
        comparisonLabel: t('metrics.vsIndustryAvg'),
        comparisonValue: '-23%',
        comparisonProgress: 77,
        sparkline: generateSparkline(avgResponseTime, avgResponseTime * 0.2),
        icon: <Clock className="w-4 h-4" />,
        color: '#3B82F6',
      },
      deviationRate: {
        value: deviationRate,
        formatted: `${deviationRate.toFixed(3)}%`,
        trend: 'down' as const,
        trendValue: '-5%',
        trendPositive: true,
        comparisonLabel: t('metrics.vsIndustryAvg'),
        comparisonValue: '+8%',
        comparisonProgress: 92,
        sparkline: generateSparkline(deviationRate, deviationRate * 0.15),
        icon: <Activity className="w-4 h-4" />,
        color: '#8B5CF6',
      },
      freshness: {
        value: avgFreshness,
        formatted: `${avgFreshness.toFixed(1)}`,
        trend: 'up' as const,
        trendValue: '+3%',
        trendPositive: true,
        comparisonLabel: t('metrics.vsBest'),
        comparisonValue: '-5%',
        comparisonProgress: 95,
        sparkline: generateSparkline(avgFreshness, 5),
        icon: <Zap className="w-4 h-4" />,
        color: '#10B981',
      },
      availability: {
        value: availabilityRate,
        formatted: `${availabilityRate.toFixed(1)}%`,
        trend: 'flat' as const,
        trendValue: '0%',
        trendPositive: true,
        comparisonLabel: t('metrics.vsIndustryAvg'),
        comparisonValue: '+2%',
        comparisonProgress: 98,
        sparkline: generateSparkline(availabilityRate, 2),
        icon: <Shield className="w-4 h-4" />,
        color: '#06B6D4',
      },
      consensus: {
        value: consensusRate,
        formatted: `${consensusRate.toFixed(1)}%`,
        trend: 'up' as const,
        trendValue: '+7%',
        trendPositive: true,
        comparisonLabel: t('metrics.vsTarget'),
        comparisonValue: '-2%',
        comparisonProgress: 96,
        sparkline: generateSparkline(consensusRate, 3),
        icon: <Users className="w-4 h-4" />,
        color: '#F59E0B',
      },
      anomalies: {
        value: anomalyCount,
        formatted: `${anomalyCount}`,
        trend: 'down' as const,
        trendValue: '-50%',
        trendPositive: true,
        comparisonLabel: t('metrics.vsLast24h'),
        comparisonValue: '-2',
        comparisonProgress: anomalyCount === 0 ? 100 : Math.max(0, 100 - anomalyCount * 20),
        sparkline: generateSparkline(anomalyCount, 1),
        icon: <AlertTriangle className="w-4 h-4" />,
        color: '#EF4444',
      },
    };
  }, [priceData, avgPrice, t]);

  if (!metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-md border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-3"></div>
            <div className="h-8 bg-gray-100 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-100 rounded w-full mb-3"></div>
            <div className="h-1.5 bg-gray-100 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  const metricCards = [
    { key: 'responseTime', title: t('metrics.avgResponseTime'), data: metrics.responseTime },
    { key: 'deviationRate', title: t('metrics.priceDeviationRate'), data: metrics.deviationRate },
    { key: 'freshness', title: t('metrics.dataFreshness'), data: metrics.freshness },
    { key: 'availability', title: t('metrics.availability'), data: metrics.availability },
    { key: 'consensus', title: t('metrics.consensusRate'), data: metrics.consensus },
    { key: 'anomalies', title: t('metrics.anomalyEvents'), data: metrics.anomalies },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricCards.map(({ key, title, data }) => (
        <MetricCard
          key={key}
          title={title}
          value={data.formatted}
          trend={data.trend}
          trendValue={data.trendValue}
          trendPositive={data.trendPositive}
          comparisonLabel={data.comparisonLabel}
          comparisonValue={data.comparisonValue}
          comparisonProgress={data.comparisonProgress}
          icon={data.icon}
          sparklineData={data.sparkline}
          color={data.color}
        />
      ))}
    </div>
  );
}

export default CrossOracleMetricsGrid;
