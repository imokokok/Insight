'use client';

import { useMemo } from 'react';
import { Publisher, PublisherStats } from '@/types/oracle';
import { useTranslations } from 'next-intl';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface PublisherReliabilityScoreProps {
  publisher: Publisher;
  stats?: PublisherStats;
}

const mockStats: Record<string, PublisherStats> = {
  'pub-1': {
    publisherId: 'pub-1',
    historicalAccuracy: [98.5, 99.1, 99.3, 99.0, 99.2, 99.4, 99.2],
    priceDeviations: [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.02],
    submissionFrequency: 98.7,
    averageDeviation: 0.019,
    trend: 'improving',
  },
  'pub-2': {
    publisherId: 'pub-2',
    historicalAccuracy: [96.2, 96.8, 97.1, 96.9, 97.5, 97.8, 97.8],
    priceDeviations: [0.06, 0.05, 0.04, 0.05, 0.05, 0.04, 0.05],
    submissionFrequency: 95.2,
    averageDeviation: 0.049,
    trend: 'stable',
  },
  'pub-3': {
    publisherId: 'pub-3',
    historicalAccuracy: [99.0, 99.2, 99.3, 99.4, 99.5, 99.5, 99.5],
    priceDeviations: [0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
    submissionFrequency: 99.1,
    averageDeviation: 0.011,
    trend: 'improving',
  },
  'pub-4': {
    publisherId: 'pub-4',
    historicalAccuracy: [95.5, 95.2, 94.8, 94.5, 94.2, 94.8, 95.1],
    priceDeviations: [0.07, 0.08, 0.09, 0.08, 0.08, 0.07, 0.08],
    submissionFrequency: 92.3,
    averageDeviation: 0.079,
    trend: 'declining',
  },
  'pub-5': {
    publisherId: 'pub-5',
    historicalAccuracy: [97.0, 97.2, 97.4, 97.5, 97.6, 97.8, 98.1],
    priceDeviations: [0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    submissionFrequency: 96.8,
    averageDeviation: 0.032,
    trend: 'improving',
  },
};

function TrendIndicator({
  trend,
  t,
}: {
  trend: 'improving' | 'stable' | 'declining';
  t: (key: string) => string;
}) {
  const config = {
    improving: {
      icon: '↑',
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: t('publisherReliability.trend.improving'),
    },
    stable: {
      icon: '→',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: t('publisherReliability.trend.stable'),
    },
    declining: {
      icon: '↓',
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: t('publisherReliability.trend.declining'),
    },
  };

  const { icon, color, bg, label } = config[trend];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5  text-xs font-medium ${bg} ${color}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function MiniChart({ data, color = 'blue' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  });

  const colorClass =
    color === 'green'
      ? chartColors.semantic.success
      : color === 'red'
        ? chartColors.semantic.danger
        : chartColors.recharts.primary;

  return (
    <svg className="w-full h-12" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline fill="none" stroke={colorClass} strokeWidth="2" points={points.join(' ')} />
    </svg>
  );
}

function AccuracyBar({ accuracy }: { accuracy: number }) {
  return (
    <div className="w-full bg-gray-100  h-2 overflow-hidden">
      <div
        className={`h-full  transition-all duration-500 ${
          accuracy >= 98 ? 'bg-green-500' : accuracy >= 95 ? 'bg-blue-500' : 'bg-yellow-500'
        }`}
        style={{ width: `${accuracy}%` }}
      />
    </div>
  );
}

export function PublisherReliabilityScore({
  publisher,
  stats = mockStats[publisher.id] || mockStats['pub-1'],
}: PublisherReliabilityScoreProps) {
  const t = useTranslations();

  const avgAccuracy = useMemo(() => {
    if (stats.historicalAccuracy.length === 0) return 0;
    return stats.historicalAccuracy.reduce((a, b) => a + b, 0) / stats.historicalAccuracy.length;
  }, [stats.historicalAccuracy]);

  const deviationColor = useMemo(() => {
    if (stats.averageDeviation <= 0.02) return 'text-green-600';
    if (stats.averageDeviation <= 0.05) return 'text-blue-600';
    return 'text-yellow-600';
  }, [stats.averageDeviation]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">
          {publisher.name} {t('publisherReliability.statistics')}
        </h4>
        <TrendIndicator trend={stats.trend} t={t} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50  p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {t('publisherReliability.historicalAccuracy')}
            </span>
            <span className="text-lg font-bold text-gray-900">{avgAccuracy.toFixed(1)}%</span>
          </div>
          <AccuracyBar accuracy={avgAccuracy} />
          <div className="mt-3">
            <MiniChart data={stats.historicalAccuracy} color="green" />
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('publisherReliability.last7Periods')}</p>
        </div>

        <div className="bg-gray-50  p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {t('publisherReliability.priceDeviation')}
            </span>
            <span className={`text-lg font-bold ${deviationColor}`}>
              {stats.averageDeviation.toFixed(3)}%
            </span>
          </div>
          <div className="mt-2">
            <MiniChart data={stats.priceDeviations} color="blue" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t('publisherReliability.deviationFromMedian')}
          </p>
        </div>
      </div>

      <div className="bg-gray-50  p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            {t('publisherReliability.submissionFrequency')}
          </span>
          <span className="text-lg font-bold text-gray-900">{stats.submissionFrequency}%</span>
        </div>
        <div className="w-full bg-gray-200  h-3 overflow-hidden">
          <div
            className={`h-full  transition-all duration-500 ${
              stats.submissionFrequency >= 98
                ? 'bg-green-500'
                : stats.submissionFrequency >= 95
                  ? 'bg-blue-500'
                  : 'bg-yellow-500'
            }`}
            style={{ width: `${stats.submissionFrequency}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0%</span>
          <span>{t('publisherReliability.target99')}</span>
          <span>100%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-white border border-gray-200 ">
          <p className="text-2xl font-bold text-gray-900">
            {publisher.accuracy?.toFixed(1) ?? '-'}%
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('publisherReliability.currentAccuracy')}</p>
        </div>
        <div className="text-center p-3 bg-white border border-gray-200 ">
          <p className="text-2xl font-bold text-gray-900">{publisher.latency}ms</p>
          <p className="text-xs text-gray-500 mt-1">{t('publisherReliability.avgLatency')}</p>
        </div>
        <div className="text-center p-3 bg-white border border-gray-200 ">
          <p className="text-2xl font-bold text-gray-900">
            {publisher.priceDeviation ? `${publisher.priceDeviation.toFixed(2)}%` : '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('publisherReliability.priceDeviation')}</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-3">
          {t('publisherReliability.recentActivity')}
        </h5>
        <div className="space-y-2">
          {stats.historicalAccuracy.slice(-5).map((acc, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t('publisherReliability.period')} {index + 1}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-gray-900">
                  {acc.toFixed(1)}% {t('publisherReliability.accuracy')}
                </span>
                <span className="text-gray-500">
                  {stats.priceDeviations[index]?.toFixed(3) ?? '-'}% {t('publisherReliability.dev')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
