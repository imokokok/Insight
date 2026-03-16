'use client';

import { useState } from 'react';
import { RiskMetrics } from '@/lib/oracles/tellor';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle';
import {
  DataFreshnessIndicator,
  SecurityTimeline,
  MitigationMeasuresGrid,
} from '@/components/oracle/common';
import type { RiskEvent, MitigationMeasure } from '@/types/risk';

interface TellorRiskPanelProps {
  data: RiskMetrics;
}

const tellorSecurityEvents: RiskEvent[] = [
  {
    date: '2024-02-15',
    type: 'upgrade',
    title: 'Tellor Layer Launch',
    description: 'Migration to dedicated Tellor Layer blockchain for improved scalability',
    status: 'resolved',
  },
  {
    date: '2024-01-20',
    type: 'response',
    title: 'Dispute Resolution Optimization',
    description: 'Enhanced dispute mechanism with faster resolution times',
    status: 'resolved',
  },
  {
    date: '2023-12-10',
    type: 'upgrade',
    title: 'Staking Contract V2',
    description: 'Upgraded staking contracts with improved reward distribution',
    status: 'resolved',
  },
  {
    date: '2023-11-05',
    type: 'maintenance',
    title: 'Reporter Node Upgrade',
    description: 'Routine maintenance for reporter node infrastructure',
    status: 'resolved',
  },
];

const tellorMitigationMeasures: MitigationMeasure[] = [
  { name: 'Dispute Mechanism', type: 'technical', status: 'active', effectiveness: 92 },
  { name: 'Staking Slashing', type: 'technical', status: 'active', effectiveness: 88 },
  { name: 'Multi-Source Data', type: 'technical', status: 'active', effectiveness: 85 },
  { name: 'Decentralized Governance', type: 'governance', status: 'active', effectiveness: 82 },
  { name: 'Reporter Incentives', type: 'operational', status: 'active', effectiveness: 90 },
  { name: 'Transparency Reports', type: 'operational', status: 'active', effectiveness: 78 },
];

export function TellorRiskPanel({ data }: TellorRiskPanelProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number, max: number = 100) => {
    const percentage = (value / max) * 100;
    if (percentage <= 30) return 'bg-green-500';
    if (percentage <= 70) return 'bg-yellow-500';
    return 'bg-red-500';
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
      <div className={`p-6 rounded-lg border-2 ${getRiskLevelColor(data.overallRiskLevel)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('tellor.risk.overallLevel')}</h3>
            <p className="text-sm opacity-80 mt-1">{t('tellor.risk.basedOnMetrics')}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold uppercase">{data.overallRiskLevel}</span>
            <p className="text-sm mt-1">Risk Level</p>
          </div>
        </div>
      </div>

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
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(data.dataQualityScore)}`}
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
              <span className="text-sm font-medium text-yellow-600">
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
              <span>12h ago</span>
              <span>Now</span>
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
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(data.stakingRisk.concentrationRisk)}`}
                  style={{ width: `${data.stakingRisk.concentrationRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.slashRisk')}</span>
                <span className="text-sm font-medium text-green-600">
                  {data.stakingRisk.slashRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.stakingRisk.slashRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">{t('tellor.risk.rewardStability')}</span>
                <span className="text-sm font-medium text-green-600">
                  {data.stakingRisk.rewardStability.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
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
                <span className="text-sm font-medium text-green-600">
                  {data.networkRisk.uptimeRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
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
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(data.networkRisk.latencyRisk)}`}
                  style={{ width: `${data.networkRisk.latencyRisk}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {t('tellor.risk.updateFrequencyRisk')}
                </span>
                <span className="text-sm font-medium text-green-600">
                  {data.networkRisk.updateFrequencyRisk.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
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
              className={`flex items-start gap-3 p-3 rounded-lg ${
                alert.type === 'critical'
                  ? 'bg-red-50 border border-red-200'
                  : alert.type === 'warning'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  alert.type === 'critical'
                    ? 'bg-red-500'
                    : alert.type === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.timestamp).toLocaleString('zh-CN')}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full uppercase ${
                  alert.type === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : alert.type === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
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
