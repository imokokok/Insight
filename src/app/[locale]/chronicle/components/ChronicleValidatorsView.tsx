'use client';

import { useTranslations } from 'next-intl';
import { ChronicleValidatorsViewProps } from '../types';

export function ChronicleValidatorsView({
  validatorMetrics,
  isLoading,
}: ChronicleValidatorsViewProps) {
  const t = useTranslations();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'inactive':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'jailed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'jailed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getNetworkHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-emerald-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-amber-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const validators = validatorMetrics?.validators || [];

  return (
    <div className="space-y-4">
      {/* Validator Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.validators.total')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{validatorMetrics?.totalValidators ?? 6}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.validators.active')}</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{validatorMetrics?.activeValidators ?? 6}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.validators.avgReputation')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{validatorMetrics?.averageReputation ?? 94}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-500">{t('chronicle.validators.totalStaked')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {((validatorMetrics?.totalStaked || 21500000) / 1e6).toFixed(2)}M
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {t('chronicle.validators.networkHealth')}:{' '}
            <span className={`font-medium capitalize ${getNetworkHealthColor(validatorMetrics?.networkHealth || 'excellent')}`}>
              {validatorMetrics?.networkHealth || 'excellent'}
            </span>
          </p>
        </div>
      </div>

      {/* Validators List */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.validators.list')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.name')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.reputation')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.uptime')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.responseTime')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.staked')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('chronicle.validators.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div>
                      <p className="font-semibold text-gray-900">{validator.name}</p>
                      <p className="text-xs text-gray-500">{validator.address}</p>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${validator.reputationScore}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{validator.reputationScore}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900">{validator.uptime}%</td>
                  <td className="py-2 px-3 text-gray-900">{validator.responseTime}ms</td>
                  <td className="py-2 px-3 text-gray-900">
                    {(validator.stakedAmount / 1e6).toFixed(2)}M
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(validator.status)}
                      <span
                        className={`px-2 py-1 text-xs font-medium capitalize border rounded ${getStatusColor(validator.status)}`}
                      >
                        {t(`chronicle.status.${validator.status}`)}
                      </span>
                    </div>
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
