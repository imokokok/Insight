'use client';

import { useState } from 'react';

import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  Lightbulb,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type UmaRiskViewProps } from '../types';

export function UmaRiskView({ networkStats, disputes, isLoading = false }: UmaRiskViewProps) {
  const t = useTranslations();

  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
  const avgResolutionTime =
    resolvedDisputes.length > 0 && resolvedDisputes.some((d) => d.resolutionTime)
      ? resolvedDisputes.reduce((sum, d) => sum + (d.resolutionTime || 0), 0) /
        resolvedDisputes.filter((d) => d.resolutionTime).length
      : 0;

  const riskScore = networkStats?.disputeSuccessRate || 0;

  const riskMetrics = [
    {
      label: t('uma.risk.disputeSuccessRate'),
      value: networkStats?.disputeSuccessRate ? `${networkStats.disputeSuccessRate}%` : '-',
      status: 'low' as const,
    },
    {
      label: t('uma.risk.avgResolutionTime'),
      value: avgResolutionTime > 0 ? `${avgResolutionTime.toFixed(1)}h` : '-',
      status: 'medium' as const,
    },
    {
      label: t('uma.risk.validatorUptime'),
      value: networkStats?.validatorUptime ? `${networkStats.validatorUptime}%` : '-',
      status: 'low' as const,
    },
    {
      label: t('uma.risk.activeDisputes'),
      value: networkStats?.activeDisputes?.toString() || '-',
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

  const radius = 15.9155;
  const strokeDasharray = `${riskScore}, 100`;

  return (
    <div className="space-y-8">
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
