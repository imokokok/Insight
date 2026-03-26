'use client';

import { useTranslations } from '@/i18n';

export interface DataQualityScoreCardProps {
  completeness?: number | { successCount: number; totalCount: number };
  timeliness?: number;
  accuracy?: number;
  overallScore?: number;
  freshness?: { lastUpdated: Date };
  reliability?: { historicalAccuracy: number; responseSuccessRate: number };
  compact?: boolean;
}

export interface FreshnessData {
  timestamp: number;
  age: number;
  isFresh: boolean;
}

export interface CompletenessData {
  total: number;
  available: number;
  percentage: number;
}

export interface ReliabilityData {
  uptime: number;
  errors: number;
  successRate: number;
}

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

function TrendIndicator({
  trend,
  t,
}: {
  trend: 'up' | 'down' | 'stable';
  t: (key: string) => string;
}) {
  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-success-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="text-xs">{t('dataQualityScoreCard.improving')}</span>
      </div>
    );
  }

  if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-danger-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="text-xs">{t('dataQualityScoreCard.declining')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
      <span className="text-xs">{t('dataQualityScoreCard.stable')}</span>
    </div>
  );
}

function ScoreCard({
  title,
  score,
  trend,
  icon,
  t,
}: {
  title: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  t: (key: string) => string;
}) {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-success-600';
    if (score >= 70) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-success-50';
    if (score >= 70) return 'bg-warning-50';
    return 'bg-danger-50';
  };

  return (
    <div className="bg-white border border-gray-200  p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</p>
        </div>
        <div className={`p-3  ${getScoreBgColor(score)}`}>{icon}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 h-2 bg-gray-200  overflow-hidden">
          <div
            className={`h-full  transition-all duration-500 ${
              score >= 90 ? 'bg-success-500' : score >= 70 ? 'bg-warning-500' : 'bg-danger-500'
            }`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      </div>
      <div className="mt-3">
        <TrendIndicator trend={trend} t={t} />
      </div>
    </div>
  );
}

export function DataQualityScoreCard({
  completeness = 85,
  timeliness = 90,
  accuracy = 88,
  overallScore,
  freshness,
  reliability,
  compact = false,
}: DataQualityScoreCardProps) {
  const t = useTranslations();

  const completenessValue =
    typeof completeness === 'number'
      ? completeness
      : completeness && 'successCount' in completeness
        ? (completeness.successCount / completeness.totalCount) * 100
        : 85;

  const accuracyValue =
    typeof accuracy === 'number' ? accuracy : (reliability?.historicalAccuracy ?? 88);

  const timelinessValue =
    typeof timeliness === 'number' ? timeliness : (reliability?.responseSuccessRate ?? 90);

  const calculatedOverallScore =
    overallScore ?? completenessValue * 0.35 + timelinessValue * 0.3 + accuracyValue * 0.35;

  const data = {
    overallScore: calculatedOverallScore,
    networkHealth: { score: completenessValue, trend: 'stable' as const },
    dataIntegrity: { score: accuracyValue, trend: 'up' as const },
    responseTime: { score: timelinessValue, trend: 'stable' as const },
    validatorActivity: { score: 92, trend: 'up' as const },
  };

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t('dataQualityScoreCard.title')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('dataQualityScoreCard.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              {t('dataQualityScoreCard.overallScore')}
            </p>
            <p className="text-xl font-bold text-primary-600">{data.overallScore.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {t('dataQualityScoreCard.networkHealth')}
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.networkHealth.score.toFixed(1)}
            </p>
            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  data.networkHealth.score >= 90
                    ? 'bg-success-500'
                    : data.networkHealth.score >= 70
                      ? 'bg-warning-500'
                      : 'bg-danger-500'
                }`}
                style={{ width: `${Math.min(100, data.networkHealth.score)}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {t('dataQualityScoreCard.dataIntegrity')}
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.dataIntegrity.score.toFixed(1)}
            </p>
            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  data.dataIntegrity.score >= 90
                    ? 'bg-success-500'
                    : data.dataIntegrity.score >= 70
                      ? 'bg-warning-500'
                      : 'bg-danger-500'
                }`}
                style={{ width: `${Math.min(100, data.dataIntegrity.score)}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {t('dataQualityScoreCard.responseTime')}
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.responseTime.score.toFixed(1)}
            </p>
            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  data.responseTime.score >= 90
                    ? 'bg-success-500'
                    : data.responseTime.score >= 70
                      ? 'bg-warning-500'
                      : 'bg-danger-500'
                }`}
                style={{ width: `${Math.min(100, data.responseTime.score)}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded p-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {t('dataQualityScoreCard.validatorActivity')}
            </p>
            <p className="text-base font-bold text-gray-900">
              {data.validatorActivity.score.toFixed(1)}
            </p>
            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  data.validatorActivity.score >= 90
                    ? 'bg-success-500'
                    : data.validatorActivity.score >= 70
                      ? 'bg-warning-500'
                      : 'bg-danger-500'
                }`}
                style={{ width: `${Math.min(100, data.validatorActivity.score)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('dataQualityScoreCard.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('dataQualityScoreCard.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('dataQualityScoreCard.overallScore')}
            </p>
            <p className="text-3xl font-bold text-primary-600">{data.overallScore.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title={t('dataQualityScoreCard.networkHealth')}
          score={data.networkHealth.score}
          trend={data.networkHealth.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
        />

        <ScoreCard
          title={t('dataQualityScoreCard.dataIntegrity')}
          score={data.dataIntegrity.score}
          trend={data.dataIntegrity.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />

        <ScoreCard
          title={t('dataQualityScoreCard.responseTime')}
          score={data.responseTime.score}
          trend={data.responseTime.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <ScoreCard
          title={t('dataQualityScoreCard.validatorActivity')}
          score={data.validatorActivity.score}
          trend={data.validatorActivity.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-warning-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
      </div>
    </div>
  );
}
