'use client';

import { useState, useEffect } from 'react';
import { UMAClient, DataQualityScore } from '@/lib/oracles/uma';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';
import { UMAScoreExplanationModal } from './UMAScoreExplanationModal';
import { chartColors, semanticColors } from '@/lib/config/colors';

const logger = createLogger('UMADataQualityScoreCard');

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const t = useTranslations();

  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-success-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        <span className="text-xs">{t('uma.dataQuality.improving')}</span>
      </div>
    );
  }

  if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-danger-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <span className="text-xs">{t('uma.dataQuality.declining')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
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
  weight,
  color,
}: {
  title: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  weight: number;
  color: string;
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
    <div className="bg-white border border-gray-200 p-5 hover:border-gray-300 transition-colors duration-200 rounded-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider">{title}</p>
            <span
              className="px-1.5 py-0.5 text-[10px] font-mono rounded"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {(weight * 100).toFixed(0)}%
            </span>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</p>
        </div>
        <div className={`p-3 rounded-lg ${getScoreBgColor(score)}`}>{icon}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 h-2 bg-gray-200 overflow-hidden rounded-full">
          <div
            className={`h-full  transition-all duration-500 ${
              score >= 90 ? 'bg-success-500' : score >= 70 ? 'bg-warning-500' : 'bg-danger-500'
            }`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      </div>
      <div className="mt-3">
        <TrendIndicator trend={trend} />
      </div>
    </div>
  );
}

export function UMADataQualityScoreCard() {
  const t = useTranslations();
  const [data, setData] = useState<DataQualityScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new UMAClient();
        const scoreData = await client.getDataQualityScore();
        setData(scoreData);
      } catch (error) {
        logger.error(
          'Failed to fetch data quality score',
          error instanceof Error ? error : new Error(String(error))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
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
              <p className="text-3xl font-bold text-primary-600">{data.overallScore.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            title={t('uma.dataQuality.networkHealth')}
            score={data.networkHealth.score}
            trend={data.networkHealth.trend}
            weight={0.3}
            color={semanticColors.success.DEFAULT}
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
            title={t('uma.dataQuality.dataIntegrity')}
            score={data.dataIntegrity.score}
            trend={data.dataIntegrity.trend}
            weight={0.25}
            color={chartColors.recharts.primary}
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
            title={t('uma.dataQuality.responseTime')}
            score={data.responseTime.score}
            trend={data.responseTime.trend}
            weight={0.25}
            color={chartColors.recharts.purple}
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
            title={t('uma.dataQuality.validatorActivity')}
            score={data.validatorActivity.score}
            trend={data.validatorActivity.trend}
            weight={0.2}
            color={semanticColors.warning.DEFAULT}
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

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-success-500" />
                <span>{t('uma.dataQuality.excellent')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-warning-500" />
                <span>{t('uma.dataQuality.good')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-danger-500" />
                <span>{t('uma.dataQuality.needsImprovement')}</span>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {t('uma.dataQuality.viewDetails')}
            </button>
          </div>
        </div>
      </div>

      <UMAScoreExplanationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentScores={data}
      />
    </>
  );
}
