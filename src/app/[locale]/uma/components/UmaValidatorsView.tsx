'use client';

import { useTranslations } from 'next-intl';
import { UmaValidatorsViewProps } from '../types';
import { ValidatorAnalyticsPanel } from '@/components/oracle';

export function UmaValidatorsView({ validators, networkStats, isLoading }: UmaValidatorsViewProps) {
  const t = useTranslations();

  const totalStaked = validators.reduce((sum, v) => sum + v.staked, 0);
  const totalEarnings = validators.reduce((sum, v) => sum + v.earnings, 0);
  const avgSuccessRate = validators.length > 0
    ? validators.reduce((sum, v) => sum + v.successRate, 0) / validators.length
    : 0;
  const avgResponseTime = validators.length > 0
    ? validators.reduce((sum, v) => sum + v.responseTime, 0) / validators.length
    : 0;

  const stats = [
    {
      label: t('uma.validators.totalValidators'),
      value: validators.length.toString(),
      change: '+3%',
      changeType: 'positive' as const,
    },
    {
      label: t('uma.validators.totalStaked'),
      value: `$${(totalStaked / 1e6).toFixed(2)}M`,
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      label: t('uma.validators.avgSuccessRate'),
      value: `${avgSuccessRate.toFixed(1)}%`,
      change: '+0.5%',
      changeType: 'positive' as const,
    },
    {
      label: t('uma.validators.avgResponseTime'),
      value: `${Math.round(avgResponseTime)}ms`,
      change: '-5%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className={`text-xs mt-1 ${
              stat.changeType === 'positive' ? 'text-emerald-600' : 
              stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {stat.changeType === 'positive' ? '↑ ' : 
               stat.changeType === 'negative' ? '↓ ' : '→ '}
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Validator Analytics Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ValidatorAnalyticsPanel />
      </div>

      {/* Validators Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.validators.validatorList')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.validators.name')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.validators.type')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.validators.staked')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.validators.successRate')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.validators.responseTime')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.validators.earnings')}
                </th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator) => (
                <tr key={validator.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{validator.name}</p>
                      <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">
                        {validator.address}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      validator.type === 'institution' ? 'bg-blue-100 text-blue-800' :
                      validator.type === 'community' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {validator.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    ${validator.staked.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    {validator.successRate}%
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    {validator.responseTime}ms
                  </td>
                  <td className="py-3 px-3 text-sm text-emerald-600 text-right">
                    ${validator.earnings.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
