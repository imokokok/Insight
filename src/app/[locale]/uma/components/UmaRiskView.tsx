'use client';

import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type UmaRiskViewProps } from '../types';

export function UmaRiskView({ networkStats, disputes }: UmaRiskViewProps) {
  const t = useTranslations();

  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
  const avgResolutionTime =
    resolvedDisputes.length > 0 && resolvedDisputes.some((d) => d.resolutionTime)
      ? resolvedDisputes.reduce((sum, d) => sum + (d.resolutionTime || 0), 0) /
        resolvedDisputes.filter((d) => d.resolutionTime).length
      : 0;

  const riskScore = 85;

  const riskMetrics = [
    {
      label: t('uma.risk.disputeSuccessRate'),
      value: `${networkStats?.disputeSuccessRate ?? 78}%`,
      status: 'low' as const,
    },
    {
      label: t('uma.risk.avgResolutionTime'),
      value: `${avgResolutionTime.toFixed(1)}h`,
      status: 'medium' as const,
    },
    {
      label: t('uma.risk.validatorUptime'),
      value: `${networkStats?.validatorUptime ?? 99.5}%`,
      status: 'low' as const,
    },
    {
      label: t('uma.risk.activeDisputes'),
      value: (networkStats?.activeDisputes ?? 23).toString(),
      status: 'low' as const,
    },
  ];

  const riskFactors = [
    {
      title: t('uma.risk.decentralization'),
      description: t('uma.risk.decentralizationDesc'),
      status: 'low' as const,
    },
    {
      title: t('uma.risk.economicSecurity'),
      description: t('uma.risk.economicSecurityDesc', { amount: '$25M' }),
      status: 'low' as const,
    },
    {
      title: t('uma.risk.disputeResolution'),
      description: t('uma.risk.disputeResolutionRiskDesc'),
      status: 'medium' as const,
    },
    {
      title: t('uma.risk.smartContract'),
      description: t('uma.risk.smartContractDesc'),
      status: 'low' as const,
    },
  ];

  const mitigationMeasures = [
    t('uma.risk.multiLayerValidation'),
    t('uma.risk.economicIncentives'),
    t('uma.risk.timelyResolution'),
    t('uma.risk.transparentProcess'),
  ];

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'bg-emerald-500';
      case 'medium':
        return 'bg-amber-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusTextColor = (status: string) => {
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t('uma.risk.lowRisk');
    if (score >= 60) return t('uma.risk.mediumRisk');
    return t('uma.risk.highRisk');
  };

  // Calculate SVG circle properties
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${riskScore}, 100`;

  return (
    <div className="space-y-8">
      {/* Risk Score - Top Section with Donut Chart */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 relative flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className={getScoreColor(riskScore)}
              strokeDasharray={strokeDasharray}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{riskScore}</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">{t('uma.risk.overallScore')}</span>
          </div>
          <p className={`text-sm font-semibold mt-1 ${getScoreColor(riskScore)}`}>
            {getScoreLabel(riskScore)}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">{t('uma.risk.scoreDescription')}</p>
        </div>
      </div>

      {/* Risk Metrics - Clean 2-Column Layout */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{t('uma.risk.overview')}</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {riskMetrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                <div className={`w-2 h-2 rounded-full ${getStatusDotColor(metric.status)}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factors - List with Color Dots */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{t('uma.risk.factors')}</h3>
        </div>
        <div className="space-y-3">
          {riskFactors.map((factor, index) => (
            <div key={index} className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getStatusDotColor(factor.status)}`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{factor.title}</span>
                  <span className={`text-xs ${getStatusTextColor(factor.status)}`}>
                    {factor.status === 'low'
                      ? t('uma.risk.statusLow')
                      : factor.status === 'medium'
                        ? t('uma.risk.statusMedium')
                        : t('uma.risk.statusHigh')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{factor.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Mitigation - Inline Layout */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{t('uma.risk.mitigation')}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {mitigationMeasures.map((measure, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-200"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{measure}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
