'use client';

import { memo, useMemo } from 'react';

import Link from 'next/link';

import { Trophy, Clock, Target, Shield, GitBranch, Database, ExternalLink } from 'lucide-react';

import { useReputations } from '@/hooks/data/useReputations';
import { chartColors } from '@/lib/config/colors';
import { type CalculatedPerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
import { getScoreColor, getScoreBadge } from '@/lib/oracles/utils/reputationUtils';
import { type PriceData, type OracleProvider } from '@/types/oracle';

import { oracleNames } from '../../constants';

interface OracleRankingTabProps {
  priceData: PriceData[];
  performanceMetrics: CalculatedPerformanceMetrics[];
  isCalculatingMetrics: boolean;
}

interface RankedOracle {
  provider: OracleProvider;
  overallScore: number;
  rank: number;
  responseTime: number;
  accuracy: number;
  reliability: number;
  decentralization: number;
  dataSources: number;
  supportedChains: number;
  price: number;
  deviation: number;
  confidence: number;
  dataSource: string;
  color: string;
}

function getDataSourceLabel(dataSource: string): { label: string; color: string } {
  switch (dataSource) {
    case 'real':
      return { label: 'On-chain', color: 'text-blue-600' };
    case 'api':
      return { label: 'API', color: 'text-purple-600' };
    case 'fallback':
      return { label: 'Fallback', color: 'text-amber-600' };
    case 'mock':
      return { label: 'Simulated', color: 'text-gray-500' };
    default:
      return { label: 'Unknown', color: 'text-gray-400' };
  }
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

function OracleRankingTabComponent({
  priceData,
  performanceMetrics,
  isCalculatingMetrics,
}: OracleRankingTabProps) {
  const { data: repData } = useReputations();
  const dbReputations = useMemo(() => repData?.data ?? [], [repData]);

  const reputationMap = useMemo(() => {
    const map = new Map<string, number>();
    if (dbReputations) {
      for (const rep of dbReputations) {
        if (rep.overall_score > 0) {
          map.set(rep.provider, rep.overall_score);
        }
      }
    }
    return map;
  }, [dbReputations]);
  const rankedOracles = useMemo(() => {
    const perfMap = new Map(performanceMetrics.map((m) => [m.provider, m]));

    const oracles: RankedOracle[] = priceData.map((pd) => {
      const perf = perfMap.get(pd.provider);
      const medianPrice =
        priceData.length > 0
          ? [...priceData].sort((a, b) => a.price - b.price)[Math.floor(priceData.length / 2)].price
          : pd.price;
      const deviation =
        medianPrice > 0 ? (Math.abs(pd.price - medianPrice) / medianPrice) * 100 : 0;

      const accuracy = perf?.accuracy ?? 95;
      const reliability = perf?.reliability ?? 95;
      const responseTime = perf?.responseTime ?? 2000;
      const responseScore = Math.max(0, 100 - responseTime / 50);
      const decentralization = perf?.decentralization ?? 70;

      const overallScore = Math.round(
        accuracy * 0.3 +
          reliability * 0.25 +
          responseScore * 0.15 +
          decentralization * 0.15 +
          (100 - deviation * 20) * 0.15
      );

      return {
        provider: pd.provider,
        overallScore: Math.min(99, Math.max(0, overallScore)),
        rank: 0,
        responseTime,
        accuracy,
        reliability,
        decentralization,
        dataSources: perf?.dataSources ?? 1,
        supportedChains: perf?.supportedChains ?? 1,
        price: pd.price,
        deviation,
        confidence: (pd.confidence ?? 0) * 100,
        dataSource: pd.dataSource ?? 'unknown',
        color: chartColors.oracle[pd.provider] || '#888888',
      };
    });

    oracles.sort((a, b) => b.overallScore - a.overallScore);
    oracles.forEach((o, i) => (o.rank = i + 1));

    return oracles;
  }, [priceData, performanceMetrics]);

  if (priceData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Query data to view oracle rankings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Oracle Reliability Ranking</span>
          </div>
          <p className="text-xs text-gray-500">
            Composite score based on accuracy, reliability, response time, decentralization, and
            price deviation
          </p>
        </div>
        {isCalculatingMetrics && (
          <span className="text-xs text-blue-500 animate-pulse">Calculating...</span>
        )}
      </div>

      <div className="space-y-3">
        {rankedOracles.map((oracle) => {
          const badge = getScoreBadge(oracle.overallScore);
          const dsInfo = getDataSourceLabel(oracle.dataSource);

          return (
            <div
              key={oracle.provider}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-200">
                  <span className="text-sm font-bold text-gray-700">#{oracle.rank}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: oracle.color }}
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {oracleNames[oracle.provider] || oracle.provider}
                      </span>
                      <span className={`text-[10px] font-medium ${dsInfo.color}`}>
                        {dsInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 font-mono">
                        {oracle.overallScore}
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
                      value={oracle.overallScore}
                      maxValue={100}
                      color={getScoreColor(oracle.overallScore)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-blue-400" />
                      <span className="text-gray-500">Accuracy</span>
                      <span className="font-mono font-medium text-gray-700">
                        {oracle.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-gray-500">Reliability</span>
                      <span className="font-mono font-medium text-gray-700">
                        {oracle.reliability.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span className="text-gray-500">Latency</span>
                      <span className="font-mono font-medium text-gray-700">
                        {oracle.responseTime}ms
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3 text-orange-400" />
                      <span className="text-gray-500">Decentral.</span>
                      <span className="font-mono font-medium text-gray-700">
                        {oracle.decentralization}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-cyan-400" />
                      <span className="text-gray-500">Chains</span>
                      <span className="font-mono font-medium text-gray-700">
                        {oracle.supportedChains}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Deviation</span>
                      <span
                        className={`font-mono font-medium ${oracle.deviation > 1 ? 'text-red-600' : oracle.deviation > 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {oracle.deviation.toFixed(3)}%
                      </span>
                    </div>
                  </div>

                  {reputationMap.has(oracle.provider) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div
                        className="flex items-center gap-1.5 text-xs"
                        title="Historical 7-day aggregate score from the Oracle Reputation page"
                      >
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span className="text-gray-500">Persistent Rep.</span>
                        <span className="font-mono font-semibold text-amber-600">
                          {reputationMap.get(oracle.provider)!.toFixed(0)}
                        </span>
                      </div>
                      <Link
                        href={`/reputation/${encodeURIComponent(oracle.provider)}`}
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                        title="View detailed historical reputation"
                      >
                        Details
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {!reputationMap.has(oracle.provider) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Link
                        href={`/reputation/${encodeURIComponent(oracle.provider)}`}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 font-medium"
                        title="Visit Oracle Reputation page for historical tracking"
                      >
                        View persistent reputation
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const OracleRankingTab = memo(OracleRankingTabComponent);
OracleRankingTab.displayName = 'OracleRankingTab';
