'use client';

import { useTranslations } from '@/i18n';
import { getScoreColor, getScoreBarColor, getRiskLevel } from '@/lib/utils/riskUtils';

import { DashboardCard } from './DashboardCard';

export interface RiskScoreCardProps {
  title: string;
  score: number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function RiskScoreCard({
  title,
  score,
  description,
  trend,
  trendValue,
  className = '',
}: RiskScoreCardProps) {
  const t = useTranslations();

  const clampedScore = Math.min(Math.max(score, 0), 100);
  const riskLevel = getRiskLevel(clampedScore);
  const scoreColor = getScoreColor(clampedScore);
  const barColor = getScoreBarColor(clampedScore);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success-600';
      case 'down':
        return 'text-danger-600';
      default:
        return 'text-gray-500';
    }
  };

  const getRiskLevelLabel = () => {
    switch (riskLevel) {
      case 'low':
        return t('oracleCommon.riskScore.levels.low');
      case 'medium':
        return t('oracleCommon.riskScore.levels.medium');
      case 'high':
        return t('oracleCommon.riskScore.levels.high');
    }
  };

  return (
    <DashboardCard title={title} className={className}>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <span className={`text-4xl font-bold ${scoreColor}`}>{clampedScore}</span>
            <span className="text-gray-400 text-lg">/100</span>
          </div>
          <div className="flex items-center gap-2">
            {trend && trendValue && (
              <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm font-medium">{trendValue}</span>
              </div>
            )}
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
              {getRiskLevelLabel()}
            </span>
          </div>
        </div>

        <div className="relative h-2 bg-gray-100 overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 ${barColor}`}
            style={{ width: `${clampedScore}%` }}
          />
        </div>

        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
    </DashboardCard>
  );
}

export default RiskScoreCard;
