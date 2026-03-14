'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';

interface AnomalyData {
  timestamp: number;
  price: number;
  deviation: number;
  type: 'spike' | 'drop';
}

interface AnomalyStatsPanelProps {
  anomalies: AnomalyData[];
  className?: string;
}

const COLORS = {
  spike: chartColors.semantic.danger,
  drop: chartColors.recharts.primary,
};

const SEVERITY_COLORS = {
  high: chartColors.semantic.danger,
  medium: chartColors.semantic.warning,
  low: chartColors.semantic.success,
};

function getSeverity(deviation: number): 'high' | 'medium' | 'low' {
  if (deviation >= 3) return 'high';
  if (deviation >= 2.5) return 'medium';
  return 'low';
}

function getRecommendations(anomalies: AnomalyData[], t: (key: string) => string): string[] {
  const recommendations: string[] = [];
  const spikeCount = anomalies.filter((a) => a.type === 'spike').length;
  const dropCount = anomalies.filter((a) => a.type === 'drop').length;
  const highSeverityCount = anomalies.filter((a) => getSeverity(a.deviation) === 'high').length;

  if (highSeverityCount > 0) {
    recommendations.push(t('anomalyStats.recommendation.highSeverityFound'));
  }

  if (spikeCount > dropCount * 2) {
    recommendations.push(t('anomalyStats.recommendation.spikeFrequent'));
  } else if (dropCount > spikeCount * 2) {
    recommendations.push(t('anomalyStats.recommendation.dropFrequent'));
  }

  if (anomalies.length > 10) {
    recommendations.push(t('anomalyStats.recommendation.tooManyAnomalies'));
  }

  if (anomalies.length === 0) {
    recommendations.push(t('anomalyStats.recommendation.noAnomalies'));
  }

  const avgDeviation = anomalies.reduce((sum, a) => sum + a.deviation, 0) / anomalies.length || 0;
  if (avgDeviation > 3) {
    recommendations.push(t('anomalyStats.recommendation.highAvgDeviation'));
  }

  return recommendations.length > 0
    ? recommendations
    : [t('anomalyStats.recommendation.systemNormal')];
}

export function AnomalyStatsPanel({ anomalies, className = '' }: AnomalyStatsPanelProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const spikeCount = anomalies.filter((a) => a.type === 'spike').length;
    const dropCount = anomalies.filter((a) => a.type === 'drop').length;
    const highSeverityCount = anomalies.filter((a) => getSeverity(a.deviation) === 'high').length;
    const mediumSeverityCount = anomalies.filter(
      (a) => getSeverity(a.deviation) === 'medium'
    ).length;
    const lowSeverityCount = anomalies.filter((a) => getSeverity(a.deviation) === 'low').length;

    const avgDeviation =
      anomalies.length > 0
        ? anomalies.reduce((sum, a) => sum + a.deviation, 0) / anomalies.length
        : 0;

    const maxDeviation = anomalies.length > 0 ? Math.max(...anomalies.map((a) => a.deviation)) : 0;

    return {
      total: anomalies.length,
      spikeCount,
      dropCount,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
      avgDeviation,
      maxDeviation,
    };
  }, [anomalies]);

  const typeDistribution = useMemo(
    () => [
      { name: t('anomalyStats.priceSpike'), value: stats.spikeCount, color: COLORS.spike },
      { name: t('anomalyStats.priceDrop'), value: stats.dropCount, color: COLORS.drop },
    ],
    [stats.spikeCount, stats.dropCount, t]
  );

  const severityDistribution = useMemo(
    () => [
      {
        name: t('anomalyStats.highSeverity'),
        value: stats.highSeverityCount,
        color: SEVERITY_COLORS.high,
      },
      {
        name: t('anomalyStats.mediumSeverity'),
        value: stats.mediumSeverityCount,
        color: SEVERITY_COLORS.medium,
      },
      {
        name: t('anomalyStats.lowSeverity'),
        value: stats.lowSeverityCount,
        color: SEVERITY_COLORS.low,
      },
    ],
    [stats.highSeverityCount, stats.mediumSeverityCount, stats.lowSeverityCount, t]
  );

  const recommendations = useMemo(() => getRecommendations(anomalies, t), [anomalies, t]);

  const timeDistribution = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    anomalies.forEach((a) => {
      const hour = new Date(a.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: t('anomalyStats.hourFormat', { hour }),
        count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
      .slice(0, 12);
  }, [anomalies, t]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">{t('anomalyStats.totalAnomalies')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{stats.spikeCount}</div>
          <div className="text-xs text-gray-500 mt-1">{t('anomalyStats.priceSpike')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.dropCount}</div>
          <div className="text-xs text-gray-500 mt-1">{t('anomalyStats.priceDrop')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-600">{stats.avgDeviation.toFixed(2)}σ</div>
          <div className="text-xs text-gray-500 mt-1">{t('anomalyStats.avgDeviation')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title={t('anomalyStats.typeDistribution')}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, t('anomalyStats.count')]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${chartColors.recharts.grid}`,
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {typeDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('anomalyStats.severityDistribution')}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, t('anomalyStats.count')]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {severityDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">
                    {item.name}
                    {t('anomalyStats.severitySuffix')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>

      {timeDistribution.length > 0 && (
        <DashboardCard title={t('anomalyStats.timeDistribution')}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeDistribution}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke={chartColors.recharts.tick} />
                <YAxis tick={{ fontSize: 10 }} stroke={chartColors.recharts.tick} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: `1px solid ${chartColors.recharts.grid}`,
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill={chartColors.recharts.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      )}

      <DashboardCard title={t('anomalyStats.recommendations')}>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <svg
                className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-700">{rec}</span>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
