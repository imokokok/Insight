'use client';

import { useTranslations } from 'next-intl';

const riskMetrics = [
  {
    id: 'decentralization',
    name: 'Decentralization Score',
    value: 95,
    max: 100,
    description: 'Based on node operator diversity and geographic distribution',
    status: 'low',
  },
  {
    id: 'security',
    name: 'Security Rating',
    value: 98,
    max: 100,
    description: 'Based on audit history, bug bounty programs, and incident response',
    status: 'low',
  },
  {
    id: 'reliability',
    name: 'Network Reliability',
    value: 99.9,
    max: 100,
    description: 'Uptime and successful response rate over the last 30 days',
    status: 'low',
  },
  {
    id: 'transparency',
    name: 'Transparency Score',
    value: 92,
    max: 100,
    description: 'Based on documentation quality and open-source availability',
    status: 'low',
  },
];

const riskFactors = [
  {
    category: 'Smart Contract Risk',
    level: 'low',
    description: 'Multiple audits by leading security firms',
  },
  {
    category: 'Oracle Risk',
    level: 'low',
    description: 'Decentralized node network with reputation system',
  },
  {
    category: 'Market Risk',
    level: 'medium',
    description: 'LINK token price volatility affects staking economics',
  },
  {
    category: 'Regulatory Risk',
    level: 'medium',
    description: 'Potential regulatory changes in DeFi sector',
  },
];

export function ChainlinkRiskView() {
  const t = useTranslations();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {riskMetrics.map((metric) => (
          <div key={metric.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">{metric.name}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(metric.status)}`}>
                {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)} Risk
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">{metric.value}</span>
              <span className="text-sm text-gray-500">/ {metric.max}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(metric.value / metric.max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chainlink.risk.factors')}
        </h3>
        <div className="space-y-3">
          {riskFactors.map((factor, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{factor.category}</p>
                <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(factor.level)}`}>
                {factor.level.charAt(0).toUpperCase() + factor.level.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900">{t('chainlink.risk.disclaimer')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('chainlink.risk.disclaimerText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
