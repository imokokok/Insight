'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { PerformanceGaugeGroup } from '../common/PerformanceGauge';
import { DataQualityScoreCard } from '../common/DataQualityScoreCard';
import { formatCompactNumber } from '@/lib/utils/format';

type NetworkStatus = 'online' | 'warning' | 'offline';

interface NetworkMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  icon: ReactNode;
}

interface BandProtocolMetrics {
  activeValidators: number;
  totalValidators: number;
  stakedAmount: number;
  stakingRate: number;
  blockHeight: number;
  blockTime: number;
  inflationRate: number;
  communityPoolBalance: number;
  tokenSymbol?: string;
}

interface NetworkDataConfig {
  activeNodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: NetworkStatus;
  latency: number;
  stakingTokenSymbol?: string;
  bandProtocolMetrics?: BandProtocolMetrics;
  solanaNetworkMetrics?: SolanaNetworkMetrics;
}

interface SolanaNetworkMetrics {
  blockConfirmationTime: number;
  pythProgramStatus: 'active' | 'inactive' | 'degraded';
  pythProgramAccount: string;
  slotHeight: number;
  tps: number;
  avgBlockTime: number;
  validatorCount: number;
  totalStake: number;
}

const getStatusConfig = (t: (key: string) => string) => ({
  online: {
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgGradient: 'from-green-50 to-green-100',
    label: t('networkHealth.status.online'),
    pulseColor: 'bg-green-400',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgGradient: 'from-yellow-50 to-yellow-100',
    label: t('networkHealth.status.warning'),
    pulseColor: 'bg-yellow-400',
  },
  offline: {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgGradient: 'from-red-50 to-red-100',
    label: t('networkHealth.status.offline'),
    pulseColor: 'bg-red-400',
  },
});

function NetworkStatusIndicator({ status }: { status: NetworkStatus }) {
  const { t } = useI18n();
  const statusConfig = getStatusConfig(t);
  const config = statusConfig[status];

  return (
    <div className={`bg-white border ${config.borderColor} rounded-xl p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            {t('networkHealth.networkStatus')}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`relative flex h-4 w-4`}>
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${config.bgColor}`}
                ></span>
              </span>
            </div>
            <span className={`text-2xl font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {t('networkHealth.monitoring')} • {t('networkHealth.lastCheck')}:{' '}
            {t('networkHealth.justNow')}
          </p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${config.bgGradient}`}>
          <svg
            className={`w-8 h-8 ${config.textColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MetricCardComponent({ metric }: { metric: NetworkMetric }) {
  const { t } = useI18n();
  const trendColor =
    metric.trendDirection === 'up'
      ? 'text-green-600'
      : metric.trendDirection === 'down'
        ? 'text-red-600'
        : 'text-gray-500';

  const trendIcon =
    metric.trendDirection === 'up' ? '↑' : metric.trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{metric.title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-900 text-xl font-bold">{metric.value}</span>
            {metric.unit && <span className="text-gray-500 text-sm">{metric.unit}</span>}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>
              {metric.trend > 0 ? '+' : ''}
              {metric.trend}%
            </span>
            <span className="text-gray-400 ml-1">{t('networkHealth.vsLastWeek')}</span>
          </div>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">{metric.icon}</div>
      </div>
    </div>
  );
}

function ActivityHeatmap({
  hourlyData,
  onHourClick,
}: {
  hourlyData: number[];
  onHourClick?: (hour: number) => void;
}) {
  const { t } = useI18n();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const maxValue = Math.max(...hourlyData);
  const minValue = Math.min(...hourlyData);

  const getIntensity = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    if (ratio > 0.8) return 'bg-blue-400';
    if (ratio > 0.6) return 'bg-blue-500';
    if (ratio > 0.4) return 'bg-blue-600';
    if (ratio > 0.2) return 'bg-blue-700';
    return 'bg-blue-200';
  };

  const getHourLabel = (index: number) => {
    return `${index.toString().padStart(2, '0')}:00`;
  };

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    onHourClick?.(hour);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('networkHealth.activityHeatmap.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('networkHealth.activityHeatmap.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{t('networkHealth.activityHeatmap.low')}</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <div className="w-3 h-3 bg-blue-700 rounded"></div>
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
          </div>
          <span>{t('networkHealth.activityHeatmap.high')}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-1.5">
        {hourlyData.map((value, index) => (
          <div key={index} className="group relative">
            <div
              className={`h-10 rounded-md ${getIntensity(value)} transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-blue-300 cursor-pointer ${
                selectedHour === index ? 'ring-2 ring-blue-500' : ''
              }`}
              title={`${getHourLabel(index)}: ${value.toLocaleString()} ${t('networkHealth.activityHeatmap.requests')}`}
              onClick={() => handleHourClick(index)}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
              {getHourLabel(index)}: {value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-1.5 mt-2">
        {[0, 4, 8, 12, 16, 20].map((hour) => (
          <div key={hour} className="text-center">
            <span className="text-xs text-gray-500">{getHourLabel(hour)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {t('networkHealth.activityHeatmap.totalRequests')}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {hourlyData.reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('networkHealth.activityHeatmap.peakHour')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {getHourLabel(hourlyData.indexOf(maxValue))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('networkHealth.activityHeatmap.avgPerHour')}</p>
          <p className="text-sm font-semibold text-gray-900">
            {Math.round(hourlyData.reduce((a, b) => a + b, 0) / 24).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{t('networkHealth.activityHeatmap.peakRequests')}</p>
          <p className="text-sm font-semibold text-gray-900">{maxValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

function BandProtocolMetricsCard({ metrics }: { metrics: BandProtocolMetrics }) {
  const { t } = useI18n();
  const tokenSymbol = metrics.tokenSymbol || 'BAND';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('networkHealth.bandProtocol.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('networkHealth.bandProtocol.subtitle')}</p>
        </div>
        <div className="p-2 bg-purple-50 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.activeValidators')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {metrics.activeValidators} / {metrics.totalValidators}
            </p>
            <p className="text-xs text-gray-400">
              {((metrics.activeValidators / metrics.totalValidators) * 100).toFixed(1)}%{' '}
              {t('networkHealth.bandProtocol.activePercent')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.stakedTokens')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {formatCompactNumber(metrics.stakedAmount)} {tokenSymbol}
            </p>
            <p className="text-xs text-gray-400">
              {t('networkHealth.bandProtocol.stakingRate')} {metrics.stakingRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.blockHeight')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {metrics.blockHeight.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">
              {t('networkHealth.bandProtocol.blockTime')} {metrics.blockTime.toFixed(1)}s
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.inflationRate')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{metrics.inflationRate.toFixed(2)}%</p>
            <p className="text-xs text-gray-400">
              {t('networkHealth.bandProtocol.annualInflation')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.communityPoolBalance')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {formatCompactNumber(metrics.communityPoolBalance)} {tokenSymbol}
            </p>
            <p className="text-xs text-gray-400">{t('networkHealth.bandProtocol.communityPool')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SolanaNetworkStatusCard({ metrics }: { metrics: SolanaNetworkMetrics }) {
  const { t } = useI18n();

  const statusConfig = {
    active: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: t('pythNetwork.solana.status.active'),
    },
    inactive: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: t('pythNetwork.solana.status.inactive'),
    },
    degraded: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: t('pythNetwork.solana.status.degraded'),
    },
  };

  const status = statusConfig[metrics.pythProgramStatus];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">{t('pythNetwork.solana.title')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('pythNetwork.solana.subtitle')}</p>
        </div>
        <div className="p-2 bg-purple-100 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {t('pythNetwork.solana.pythProgramStatus')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-lg text-xs font-medium ${status.bgColor} ${status.color}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {t('pythNetwork.solana.blockConfirmationTime')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{metrics.blockConfirmationTime}ms</p>
            <p className="text-xs text-gray-400">{t('pythNetwork.solana.avgConfirmation')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-sm text-gray-600">{t('pythNetwork.solana.slotHeight')}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {metrics.slotHeight.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{t('pythNetwork.solana.currentSlot')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm text-gray-600">{t('pythNetwork.solana.tps')}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{metrics.tps.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{t('pythNetwork.solana.transactionsPerSecond')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">{t('pythNetwork.solana.totalStake')}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {(metrics.totalStake / 1000000).toFixed(2)}M SOL
            </p>
            <p className="text-xs text-gray-400">
              {t('pythNetwork.solana.validators')}: {metrics.validatorCount}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {t('pythNetwork.solana.pythProgramAccount')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-1 rounded">
              {metrics.pythProgramAccount.slice(0, 8)}...{metrics.pythProgramAccount.slice(-8)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataFreshnessIndicator({ lastUpdated, latency }: { lastUpdated: Date; latency: number }) {
  const { t } = useI18n();

  const getLatencyColor = (ms: number) => {
    if (ms < 100)
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: t('networkHealth.dataFreshness.excellent'),
      };
    if (ms < 500)
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        label: t('networkHealth.dataFreshness.good'),
      };
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      label: t('networkHealth.dataFreshness.slow'),
    };
  };

  const latencyStatus = getLatencyColor(latency);

  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}${t('networkHealth.dataFreshness.secondsAgo')}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}${t('networkHealth.dataFreshness.minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    return `${hours}${t('networkHealth.dataFreshness.hoursAgo')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('networkHealth.dataFreshness.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('networkHealth.dataFreshness.subtitle')}
          </p>
        </div>
        <div className="p-2 bg-gray-100 rounded-lg">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.dataFreshness.lastUpdated')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {lastUpdated.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-400">{getTimeAgo()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.dataFreshness.dataLatency')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5`}>
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${latencyStatus.bgColor} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${latencyStatus.bgColor}`}
              ></span>
            </span>
            <span className={`text-sm font-semibold ${latencyStatus.color}`}>{latency}ms</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 ${latencyStatus.color}`}>
              {latencyStatus.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NetworkHealthPanelProps {
  config: NetworkDataConfig;
  autoUpdate?: boolean;
  updateInterval?: number;
  onTimeRangeChange?: (startTime: number, endTime: number) => void;
}

export function NetworkHealthPanel({
  config: initialConfig,
  autoUpdate = true,
  updateInterval = 30000,
  onTimeRangeChange,
}: NetworkHealthPanelProps) {
  const { t } = useI18n();
  const [networkData, setNetworkData] = useState(initialConfig);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleHourClick = useCallback(
    (hour: number) => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const endTime = now - (23 - hour) * oneHour;
      const startTime = endTime - oneHour;
      onTimeRangeChange?.(startTime, endTime);
    },
    [onTimeRangeChange]
  );

  const simulateDataUpdate = useCallback(() => {
    setNetworkData((prev) => {
      const fluctuation = () => (Math.random() - 0.5) * 0.02;

      const newHourlyActivity = prev.hourlyActivity.map((value) =>
        Math.max(1000, Math.round(value * (1 + fluctuation())))
      );

      return {
        ...prev,
        activeNodes: Math.max(1800, prev.activeNodes + Math.round((Math.random() - 0.5) * 10)),
        nodeUptime: Math.min(100, Math.max(99, prev.nodeUptime + fluctuation() * 0.1)),
        avgResponseTime: Math.max(
          200,
          Math.min(300, prev.avgResponseTime + Math.round((Math.random() - 0.5) * 20))
        ),
        hourlyActivity: newHourlyActivity,
        latency: Math.max(50, Math.min(800, prev.latency + Math.round((Math.random() - 0.5) * 30))),
      };
    });
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (autoUpdate) {
      intervalRef.current = setInterval(simulateDataUpdate, updateInterval);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate, autoUpdate, updateInterval]);

  const metrics: NetworkMetric[] = [
    {
      id: 'activeNodes',
      title: t('networkHealth.activeNodes'),
      value: `${networkData.activeNodes.toLocaleString()}+`,
      trend: 2.5,
      trendDirection: 'up',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      id: 'nodeUptime',
      title: t('networkHealth.nodeUptime'),
      value: networkData.nodeUptime.toFixed(1),
      unit: '%',
      trend: 0.1,
      trendDirection: 'up',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'avgResponseTime',
      title: t('networkHealth.avgResponseTime'),
      value: networkData.avgResponseTime.toString(),
      unit: 'ms',
      trend: -5.2,
      trendDirection: 'down',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      id: 'updateFrequency',
      title: t('networkHealth.updateFrequency'),
      value: `${t('networkHealth.every')} ${networkData.updateFrequency}`,
      unit: t('networkHealth.seconds'),
      trend: 0,
      trendDirection: 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      id: 'totalStaked',
      title: t('networkHealth.totalStaked'),
      value: (networkData.totalStaked / 1000000).toFixed(0),
      unit: `M ${networkData.stakingTokenSymbol || 'TOKEN'}`,
      trend: 3.8,
      trendDirection: 'up',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'dataFeeds',
      title: t('networkHealth.dataFeeds'),
      value: `${networkData.dataFeeds.toLocaleString()}+`,
      trend: 1.2,
      trendDirection: 'up',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  const performanceGauges = [
    {
      value: networkData.avgResponseTime,
      max: 1000,
      label: t('networkHealth.performanceDashboard.responseTime'),
      unit: 'ms',
      type: 'value' as const,
      warningThreshold: 500,
      dangerThreshold: 800,
    },
    {
      value: networkData.nodeUptime,
      max: 100,
      label: t('networkHealth.performanceDashboard.uptime'),
      unit: '%',
      type: 'percentage' as const,
      warningThreshold: 95,
      dangerThreshold: 90,
    },
    {
      value: networkData.updateFrequency,
      max: 60,
      label: t('networkHealth.performanceDashboard.updateFreq'),
      unit: t('networkHealth.seconds'),
      type: 'value' as const,
      warningThreshold: 30,
      dangerThreshold: 45,
    },
  ];

  const bandProtocolGauges = networkData.bandProtocolMetrics
    ? [
        {
          value:
            (networkData.bandProtocolMetrics.activeValidators /
              networkData.bandProtocolMetrics.totalValidators) *
            100,
          max: 100,
          label: t('networkHealth.performanceDashboard.validatorActiveRate'),
          unit: '%',
          type: 'percentage' as const,
          warningThreshold: 85,
          dangerThreshold: 70,
        },
        {
          value: networkData.bandProtocolMetrics.stakingRate,
          max: 100,
          label: t('networkHealth.performanceDashboard.stakingRate'),
          unit: '%',
          type: 'percentage' as const,
          warningThreshold: 50,
          dangerThreshold: 30,
        },
        {
          value: networkData.bandProtocolMetrics.blockTime,
          max: 10,
          label: t('networkHealth.performanceDashboard.blockTime'),
          unit: 's',
          type: 'value' as const,
          warningThreshold: 5,
          dangerThreshold: 8,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <NetworkStatusIndicator status={networkData.status} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCardComponent key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('networkHealth.performanceDashboard.title')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('networkHealth.performanceDashboard.subtitle')}
          </p>
        </div>
        <PerformanceGaugeGroup gauges={performanceGauges} size={160} />
      </div>

      <DataQualityScoreCard />

      {networkData.bandProtocolMetrics && (
        <>
          <BandProtocolMetricsCard metrics={networkData.bandProtocolMetrics} />
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('networkHealth.bandProtocolDashboard.title')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('networkHealth.bandProtocolDashboard.subtitle')}
              </p>
            </div>
            <PerformanceGaugeGroup gauges={bandProtocolGauges} size={160} />
          </div>
        </>
      )}

      {networkData.solanaNetworkMetrics && (
        <SolanaNetworkStatusCard metrics={networkData.solanaNetworkMetrics} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityHeatmap hourlyData={networkData.hourlyActivity} onHourClick={handleHourClick} />
        </div>

        <DataFreshnessIndicator lastUpdated={lastUpdated} latency={networkData.latency} />
      </div>
    </div>
  );
}

export type { NetworkDataConfig, NetworkMetric, BandProtocolMetrics, SolanaNetworkMetrics };
