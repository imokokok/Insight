'use client';

import { useState } from 'react';

import { DashboardCard } from '@/components/oracle';
import { DataFreshnessIndicator } from '@/components/oracle/alerts';
import { SecurityTimeline, MitigationMeasuresGrid } from '@/components/oracle/data-display';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type RiskMetrics } from '@/lib/oracles/tellor';
import type { RiskEvent, MitigationMeasure } from '@/types/risk';

interface TellorRiskPanelProps {
  data: RiskMetrics;
}

const getTellorSecurityEvents = (t: ReturnType<typeof useTranslations>): RiskEvent[] => [
  {
    date: '2024-02-15',
    type: 'upgrade',
    title: t('tellor.risk.securityEvents.tellorLayerLaunch.title'),
    description: t('tellor.risk.securityEvents.tellorLayerLaunch.description'),
    status: 'resolved',
  },
  {
    date: '2024-01-20',
    type: 'response',
    title: t('tellor.risk.securityEvents.disputeResolutionOptimization.title'),
    description: t('tellor.risk.securityEvents.disputeResolutionOptimization.description'),
    status: 'resolved',
  },
  {
    date: '2023-12-10',
    type: 'upgrade',
    title: t('tellor.risk.securityEvents.stakingContractV2.title'),
    description: t('tellor.risk.securityEvents.stakingContractV2.description'),
    status: 'resolved',
  },
  {
    date: '2023-11-05',
    type: 'maintenance',
    title: t('tellor.risk.securityEvents.reporterNodeUpgrade.title'),
    description: t('tellor.risk.securityEvents.reporterNodeUpgrade.description'),
    status: 'resolved',
  },
];

const getTellorMitigationMeasures = (): MitigationMeasure[] => [
  {
    name: 'tellor.risk.mitigationMeasures.disputeMechanism',
    type: 'technical',
    status: 'active',
    effectiveness: 92,
  },
  {
    name: 'tellor.risk.mitigationMeasures.stakingSlashing',
    type: 'technical',
    status: 'active',
    effectiveness: 88,
  },
  {
    name: 'tellor.risk.mitigationMeasures.multiSourceData',
    type: 'technical',
    status: 'active',
    effectiveness: 85,
  },
  {
    name: 'tellor.risk.mitigationMeasures.decentralizedGovernance',
    type: 'governance',
    status: 'active',
    effectiveness: 82,
  },
  {
    name: 'tellor.risk.mitigationMeasures.reporterIncentives',
    type: 'operational',
    status: 'active',
    effectiveness: 90,
  },
  {
    name: 'tellor.risk.mitigationMeasures.transparencyReports',
    type: 'operational',
    status: 'active',
    effectiveness: 78,
  },
];

export function TellorRiskPanel({ data }: TellorRiskPanelProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const tellorSecurityEvents = getTellorSecurityEvents(t);
  const tellorMitigationMeasures = getTellorMitigationMeasures();

  const _getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-success-600 bg-success-50 border-green-200';
      case 'medium':
        return 'text-warning-600 bg-warning-50 border-yellow-200';
      case 'high':
        return 'text-danger-600 bg-danger-50 border-danger-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-danger-600';
  };

  const getProgressColor = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100;
    if (percentage <= 30) return 'bg-emerald-500';
    if (percentage <= 70) return 'bg-amber-500';
    return 'bg-danger-500';
  };

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        thresholdMinutes={5}
      />

      {/* Overall Risk Level */}
      <DashboardCard title={t('tellor.risk.overallLevel')}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mt-1">{t('tellor.risk.basedOnMetrics')}</p>
          </div>
          <div className="text-right">
            <span
              className={`text-3xl font-bold uppercase ${
                data.overallRiskLevel === 'low'
                  ? 'text-emerald-600'
                  : data.overallRiskLevel === 'medium'
                    ? 'text-amber-600'
                    : 'text-danger-600'
              }`}
            >
              {data.overallRiskLevel}
            </span>
            <p className="text-sm mt-1">{t('tellor.risk.riskLevelLabel')}</p>
          </div>
        </div>
      </DashboardCard>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title={t('tellor.risk.dataQualityScore')}>
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-3xl font-bold ${getScoreColor(data.dataQualityScore)}`}>
                {data.dataQualityScore.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            <div className="w-full bg-gray-100 h-2">
              <div
                className={`h-2 transition-all duration-500 ${getProgressColor(data.dataQualityScore)}`}
                style={{ width: `${data.dataQualityScore}%` }}
              />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.risk.priceDeviation')}>
          <div className="py-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('tellor.risk.current')}</span>
              <span className="text-sm font-medium">{data.priceDeviation.current.toFixed(4)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('tellor.risk.avg24h')}</span>
              <span className="text-sm font-medium">{data.priceDeviation.avg24h.toFixed(4)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('tellor.risk.max24h')}</span>
              <span className="text-sm font-medium text-amber-600">
                {data.priceDeviation.max24h.toFixed(4)}%
              </span>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.risk.riskTrend')}>
          <div className="py-4">
            <div className="h-24 flex items-end gap-1">
              {data.riskTrend.slice(-12).map((point, index) => {
                const height = (point.score / 100) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-t transition-all duration-200 relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {point.score.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{t('tellor.risk.timeAgo', { hours: 12 })}</span>
              <span>{t('tellor.risk.now')}</span>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('tellor.risk.stakingRisk')}>
          <div className="py-4 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.concentrationRisk')}</span>
                <span className="text-sm font-medium">
                  {data.stakingRisk.concentrationRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2">
                <div
                  className={`h-2 transition-all duration-500 ${getProgressColor(data.stakingRisk.concentrationRisk)}`}
                  style={{ width: `${data.stakingRisk.concentrationRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.slashRisk')}</span>
                <span className="text-sm font-medium text-emerald-600">
                  {data.stakingRisk.slashRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2">
                <div
                  className="bg-emerald-500 h-2 transition-all duration-500"
                  style={{ width: `${data.stakingRisk.slashRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.rewardStability')}</span>
                <span className="text-sm font-medium text-emerald-600">
                  {data.stakingRisk.rewardStability.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2">
                <div
                  className="bg-emerald-500 h-2 transition-all duration-500"
                  style={{ width: `${data.stakingRisk.rewardStability}%` }}
                />
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.risk.networkRisk')}>
          <div className="py-4 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.uptimeRisk')}</span>
                <span className="text-sm font-medium text-emerald-600">
                  {data.networkRisk.uptimeRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2">
                <div
                  className="bg-emerald-500 h-2 transition-all duration-500"
                  style={{ width: `${data.networkRisk.uptimeRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.latencyRisk')}</span>
                <span className="text-sm font-medium">
                  {data.networkRisk.latencyRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2">
                <div
                  className={`h-2 transition-all duration-500 ${getProgressColor(data.networkRisk.latencyRisk)}`}
                  style={{ width: `${data.networkRisk.latencyRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {t('tellor.risk.updateFrequencyRisk')}
                </span>
                <span className="text-sm font-medium text-emerald-600">
                  {data.networkRisk.updateFrequencyRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2">
                <div
                  className="bg-emerald-500 h-2 transition-all duration-500"
                  style={{ width: `${data.networkRisk.updateFrequencyRisk}%` }}
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Security Timeline */}
      <SecurityTimeline events={tellorSecurityEvents} />

      {/* Mitigation Measures Grid */}
      <MitigationMeasuresGrid measures={tellorMitigationMeasures} />

      {/* Alerts */}
      <DashboardCard title={t('tellor.risk.alerts')}>
        <div className="py-2 space-y-2">
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 ${
                alert.type === 'critical'
                  ? 'bg-danger-50 border border-danger-200'
                  : alert.type === 'warning'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-primary-50 border border-primary-200'
              }`}
            >
              <div
                className={`w-2 h-2 mt-2 flex-shrink-0 ${
                  alert.type === 'critical'
                    ? 'bg-danger-500'
                    : alert.type === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-primary-500'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 uppercase ${
                  alert.type === 'critical'
                    ? 'bg-danger-100 text-danger-700'
                    : alert.type === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary-100 text-primary-700'
                }`}
              >
                {alert.type}
              </span>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
