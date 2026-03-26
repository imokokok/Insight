'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from '@/i18n';
import { PerformanceGaugeGroup } from '@/components/oracle/data-display/PerformanceGauge';
import { DataQualityScoreCard } from '@/components/oracle/data-display/DataQualityScoreCard';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';
import { MetricCard } from './MetricCard';
import { ActivityHeatmap } from './ActivityHeatmap';
import { BandProtocolMetricsCard } from './BandProtocolMetricsCard';
import { SolanaNetworkStatusCard } from './SolanaNetworkStatusCard';
import { DataFreshnessIndicator } from './DataFreshnessIndicator';
import { NetworkDataConfig, NetworkMetric } from './types';

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
  const t = useTranslations();
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
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="bg-white border border-gray-200 p-6">
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
          <div className="bg-purple-50 border border-purple-200 p-6">
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

export type { NetworkDataConfig, NetworkMetric } from './types';
export type { BandProtocolMetrics, SolanaNetworkMetrics } from './types';
