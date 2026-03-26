'use client';

import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';

import {
  type QualityScore,
  type QualityStatus,
  getStatusConfig,
  getStatusFromScore,
} from './qualityUtils';

interface QualityScoreCardProps {
  score: QualityScore;
}

export function QualityScoreCard({ score }: QualityScoreCardProps) {
  const t = useTranslations();
  const STATUS_CONFIG = getStatusConfig(t);

  const overallStatus: QualityStatus = getStatusFromScore(score.overall);
  const statusConfig = STATUS_CONFIG[overallStatus];

  const scoreItems = [
    {
      label: t('dataQuality.priceAccuracy'),
      value: score.priceAccuracy,
      color: chartColors.recharts.primary,
    },
    {
      label: t('dataQuality.latencyPerformance'),
      value: score.latency,
      color: chartColors.recharts.purple,
    },
    {
      label: t('dataQuality.reliability'),
      value: score.reliability,
      color: chartColors.semantic.success,
    },
  ];

  const getStrokeColor = () => {
    switch (overallStatus) {
      case 'excellent':
        return chartColors.semantic.success;
      case 'good':
        return chartColors.recharts.primary;
      case 'warning':
        return chartColors.semantic.warning;
      case 'critical':
        return chartColors.semantic.danger;
      default:
        return chartColors.recharts.tick;
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.compositeQualityScore')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dataQuality.comprehensiveDataAssessment')}
          </p>
        </div>
        <div className={`p-2 ${statusConfig.lightBg}`}>
          <svg
            className={`w-5 h-5 ${statusConfig.color}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={chartColors.recharts.grid}
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke={getStrokeColor()}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${score.overall * 3.52} 352`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-3xl font-bold ${statusConfig.color}`}>{score.overall}</p>
              <p className="text-xs text-gray-500">{t('dataQuality.totalScore')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {scoreItems.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{item.label}</span>
              <span className="text-sm font-semibold text-gray-900">{item.value}</span>
            </div>
            <div className="h-2 bg-gray-100 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
