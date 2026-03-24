'use client';

import { useTranslations } from 'next-intl';
import { WinklinkRiskViewProps } from '../types';

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

  const overallRiskStatus = riskData.overallRisk <= 3 ? 'low' : riskData.overallRisk <= 6 ? 'medium' : 'high';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.risk.overallRisk')}
          </h3>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={overallRiskStatus === 'low' ? '#10b981' : overallRiskStatus === 'medium' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={`${(1 - riskData.overallRisk / 10) * 351.86} 351.86`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getRiskTextColor(overallRiskStatus)}`}>
                  {riskData.overallRisk.toFixed(1)}
                </span>
                <span className={`text-xs font-medium uppercase ${getRiskTextColor(overallRiskStatus)}`}>
                  {overallRiskStatus} Risk
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            Last updated: {new Date(riskData.lastUpdate).toLocaleString()}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.risk.riskFactors')}
          </h3>
          <div className="space-y-4">
            {riskFactors.map((factor) => (
              <div key={factor.name}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{factor.name}</span>
                    <p className="text-xs text-gray-500">{factor.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${getRiskTextColor(factor.status)}`}>
                      {factor.score.toFixed(1)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      factor.status === 'low' ? 'bg-emerald-100 text-emerald-700' :
                      factor.status === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {factor.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getRiskColor(factor.status)}`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
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

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('winklink.risk.mitigationMeasures')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Multi-node consensus</h4>
                <p className="text-xs text-gray-600">Data validated by multiple independent nodes</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Staking penalties</h4>
                <p className="text-xs text-gray-600">Nodes face penalties for incorrect data</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Regular audits</h4>
                <p className="text-xs text-gray-600">Continuous monitoring and security audits</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
