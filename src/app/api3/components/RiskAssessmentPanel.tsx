'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';

// 风险等级类型
type RiskLevel = 'low' | 'medium' | 'high';

// 模拟风险数据
const riskData = {
  overallRisk: 'low' as RiskLevel,
  scores: {
    firstPartyRisk: { score: 75, level: 'medium' as RiskLevel },
    smartContractRisk: { score: 88, level: 'low' as RiskLevel },
    stakingRisk: { score: 82, level: 'low' as RiskLevel },
    governanceRisk: { score: 90, level: 'low' as RiskLevel },
  },
  mitigations: [
    { name: 'Coverage Pool', status: 'active', type: 'technical' },
    { name: 'Decentralized Governance', status: 'active', type: 'governance' },
    { name: 'Multi-source Aggregation', status: 'active', type: 'technical' },
    { name: 'Regular Audits', status: 'active', type: 'operational' },
    { name: 'Bug Bounty Program', status: 'active', type: 'operational' },
    { name: 'Emergency Pause', status: 'standby', type: 'technical' },
  ],
  recentEvents: [
    { date: '2024-01-15', type: 'upgrade', description: 'Smart contract upgrade v2.1', status: 'completed' },
    { date: '2024-01-10', type: 'audit', description: 'Security audit by Trail of Bits', status: 'completed' },
    { date: '2024-01-05', type: 'governance', description: 'DAO proposal #42 passed', status: 'completed' },
  ],
};

// 风险等级配置
const riskConfig = {
  low: {
    label: 'Low Risk',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    progressColor: 'bg-green-500',
  },
  medium: {
    label: 'Medium Risk',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
    progressColor: 'bg-yellow-500',
  },
  high: {
    label: 'High Risk',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    progressColor: 'bg-red-500',
  },
};

export function RiskAssessmentPanel() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('api3.loading')}</span>
        </div>
      </div>
    );
  }

  const overallConfig = riskConfig[riskData.overallRisk];

  return (
    <div className="space-y-6">
      {/* 总体风险评估 */}
      <div className={`bg-white border ${overallConfig.borderColor} rounded-xl p-6`}>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className={`p-4 rounded-xl ${overallConfig.bgColor}`}>
            <svg className={`w-12 h-12 ${overallConfig.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('api3.risk.overallAssessment')}</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${overallConfig.bgColor} ${overallConfig.color}`}>
                {t(`api3.risk.${riskData.overallRisk}Risk`)}
              </span>
              <span className="text-sm text-gray-500">{t('api3.risk.lastUpdated')}: {t('api3.justNow')}</span>
            </div>
            <p className="text-sm text-gray-600">{t('api3.risk.overallDescription')}</p>
          </div>
        </div>
      </div>

      {/* 风险评分详情 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(riskData.scores).map(([key, data]) => {
          const config = riskConfig[data.level];
          return (
            <div key={key} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{t(`api3.risk.${key}`)}</h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                  {t(`api3.risk.${data.level}Risk`)}
                </span>
              </div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-gray-600 bg-gray-200">
                      {t('api3.risk.score')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-gray-600">
                      {data.score}/100
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${data.score}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${config.progressColor}`}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">{t(`api3.risk.${key}Description`)}</p>
            </div>
          );
        })}
      </div>

      {/* 风险缓解措施 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4">{t('api3.risk.mitigationMeasures')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {riskData.mitigations.map((measure, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${measure.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{measure.name}</p>
                <p className="text-xs text-gray-500 capitalize">{measure.type}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${measure.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {measure.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 近期安全事件 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-4">{t('api3.risk.recentEvents')}</h3>
        <div className="space-y-3">
          {riskData.recentEvents.map((event, index) => (
            <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  event.type === 'upgrade' ? 'bg-blue-100 text-blue-600' :
                  event.type === 'audit' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {event.type === 'upgrade' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {event.type === 'audit' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {event.type === 'governance' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{event.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{event.date}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                    {event.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 风险提示 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-medium text-yellow-800">{t('api3.risk.disclaimer')}</h4>
            <p className="text-sm text-yellow-700 mt-1">{t('api3.risk.disclaimerText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
