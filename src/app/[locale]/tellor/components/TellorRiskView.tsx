'use client';

import { useTranslations } from 'next-intl';
import { TellorRiskViewProps } from '../types';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

export function TellorRiskView({ isLoading }: TellorRiskViewProps) {
  const t = useTranslations();

  const riskMetrics = [
    {
      category: t('tellor.risk.smartContract'),
      score: 85,
      level: 'low',
      description: t('tellor.risk.smartContractDesc'),
    },
    {
      category: t('tellor.risk.oracleRisk'),
      score: 78,
      level: 'low',
      description: t('tellor.risk.oracleRiskDesc'),
    },
    {
      category: t('tellor.risk.centralization'),
      score: 72,
      level: 'medium',
      description: t('tellor.risk.centralizationDesc'),
    },
    {
      category: t('tellor.risk.liquidity'),
      score: 80,
      level: 'low',
      description: t('tellor.risk.liquidityDesc'),
    },
  ];

  const overallScore = 79;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getLevelColor = (level: string) => {
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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'high':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Overall Risk Score */}
      <div className="flex items-center justify-between py-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('tellor.risk.overallScore')}
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            {t('tellor.risk.overallDescription')}
          </p>
        </div>
        <div className="text-center">
          <div
            className={`text-5xl font-bold ${getScoreColor(overallScore)}`}
          >
            {overallScore}
          </div>
          <div className="text-sm text-gray-500 mt-1">{t('tellor.risk.outOf100')}</div>
        </div>
      </div>

      {/* Risk Categories */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellor.risk.categories') || 'Risk Categories'}
        </h3>
        <div className="space-y-4">
          {riskMetrics.map((metric, index) => (
            <div
              key={index}
              className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0"
            >
              <div className={`p-2 rounded-lg border ${getLevelColor(metric.level)}`}>
                {getLevelIcon(metric.level)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {metric.category}
                  </h4>
                  <span className={`text-sm font-bold ${getScoreColor(metric.score)}`}>
                    {metric.score}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {metric.description}
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getScoreBg(metric.score)}`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* Risk Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('tellor.risk.strengths')}
            </h3>
          </div>
          <ul className="space-y-3">
            {[
              t('tellor.risk.strength1'),
              t('tellor.risk.strength2'),
              t('tellor.risk.strength3'),
              t('tellor.risk.strength4'),
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('tellor.risk.considerations')}
            </h3>
          </div>
          <ul className="space-y-3">
            {[
              t('tellor.risk.consideration1'),
              t('tellor.risk.consideration2'),
              t('tellor.risk.consideration3'),
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          {t('tellor.risk.disclaimer')}
        </p>
      </div>
    </div>
  );
}
