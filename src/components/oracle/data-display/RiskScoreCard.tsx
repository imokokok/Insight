'use client';

import { useTranslations } from '@/i18n';
import { getRiskLevel } from '@/lib/utils/riskUtils';

import { DashboardCard } from './DashboardCard';
import ScoreCard, { type ScoreTrend } from './ScoreCard';

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

  const mappedTrend: ScoreTrend | undefined = trend === 'neutral' ? 'stable' : trend;

  return (
    <DashboardCard title={title} className={className}>
      <ScoreCard
        title=""
        score={clampedScore}
        description={description}
        trend={mappedTrend}
        trendValue={trendValue}
        label={getRiskLevelLabel()}
        showProgress={true}
        showMaxScore={true}
        scoreFormatter={(s) => Math.round(s).toString()}
        className="border-0 p-0 bg-transparent hover:border-transparent"
      />
    </DashboardCard>
  );
}

export default RiskScoreCard;
