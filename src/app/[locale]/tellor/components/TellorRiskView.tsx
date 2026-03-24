'use client';

import { useTranslations } from 'next-intl';
import { TellorRiskViewProps } from '../types';

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
        return 'text-emerald-600 bg-emerald-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Risk Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('tellor.risk.overallScore')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('tellor.risk.overallDescription')}
            </p>
          </div>
          <div className="text-center">
            <div
              className={`text-4xl font-bold ${getScoreColor(overallScore)}`}
            >
              {overallScore}
            </div>
            <div className="text-sm text-gray-500">{t('tellor.risk.outOf100')}</div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(overallScore)} transition-all duration-500`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Risk Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {riskMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {metric.category}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {metric.description}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(
                  metric.level
                )}`}
              >
                {metric.level}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getScoreBg(metric.score)} transition-all duration-500`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
              <span
                className={`text-sm font-semibold ${getScoreColor(metric.score)}`}
              >
                {metric.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Factors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.risk.keyFactors')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
              {t('tellor.risk.strengths')}
            </h4>
            <ul className="space-y-2">
              {[
                t('tellor.risk.strength1'),
                t('tellor.risk.strength2'),
                t('tellor.risk.strength3'),
                t('tellor.risk.strength4'),
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-amber-600 uppercase tracking-wider">
              {t('tellor.risk.considerations')}
            </h4>
            <ul className="space-y-2">
              {[
                t('tellor.risk.consideration1'),
                t('tellor.risk.consideration2'),
                t('tellor.risk.consideration3'),
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-500">
          {t('tellor.risk.disclaimer')}
        </p>
      </div>
    </div>
  );
}
