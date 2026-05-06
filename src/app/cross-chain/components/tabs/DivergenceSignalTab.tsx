'use client';

import { DivergenceSignalTab, type FeedHealthScore } from '@/components/DivergenceSignalTab';

import { chainNames } from '../../constants';
import {
  type CrossChainDivergenceResult,
  type CrossChainFeedResult,
} from '../../hooks/useCrossChainAnalytics';

function getChainDisplayName(chainKey: string): string {
  return (
    (chainNames as Record<string, string>)[chainKey] ||
    chainKey.charAt(0).toUpperCase() + chainKey.slice(1)
  );
}

interface CrossChainDivergenceSignalTabProps {
  divergence: CrossChainDivergenceResult;
  feed: CrossChainFeedResult;
}

export function CrossChainDivergenceSignalTab({
  divergence,
  feed,
}: CrossChainDivergenceSignalTabProps) {
  const feedHealthScores: FeedHealthScore[] = feed.healthScores.map((h) => ({
    provider: h.provider,
    score: h.score,
    rhythmStability: h.rhythmStability,
    confidenceStability: h.confidenceStability,
    heartbeatReliability: h.heartbeatReliability,
    freshness: h.freshness,
  }));

  return (
    <DivergenceSignalTab
      timeSeries={divergence.timeSeries}
      leadership={divergence.leadership}
      divergenceMatrix={divergence.divergenceMatrix}
      alertCount={divergence.alertCount}
      acceleratingCount={divergence.acceleratingCount}
      directionalBiasCount={divergence.directionalBiasCount}
      leadingEntity={divergence.leadingOracle}
      maxAcceleration={divergence.maxAcceleration}
      mode="chain"
      getDisplayName={getChainDisplayName}
      feedHealthScores={feedHealthScores}
    />
  );
}
