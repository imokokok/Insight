'use client';

import { useState, useMemo } from 'react';
import { DashboardCard } from '../common/DashboardCard';
import { useTranslations } from 'next-intl';
import { chartColors, semanticColors, baseColors, animationColors } from '@/lib/config/colors';

export interface AnomalyData {
  timestamp: number;
  price: number;
  expectedPrice: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'stale' | 'outlier';
  oracle: string;
}

export interface AnomalyStatsPanelProps {
  anomalies: AnomalyData[];
  loading?: boolean;
}

const getSeverityConfig = (t: (key: string) => string) => ({
  low: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: t('panels.anomalyStats.low'),
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: t('panels.anomalyStats.medium'),
  },
  high: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: t('panels.anomalyStats.high'),
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: t('panels.anomalyStats.criticalSeverity'),
  },
});

const getTypeConfig = (t: (key: string) => string) => ({
  spike: { label: t('panels.anomalyStats.spike'), icon: '↑', color: 'text-green-600' },
  drop: { label: t('panels.anomalyStats.drop'), icon: '↓', color: 'text-red-600' },
  stale: { label: t('panels.anomalyStats.stale'), icon: '−', color: 'text-gray-600' },
  outlier: { label: t('panels.anomalyStats.outlier'), icon: '!', color: 'text-orange-600' },
});

function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className="text-gray-900 text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="p-2.5 bg-red-50 rounded-lg text-red-600">{icon}</div>
      </div>
    </div>
  );
}

function AnomalyList({ anomalies }: { anomalies: AnomalyData[] }) {
  const t = useTranslations();
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const SEVERITY_CONFIG = getSeverityConfig(t);
  const TYPE_CONFIG = getTypeConfig(t);

  const filteredAnomalies = useMemo(() => {
    if (filter === 'all') return anomalies;
    return anomalies.filter((a) => a.severity === filter);
  }, [anomalies, filter]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardCard title={t('panels.anomalyStats.recentAnomalies')}>
      <div className="space-y-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'low', 'medium', 'high', 'critical'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setFilter(severity)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === severity
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {severity === 'all' ? t('panels.anomalyStats.all') : SEVERITY_CONFIG[severity].label}
            </button>
          ))}
        </div>

        {/* Anomaly list */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
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
              <p>{t('panels.anomalyStats.noAnomalies')}</p>
            </div>
          ) : (
            filteredAnomalies.map((anomaly, index) => {
              const severityConfig = SEVERITY_CONFIG[anomaly.severity];
              const typeConfig = TYPE_CONFIG[anomaly.type];

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${severityConfig.borderColor} ${severityConfig.bgColor}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-lg font-bold ${typeConfig.color}`}>
                          {typeConfig.icon}
                        </span>
                        <span className="font-medium text-gray-900">{typeConfig.label}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${severityConfig.bgColor} ${severityConfig.color}`}
                        >
                          {severityConfig.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t('panels.anomalyStats.price')}: </span>
                          <span className="font-mono font-medium">${anomaly.price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {t('panels.anomalyStats.expected')}:{' '}
                          </span>
                          <span className="font-mono font-medium">
                            ${anomaly.expectedPrice.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {t('panels.anomalyStats.deviation')}:{' '}
                          </span>
                          <span
                            className={`font-mono font-medium ${
                              anomaly.deviation > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {anomaly.deviation > 0 ? '+' : ''}
                            {anomaly.deviation.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('panels.anomalyStats.source')}: </span>
                          <span className="font-medium">{anomaly.oracle}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(anomaly.timestamp)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

function SeverityDistribution({ anomalies }: { anomalies: AnomalyData[] }) {
  const t = useTranslations();
  const SEVERITY_CONFIG = getSeverityConfig(t);

  const distribution = useMemo(() => {
    const counts = {
      low: anomalies.filter((a) => a.severity === 'low').length,
      medium: anomalies.filter((a) => a.severity === 'medium').length,
      high: anomalies.filter((a) => a.severity === 'high').length,
      critical: anomalies.filter((a) => a.severity === 'critical').length,
    };
    const total = anomalies.length;
    return Object.entries(counts).map(([severity, count]) => ({
      severity: severity as keyof ReturnType<typeof getSeverityConfig>,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [anomalies]);

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <DashboardCard title={t('panels.anomalyStats.severityDistribution')}>
      <div className="space-y-4">
        {distribution.map(({ severity, count, percentage }) => {
          const config = SEVERITY_CONFIG[severity];
          return (
            <div key={severity}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${config.bgColor.replace('bg-', 'bg-').replace('50', '500')}`}
                  />
                  <span className="text-sm text-gray-600">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                  <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${config.bgColor.replace('bg-', 'bg-').replace('50', '500')}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function TypeBreakdown({ anomalies }: { anomalies: AnomalyData[] }) {
  const t = useTranslations();
  const TYPE_CONFIG = getTypeConfig(t);

  const breakdown = useMemo(() => {
    const counts = {
      spike: anomalies.filter((a) => a.type === 'spike').length,
      drop: anomalies.filter((a) => a.type === 'drop').length,
      stale: anomalies.filter((a) => a.type === 'stale').length,
      outlier: anomalies.filter((a) => a.type === 'outlier').length,
    };
    return Object.entries(counts).map(([type, count]) => ({
      type: type as keyof ReturnType<typeof getTypeConfig>,
      count,
    }));
  }, [anomalies]);

  return (
    <DashboardCard title={t('panels.anomalyStats.typeBreakdown')}>
      <div className="grid grid-cols-2 gap-3">
        {breakdown.map(({ type, count }) => {
          const config = TYPE_CONFIG[type];
          return (
            <div key={type} className="bg-gray-50 rounded-lg p-3 text-center">
              <span className={`text-2xl font-bold ${config.color}`}>{config.icon}</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{config.label}</p>
              <p className="text-lg font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

export function AnomalyStatsPanel({ anomalies, loading = false }: AnomalyStatsPanelProps) {
  const t = useTranslations();

  const stats = useMemo(() => {
    const total = anomalies.length;
    const critical = anomalies.filter((a) => a.severity === 'critical').length;
    const high = anomalies.filter((a) => a.severity === 'high').length;
    const avgDeviation =
      total > 0 ? anomalies.reduce((sum, a) => sum + Math.abs(a.deviation), 0) / total : 0;

    // Calculate trend (compare last 24h vs previous 24h)
    const now = Date.now();
    const last24h = anomalies.filter((a) => a.timestamp > now - 24 * 60 * 60 * 1000).length;
    const prev24h = anomalies.filter(
      (a) => a.timestamp > now - 48 * 60 * 60 * 1000 && a.timestamp <= now - 24 * 60 * 60 * 1000
    ).length;
    const trend = prev24h > 0 ? ((last24h - prev24h) / prev24h) * 100 : 0;

    return { total, critical, high, avgDeviation, trend };
  }, [anomalies]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse h-96"></div>
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse h-48"></div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse h-48"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('panels.anomalyStats.totalAnomalies')}
          value={stats.total}
          trend={{ value: stats.trend, isPositive: stats.trend < 0 }}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('panels.anomalyStats.criticalAnomalies')}
          value={stats.critical}
          subtitle={
            stats.total > 0 ? `${((stats.critical / stats.total) * 100).toFixed(1)}%` : '0%'
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title={t('panels.anomalyStats.highSeverity')}
          value={stats.high}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title={t('panels.anomalyStats.avgDeviation')}
          value={`${stats.avgDeviation.toFixed(2)}%`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyList anomalies={anomalies} />
        <div className="space-y-6">
          <SeverityDistribution anomalies={anomalies} />
          <TypeBreakdown anomalies={anomalies} />
        </div>
      </div>
    </div>
  );
}

export default AnomalyStatsPanel;
