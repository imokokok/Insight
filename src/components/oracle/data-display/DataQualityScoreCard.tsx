'use client';

import { type ReactNode } from 'react';

import { Shield, FileText, Zap, Users } from 'lucide-react';

import { useTranslations } from '@/i18n';

import ScoreCard, { type ScoreTrend } from './ScoreCard';

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

interface QualityMetricCardProps {
  title: string;
  score: number;
  trend: ScoreTrend;
  icon: ReactNode;
  t: (key: string) => string;
}

function QualityMetricCard({ title, score, trend, icon, t }: QualityMetricCardProps) {
  const getTrendValue = () => {
    if (trend === 'up') return t('dataQualityScoreCard.improving');
    if (trend === 'down') return t('dataQualityScoreCard.declining');
    return t('dataQualityScoreCard.stable');
  };

  return (
    <ScoreCard
      title={title}
      score={score}
      trend={trend}
      trendValue={getTrendValue()}
      icon={icon}
      showMaxScore={false}
    />
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
          <ScoreCard
            title={t('dataQualityScoreCard.networkHealth')}
            score={data.networkHealth.score}
            trend={data.networkHealth.trend}
            variant="compact"
          />
          <ScoreCard
            title={t('dataQualityScoreCard.dataIntegrity')}
            score={data.dataIntegrity.score}
            trend={data.dataIntegrity.trend}
            variant="compact"
          />
          <ScoreCard
            title={t('dataQualityScoreCard.responseTime')}
            score={data.responseTime.score}
            trend={data.responseTime.trend}
            variant="compact"
          />
          <ScoreCard
            title={t('dataQualityScoreCard.validatorActivity')}
            score={data.validatorActivity.score}
            trend={data.validatorActivity.trend}
            variant="compact"
          />
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
        <QualityMetricCard
          title={t('dataQualityScoreCard.networkHealth')}
          score={data.networkHealth.score}
          trend={data.networkHealth.trend}
          t={t}
          icon={<Shield className="w-6 h-6 text-success-600" />}
        />

        <QualityMetricCard
          title={t('dataQualityScoreCard.dataIntegrity')}
          score={data.dataIntegrity.score}
          trend={data.dataIntegrity.trend}
          t={t}
          icon={<FileText className="w-6 h-6 text-primary-600" />}
        />

        <QualityMetricCard
          title={t('dataQualityScoreCard.responseTime')}
          score={data.responseTime.score}
          trend={data.responseTime.trend}
          t={t}
          icon={<Zap className="w-6 h-6 text-purple-600" />}
        />

        <QualityMetricCard
          title={t('dataQualityScoreCard.validatorActivity')}
          score={data.validatorActivity.score}
          trend={data.validatorActivity.trend}
          t={t}
          icon={<Users className="w-6 h-6 text-warning-600" />}
        />
      </div>
    </div>
  );
}
