'use client';

import { useTranslations } from '@/i18n';
import { WinklinkRiskViewProps } from '../types';
import { Shield, CheckCircle } from 'lucide-react';

export function WinklinkRiskView({ riskMetrics, isLoading }: WinklinkRiskViewProps) {
  const t = useTranslations();

  const riskData = riskMetrics || {
    overallRisk: 2.5,
    decentralization: 85,
    dataQuality: 92,
    uptime: 99.92,
    staleness: 0.5,
    deviation: 0.1,
    lastUpdate: Date.now(),
  };

  const riskFactors = [
    {
      name: t('winklink.risk.decentralization'),
      score: riskData.decentralization,
      description: 'Node distribution and network decentralization',
      status: riskData.decentralization >= 80 ? 'low' : riskData.decentralization >= 60 ? 'medium' : 'high',
    },
    {
      name: t('winklink.risk.dataQuality'),
      score: riskData.dataQuality,
      description: 'Accuracy and reliability of oracle data',
      status: riskData.dataQuality >= 90 ? 'low' : riskData.dataQuality >= 70 ? 'medium' : 'high',
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
  ];

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

  const overallRiskStatus = riskData.overallRisk <= 3 ? 'low' : riskData.overallRisk <= 6 ? 'medium' : 'high';

  return (
    <div className="space-y-8">
      {/* Risk Metrics */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('winklink.risk.overallRisk')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('winklink.risk.metricsDesc') || 'Key performance indicators across decentralization, security, and reliability'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-md">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('winklink.risk.overallScore') || 'Overall'}: {(10 - riskData.overallRisk).toFixed(1)}/10
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {riskFactors.map((factor) => (
            <div key={factor.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{factor.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getRiskBgColor(factor.status)} ${getRiskTextColor(factor.status)}`}>
                  {factor.status}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{factor.score.toFixed(1)}</span>
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

      {/* Separator */}
      <div className="border-t border-gray-200" />

      {/* Risk Trend & Mitigation */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Risk Trend */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {t('winklink.risk.riskTrend')}
            </h3>
            <div className="h-48 flex items-end gap-2">
              {[3.2, 3.0, 2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.5, 2.5, 2.5, 2.5].map((value, index) => {
                const max = 5;
                const height = (value / max) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-gray-100 hover:bg-pink-200 transition-colors rounded-t relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>12 months ago</span>
              <span>6 months ago</span>
              <span>Now</span>
            </div>
          </div>

          {/* Mitigation Measures */}
          <div>
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
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="border-t border-gray-200" />

      {/* Last Updated */}
      <section className="flex items-center justify-between py-2">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(riskData.lastUpdate).toLocaleString()}
        </p>
        <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${getRiskBgColor(overallRiskStatus)} ${getRiskTextColor(overallRiskStatus)}`}>
          {overallRiskStatus.charAt(0).toUpperCase() + overallRiskStatus.slice(1)} Risk
        </span>
      </section>
    </div>
  );
}
