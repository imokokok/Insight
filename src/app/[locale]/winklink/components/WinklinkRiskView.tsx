'use client';

import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type WinklinkRiskViewProps } from '../types';

export function WinklinkRiskView({ riskMetrics, isLoading }: WinklinkRiskViewProps) {
  const t = useTranslations();

  // 使用真实数据，如果没有则显示空状态
  const riskData = riskMetrics;

  // 空状态显示
  if (!riskData && !isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('winklink.risk.noData')}</h3>
          <p className="text-sm text-gray-500 max-w-md">{t('winklink.risk.noDataDescription')}</p>
        </div>
      </div>
    );
  }

  const riskFactors = riskData
    ? [
        {
          name: t('winklink.risk.decentralization'),
          score: riskData.decentralization,
          description: 'Node distribution and network decentralization',
          status:
            riskData.decentralization >= 80
              ? 'low'
              : riskData.decentralization >= 60
                ? 'medium'
                : 'high',
        },
        {
          name: t('winklink.risk.dataQuality'),
          score: riskData.dataQuality,
          description: 'Accuracy and reliability of oracle data',
          status:
            riskData.dataQuality >= 90 ? 'low' : riskData.dataQuality >= 70 ? 'medium' : 'high',
        },
        {
          name: t('winklink.risk.uptime'),
          score: riskData.uptime,
          description: 'Network availability and service continuity',
          status: riskData.uptime >= 99 ? 'low' : riskData.uptime >= 95 ? 'medium' : 'high',
        },
        {
          name: t('winklink.risk.staleness'),
          score: 100 - riskData.staleness * 10,
          description: 'Data freshness and update frequency',
          status: riskData.staleness <= 1 ? 'low' : riskData.staleness <= 5 ? 'medium' : 'high',
        },
        {
          name: t('winklink.risk.deviation'),
          score: 100 - riskData.deviation * 100,
          description: 'Price deviation from reference sources',
          status: riskData.deviation <= 0.5 ? 'low' : riskData.deviation <= 2 ? 'medium' : 'high',
        },
      ]
    : [];

  const getRiskColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-emerald-500';
      case 'medium':
        return 'bg-amber-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskTextColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'text-emerald-600';
      case 'medium':
        return 'text-amber-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskBgColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-emerald-50';
      case 'medium':
        return 'bg-amber-50';
      case 'high':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const overallRiskStatus = riskData
    ? riskData.overallRisk <= 3
      ? 'low'
      : riskData.overallRisk <= 6
        ? 'medium'
        : 'high'
    : 'low';

  return (
    <div className="space-y-8">
      {/* Risk Metrics */}
      {riskData && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('winklink.risk.overallRisk')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('winklink.risk.metricsDesc')}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {t('winklink.risk.overallScore')}: {(10 - riskData.overallRisk).toFixed(1)}/10
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {riskFactors.map((factor) => (
              <div key={factor.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{factor.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium ${getRiskBgColor(factor.status)} ${getRiskTextColor(factor.status)}`}
                  >
                    {factor.status}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {factor.score.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">/ 100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${getRiskColor(factor.status)}`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{factor.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Separator */}
      {riskData && <div className="border-t border-gray-200" />}

      {/* Mitigation Measures */}
      <section>
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          {t('winklink.risk.mitigationMeasures')}
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Multi-node consensus</h4>
              <p className="text-xs text-gray-500">Data validated by multiple independent nodes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Staking penalties</h4>
              <p className="text-xs text-gray-500">Nodes face penalties for incorrect data</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Regular audits</h4>
              <p className="text-xs text-gray-500">Continuous monitoring and security audits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Separator */}
      {riskData && <div className="border-t border-gray-200" />}

      {/* Last Updated */}
      {riskData && (
        <section className="flex items-center justify-between py-2">
          <p className="text-xs text-gray-500">
            Last updated: {new Date(riskData.lastUpdate).toLocaleString()}
          </p>
          <span
            className={`text-xs px-2.5 py-1 rounded-md font-medium ${getRiskBgColor(overallRiskStatus)} ${getRiskTextColor(overallRiskStatus)}`}
          >
            {overallRiskStatus.charAt(0).toUpperCase() + overallRiskStatus.slice(1)} Risk
          </span>
        </section>
      )}
    </div>
  );
}
