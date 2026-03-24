'use client';

import { useTranslations } from 'next-intl';
import { UmaRiskViewProps } from '../types';

export function UmaRiskView({ networkStats, disputes, isLoading }: UmaRiskViewProps) {
  const t = useTranslations();

  const resolvedDisputes = disputes.filter(d => d.status === 'resolved');
  const avgResolutionTime = resolvedDisputes.length > 0 && resolvedDisputes.some(d => d.resolutionTime)
    ? resolvedDisputes.reduce((sum, d) => sum + (d.resolutionTime || 0), 0) / resolvedDisputes.filter(d => d.resolutionTime).length
    : 0;

  const riskMetrics = [
    {
      label: t('uma.risk.disputeSuccessRate'),
      value: `${networkStats?.disputeSuccessRate ?? 78}%`,
      status: 'low' as const,
      description: t('uma.risk.disputeSuccessRateDesc'),
    },
    {
      label: t('uma.risk.avgResolutionTime'),
      value: `${avgResolutionTime.toFixed(1)}h`,
      status: 'medium' as const,
      description: t('uma.risk.avgResolutionTimeDesc'),
    },
    {
      label: t('uma.risk.validatorUptime'),
      value: `${networkStats?.validatorUptime ?? 99.5}%`,
      status: 'low' as const,
      description: t('uma.risk.validatorUptimeDesc'),
    },
    {
      label: t('uma.risk.activeDisputes'),
      value: (networkStats?.activeDisputes ?? 23).toString(),
      status: 'low' as const,
      description: t('uma.risk.activeDisputesDesc'),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Risk Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.risk.overview')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskMetrics.map((metric, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-lg font-bold">{metric.value}</span>
              </div>
              <p className="text-xs opacity-80">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.risk.factors')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.risk.decentralization')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.risk.decentralizationDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.risk.economicSecurity')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.risk.economicSecurityDesc', { amount: '$25M' })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.risk.disputeResolution')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.risk.disputeResolutionRiskDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.risk.smartContract')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.risk.smartContractDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Mitigation */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.risk.mitigation')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t('uma.risk.multiLayerValidation')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('uma.risk.multiLayerValidationDesc')}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t('uma.risk.economicIncentives')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('uma.risk.economicIncentivesDesc')}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t('uma.risk.timelyResolution')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('uma.risk.timelyResolutionDesc')}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t('uma.risk.transparentProcess')}
            </h4>
            <p className="text-xs text-gray-500">
              {t('uma.risk.transparentProcessDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.risk.overallScore')}
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-emerald-500"
                strokeDasharray="85, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">85</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t('uma.risk.lowRisk')}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-md">
              {t('uma.risk.scoreDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
