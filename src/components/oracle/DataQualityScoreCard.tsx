'use client';

import { useI18n } from '@/lib/i18n/provider';

export interface DataQualityScoreCardProps {
  completeness?: number | { successCount: number; totalCount: number };
  timeliness?: number;
  accuracy?: number;
  overallScore?: number;
  freshness?: { lastUpdated: Date };
  reliability?: { historicalAccuracy: number; responseSuccessRate: number };
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
      <div className="flex items-center gap-1 text-green-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
        <span className="text-xs">{t('uma.dataQuality.improving')}</span>
      </div>
    );
  }

  if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <span className="text-xs">{t('uma.dataQuality.declining')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
      <span className="text-xs">{t('uma.dataQuality.stable')}</span>
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
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</p>
        </div>
        <div className={`p-3 rounded-lg ${getScoreBgColor(score)}`}>{icon}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
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
}: DataQualityScoreCardProps) {
  const { t } = useI18n();

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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('uma.dataQuality.title')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('uma.dataQuality.subtitle')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('uma.dataQuality.overallScore')}
            </p>
            <p className="text-3xl font-bold text-blue-600">{data.overallScore.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title={t('uma.dataQuality.networkHealth')}
          score={data.networkHealth.score}
          trend={data.networkHealth.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
        />

        <ScoreCard
          title={t('uma.dataQuality.dataIntegrity')}
          score={data.dataIntegrity.score}
          trend={data.dataIntegrity.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />

        <ScoreCard
          title={t('uma.dataQuality.responseTime')}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          }
        />

        <ScoreCard
          title={t('uma.dataQuality.validatorActivity')}
          score={data.validatorActivity.score}
          trend={data.validatorActivity.trend}
          t={t}
          icon={
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
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
