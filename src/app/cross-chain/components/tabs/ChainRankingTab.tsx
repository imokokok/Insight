'use client';

import { memo, useMemo } from 'react';

import { Trophy, Clock, Target, Shield, GitBranch, Activity } from 'lucide-react';

import { type PriceData, type Blockchain } from '@/types/oracle';

import { chainColors, chainNames, CHAIN_EXPECTED_INTERVALS } from '../../constants';
import {
  type CrossChainDivergenceResult,
  type CrossChainFeedResult,
  type CrossChainStabilityResult,
} from '../../hooks/useCrossChainAnalytics';

interface ChainRankingTabProps {
  currentPrices: PriceData[];
  divergence: CrossChainDivergenceResult;
  feed: CrossChainFeedResult;
  stability: CrossChainStabilityResult;
}

interface RankedChain {
  chain: Blockchain;
  displayName: string;
  overallScore: number;
  rank: number;
  accuracy: number;
  reliability: number;
  latency: number;
  deviation: number;
  feedHealth: number;
  stabilityScore: number;
  price: number;
  confidence: number;
  color: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 75) return '#3b82f6';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getScoreBadge(score: number): { label: string; bgClass: string; textClass: string } {
  if (score >= 90)
    return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= 75) return { label: 'Good', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= 60) return { label: 'Fair', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  if (score >= 40) return { label: 'Poor', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
  return { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' };
}

function MetricBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ChainRankingTabComponent({
  currentPrices,
  divergence,
  feed,
  stability,
}: ChainRankingTabProps) {
  const rankedChains = useMemo(() => {
    const feedMap = new Map(feed.healthScores.map((h) => [h.provider, h]));
    const stabilityMap = new Map(stability.scores.map((s) => [s.provider, s]));
    const leadershipMap = new Map(divergence.leadership.map((l) => [l.provider, l]));

    const medianPrice =
      currentPrices.length > 0
        ? [...currentPrices].sort((a, b) => a.price - b.price)[Math.floor(currentPrices.length / 2)]
            .price
        : 0;

    const chains: RankedChain[] = currentPrices
      .filter((p) => p.chain && p.price > 0)
      .map((pd) => {
        const chain = pd.chain!;
        const deviation =
          medianPrice > 0 ? (Math.abs(pd.price - medianPrice) / medianPrice) * 100 : 0;

        const feedHealth = feedMap.get(chain)?.score ?? 70;
        const stabilityScore = stabilityMap.get(chain)?.score ?? 70;
        const leadership = leadershipMap.get(chain);

        const accuracy = Math.max(0, 100 - deviation * 5);

        const reliability = feedHealth;

        const latency = leadership?.avgLagSeconds ?? 0;
        const expectedInterval =
          (CHAIN_EXPECTED_INTERVALS as Record<string, number>)[chain.toLowerCase()] ?? 10;
        const latencyExcess = Math.max(0, latency - expectedInterval * 2);
        const latencyScore = Math.max(0, 100 - latencyExcess * 10);

        const deviationScore = Math.max(0, 100 - deviation * 5);

        const overallScore = Math.round(
          accuracy * 0.25 +
            reliability * 0.25 +
            latencyScore * 0.15 +
            stabilityScore * 0.2 +
            deviationScore * 0.15
        );

        return {
          chain,
          displayName: (chainNames as Record<string, string>)[chain] || chain,
          overallScore: Math.min(99, Math.max(0, overallScore)),
          rank: 0,
          accuracy: Math.round(accuracy * 10) / 10,
          reliability: Math.round(reliability * 10) / 10,
          latency: Math.round(latency * 100) / 100,
          deviation,
          feedHealth,
          stabilityScore,
          price: pd.price,
          confidence: (pd.confidence ?? 0) * 100,
          color: (chainColors as Record<string, string>)[chain] || '#888888',
        };
      });

    chains.sort((a, b) => b.overallScore - a.overallScore);
    chains.forEach((c, i) => (c.rank = i + 1));

    return chains;
  }, [currentPrices, divergence, feed, stability]);

  if (currentPrices.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Query data to view chain rankings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Chain Reliability Ranking</span>
          </div>
          <p className="text-xs text-gray-500">
            Composite score based on accuracy, feed health, response latency, stability, and price
            deviation from cross-chain consensus
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {rankedChains.map((chain) => {
          const badge = getScoreBadge(chain.overallScore);

          return (
            <div
              key={chain.chain}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-200">
                  <span className="text-sm font-bold text-gray-700">#{chain.rank}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: chain.color }}
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {chain.displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 font-mono">
                        {chain.overallScore}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${badge.bgClass} ${badge.textClass}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <MetricBar
                      value={chain.overallScore}
                      maxValue={100}
                      color={getScoreColor(chain.overallScore)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-blue-400" />
                      <span className="text-gray-500">Accuracy</span>
                      <span className="font-mono font-medium text-gray-700">
                        {chain.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-gray-500">Feed Health</span>
                      <span className="font-mono font-medium text-gray-700">
                        {chain.feedHealth}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span className="text-gray-500">Latency</span>
                      <span className="font-mono font-medium text-gray-700">
                        {chain.latency.toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-teal-400" />
                      <span className="text-gray-500">Stability</span>
                      <span className="font-mono font-medium text-gray-700">
                        {chain.stabilityScore}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3 text-orange-400" />
                      <span className="text-gray-500">Confidence</span>
                      <span className="font-mono font-medium text-gray-700">
                        {chain.confidence.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Deviation</span>
                      <span
                        className={`font-mono font-medium ${chain.deviation > 1 ? 'text-red-600' : chain.deviation > 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {chain.deviation.toFixed(3)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stability.scores.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-700" />
            <span className="text-base font-semibold text-gray-900">Stability Details</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Per-chain stability breakdown: price consistency, update frequency, confidence
            stability, and data completeness
          </p>
          <div className="space-y-3">
            {[...stability.scores]
              .sort((a, b) => b.score - a.score)
              .map((chain) => {
                const display =
                  (chainNames as Record<string, string>)[chain.provider] || chain.provider;
                return (
                  <div key={chain.provider} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{display}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 font-mono">
                          {chain.score}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${
                            chain.level === 'excellent'
                              ? 'bg-emerald-50 text-emerald-700'
                              : chain.level === 'good'
                                ? 'bg-blue-50 text-blue-700'
                                : chain.level === 'fair'
                                  ? 'bg-amber-50 text-amber-700'
                                  : chain.level === 'poor'
                                    ? 'bg-orange-50 text-orange-700'
                                    : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {chain.level.charAt(0).toUpperCase() + chain.level.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                      <span>
                        Price Consistency:{' '}
                        <span className="font-mono font-medium text-gray-700">
                          {chain.components.priceConsistency}%
                        </span>
                      </span>
                      <span>
                        Update Freq:{' '}
                        <span className="font-mono font-medium text-gray-700">
                          {chain.components.updateFrequencyConsistency}%
                        </span>
                      </span>
                      <span>
                        Confidence:{' '}
                        <span className="font-mono font-medium text-gray-700">
                          {chain.components.confidenceStability}%
                        </span>
                      </span>
                      <span>
                        Completeness:{' '}
                        <span className="font-mono font-medium text-gray-700">
                          {chain.components.dataCompleteness}%
                        </span>
                      </span>
                    </div>
                    {chain.trend !== 'stable' && (
                      <div className="mt-2 text-[10px]">
                        <span
                          className={`font-medium ${
                            chain.trend === 'rapidly_declining'
                              ? 'text-red-600'
                              : chain.trend === 'declining'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          Trend: {chain.trend.replace('_', ' ')}
                          {chain.estimatedTimeToCritical !== null && (
                            <span className="text-gray-400 ml-1">
                              (ETA to critical: {chain.estimatedTimeToCritical}s)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export const ChainRankingTab = memo(ChainRankingTabComponent);
ChainRankingTab.displayName = 'ChainRankingTab';
