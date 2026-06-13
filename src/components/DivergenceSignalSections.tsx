'use client';

import { TrendingUp, Zap, Navigation, Grid3x3, Activity } from 'lucide-react';

import { createBadgeMapper, type BadgeStyle } from '@/components/shared/badgeUtils';
import type {
  DivergenceTimeSeries,
  OracleLeadership,
  DivergencePair,
  DivergenceDirection,
  DivergenceAcceleration,
  LeadershipStatus,
} from '@/lib/analytics/divergenceSignals';
import type { FeedHealthScore as FullFeedHealthScore } from '@/lib/analytics/feedBehavior';
import { getScoreBadge, getScoreColor } from '@/lib/oracles/utils/reputationUtils';

export type DivergenceMode = 'chain' | 'oracle';

export type FeedHealthScore = Pick<
  FullFeedHealthScore,
  | 'provider'
  | 'score'
  | 'rhythmStability'
  | 'confidenceStability'
  | 'heartbeatReliability'
  | 'freshness'
>;

export const LABELS: Record<DivergenceMode, Record<string, string>> = {
  chain: {
    title: 'Cross-Chain Divergence Signals',
    subtitle:
      'Track how each chain deviates from cross-chain consensus over time, detect accelerating deviations and directional bias',
    emptyMessage:
      'Divergence signals require at least 2 chains with price history. Enable auto-refresh to accumulate data points over time.',
    limitedDataSuffix: 'per chain',
    acceleratingLabel: 'Chains with accelerating deviation',
    directionalLabel: 'Chains with directional bias',
    leadingLabel: 'Leading Chain',
    timeSeriesTitle: 'Chain Deviation Time Series',
    leadershipTitle: 'Chain Response Leadership',
    matrixTitle: 'Inter-Chain Divergence Matrix',
    feedHealthTitle: 'Chain Feed Health Summary',
  },
  oracle: {
    title: 'Divergence Signals',
    subtitle:
      'Track how each oracle deviates from market consensus over time, detect accelerating deviations and directional bias',
    emptyMessage:
      'Divergence signals require at least 2 oracle providers with price history. Enable auto-refresh to accumulate data points over time.',
    limitedDataSuffix: 'per oracle',
    acceleratingLabel: 'Oracles with accelerating deviation',
    directionalLabel: 'Oracles with directional bias',
    leadingLabel: 'Leading Oracle',
    timeSeriesTitle: 'Deviation Time Series',
    leadershipTitle: 'Oracle Response Leadership',
    matrixTitle: 'Inter-Oracle Divergence Matrix',
    feedHealthTitle: 'Oracle Feed Health Summary',
  },
};

function getDeviationColor(deviation: number): string {
  const abs = Math.abs(deviation);
  if (abs < 1) return 'text-emerald-600';
  if (abs < 3) return 'text-amber-600';
  return 'text-red-600';
}

function getDeviationBgColor(deviation: number): string {
  const abs = Math.abs(deviation);
  if (abs < 0.5) return 'bg-emerald-50';
  if (abs < 1) return 'bg-emerald-100';
  if (abs < 2) return 'bg-amber-50';
  return 'bg-red-50';
}

const leadershipBadgeMapping: Record<LeadershipStatus, BadgeStyle> = {
  leading: { label: 'Leading', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
  synchronized: { label: 'Synchronized', bgClass: 'bg-blue-50', textClass: 'text-blue-700' },
  lagging: { label: 'Lagging', bgClass: 'bg-red-50', textClass: 'text-red-700' },
};

const getLeadershipBadge = createBadgeMapper<LeadershipStatus>(leadershipBadgeMapping, {
  label: 'Unknown',
  bgClass: 'bg-gray-50',
  textClass: 'text-gray-700',
});

const accelerationBadgeMapping: Record<DivergenceAcceleration, BadgeStyle> = {
  accelerating: { label: 'Accelerating', bgClass: 'bg-red-50', textClass: 'text-red-700' },
  decelerating: { label: 'Decelerating', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
  stable: { label: 'Stable', bgClass: 'bg-gray-50', textClass: 'text-gray-600' },
};

const getAccelerationBadge = createBadgeMapper<DivergenceAcceleration>(accelerationBadgeMapping, {
  label: 'Unknown',
  bgClass: 'bg-gray-50',
  textClass: 'text-gray-700',
});

function getDirectionBadge(direction: DivergenceDirection): {
  label: string;
  textClass: string;
} {
  switch (direction) {
    case 'positive':
      return { label: '↑ Positive', textClass: 'text-emerald-600' };
    case 'negative':
      return { label: '↓ Negative', textClass: 'text-red-600' };
    case 'neutral':
      return { label: '— Neutral', textClass: 'text-gray-500' };
    default:
      return { label: '— Unknown', textClass: 'text-gray-500' };
  }
}

interface DivergenceStatsCardsProps {
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingEntity: string | null;
  maxAcceleration: number;
  acceleratingLabel: string;
  directionalLabel: string;
  leadingLabel: string;
  getDisplayName: (key: string) => string;
}

function DivergenceStatsCards({
  acceleratingCount,
  directionalBiasCount,
  leadingEntity,
  maxAcceleration,
  acceleratingLabel,
  directionalLabel,
  leadingLabel,
  getDisplayName,
}: DivergenceStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap
            className={`w-4 h-4 ${acceleratingCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}
          />
          <span className="text-sm font-medium text-gray-700">Accelerating</span>
        </div>
        <p
          className={`text-2xl font-bold font-mono ${acceleratingCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}
        >
          {acceleratingCount}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {acceleratingLabel}
          {maxAcceleration > 0 && (
            <span className="text-red-500 ml-1">Max: {maxAcceleration.toFixed(4)}%/update</span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Navigation
            className={`w-4 h-4 ${directionalBiasCount > 0 ? 'text-orange-500' : 'text-emerald-500'}`}
          />
          <span className="text-sm font-medium text-gray-700">Directional Bias</span>
        </div>
        <p
          className={`text-2xl font-bold font-mono ${directionalBiasCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}
        >
          {directionalBiasCount}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">{directionalLabel}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">{leadingLabel}</span>
        </div>
        <p className="text-2xl font-bold text-blue-600 font-mono">
          {leadingEntity ? getDisplayName(leadingEntity) : 'N/A'}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">Fastest response to market</p>
      </div>
    </div>
  );
}

interface TimeSeriesSectionProps {
  timeSeries: DivergenceTimeSeries[];
  title: string;
  getDisplayName: (key: string) => string;
}

function TimeSeriesSection({ timeSeries, title, getDisplayName }: TimeSeriesSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-gray-700" />
        <span className="text-base font-semibold text-gray-900">{title}</span>
      </div>
      <div className="space-y-3">
        {timeSeries.map((ts) => {
          const dirBadge = getDirectionBadge(ts.currentDirection);
          const accBadge = getAccelerationBadge(ts.acceleration);
          const barWidth =
            ts.maxDeviation > 0
              ? Math.min((Math.abs(ts.currentDeviation) / ts.maxDeviation) * 100, 100)
              : 0;

          return (
            <div
              key={ts.provider}
              className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {getDisplayName(ts.provider)}
                  </span>
                  <span
                    className={`text-sm font-mono font-medium ${getDeviationColor(ts.currentDeviation)}`}
                  >
                    {ts.currentDeviation.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${dirBadge.textClass}`}>
                    {dirBadge.label}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${accBadge.bgClass} ${accBadge.textClass}`}
                  >
                    {accBadge.label}
                  </span>
                </div>
              </div>

              {ts.isDirectionalBias && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs text-orange-600 font-medium">
                    ⚠ Directional Bias ({ts.directionalBiasCount} consecutive)
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${getDeviationBgColor(ts.currentDeviation)}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>Max: {ts.maxDeviation.toFixed(2)}%</span>
                <span>Avg: {ts.avgDeviation.toFixed(2)}%</span>
              </div>
            </div>
          );
        })}
        {timeSeries.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            No divergence time series data available
          </p>
        )}
      </div>
    </div>
  );
}

interface LeadershipSectionProps {
  leadership: OracleLeadership[];
  title: string;
  getDisplayName: (key: string) => string;
}

function LeadershipSection({ leadership, title, getDisplayName }: LeadershipSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Navigation className="w-5 h-5 text-gray-700" />
        <span className="text-base font-semibold text-gray-900">{title}</span>
      </div>
      <div className="space-y-2">
        {leadership.map((entity, index) => {
          const badge = getLeadershipBadge(entity.status);
          const reliability =
            entity.totalUpdates > 0 ? (entity.firstResponseCount / entity.totalUpdates) * 100 : 0;

          return (
            <div
              key={entity.provider}
              className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {getDisplayName(entity.provider)}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    Avg lag:{' '}
                    <span className="font-mono font-medium text-gray-700">
                      {entity.avgLagSeconds.toFixed(2)}s
                    </span>
                  </span>
                  <span>
                    First response:{' '}
                    <span className="font-mono font-medium text-gray-700">
                      {entity.firstResponseCount}/{entity.totalUpdates}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-14">Reliability</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(reliability, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-gray-500 w-10 text-right">
                  {reliability.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
        {leadership.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No leadership data available</p>
        )}
      </div>
    </div>
  );
}

interface DivergenceMatrixSectionProps {
  divergenceMatrix: DivergencePair[][];
  entityNames: string[];
  title: string;
  getDisplayName: (key: string) => string;
}

function DivergenceMatrixSection({
  divergenceMatrix,
  entityNames,
  title,
  getDisplayName,
}: DivergenceMatrixSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Grid3x3 className="w-5 h-5 text-gray-700" />
        <span className="text-base font-semibold text-gray-900">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500" />
              {entityNames.map((name, idx) => (
                <th
                  key={`${name}-${idx}`}
                  className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500"
                >
                  {getDisplayName(name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {divergenceMatrix.map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`} className="border-t border-gray-100">
                <td className="px-2 py-1.5 text-[10px] font-medium text-gray-700 whitespace-nowrap">
                  {getDisplayName(entityNames[rowIdx])}
                </td>
                {row.map((pair, colIdx) => {
                  if (colIdx === rowIdx) {
                    return (
                      <td key={colIdx} className="px-2 py-1.5 text-center text-gray-300">
                        —
                      </td>
                    );
                  }
                  const deviation =
                    colIdx > rowIdx
                      ? pair.deviationPercent
                      : (divergenceMatrix[colIdx]?.[rowIdx]?.deviationPercent ?? 0);
                  return (
                    <td key={colIdx} className="px-2 py-1.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${getDeviationBgColor(deviation)} ${getDeviationColor(deviation)}`}
                      >
                        {deviation.toFixed(2)}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FeedHealthSectionProps {
  feedHealthScores: FeedHealthScore[];
  title: string;
  getDisplayName: (key: string) => string;
}

function FeedHealthSection({ feedHealthScores, title, getDisplayName }: FeedHealthSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-gray-700" />
        <span className="text-base font-semibold text-gray-900">{title}</span>
      </div>
      <div className="space-y-3">
        {feedHealthScores.map((entity) => {
          const badge = getScoreBadge(entity.score);
          return (
            <div key={entity.provider} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getDisplayName(entity.provider)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <span className="text-lg font-bold text-gray-900 font-mono">{entity.score}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${entity.score}%`,
                    backgroundColor: getScoreColor(entity.score),
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                <span>
                  Rhythm:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {entity.rhythmStability}%
                  </span>
                </span>
                <span>
                  Confidence:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {entity.confidenceStability}%
                  </span>
                </span>
                <span>
                  Heartbeat:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {entity.heartbeatReliability}%
                  </span>
                </span>
                <span>
                  Freshness:{' '}
                  <span className="font-mono font-medium text-gray-700">{entity.freshness}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export {
  DivergenceStatsCards,
  TimeSeriesSection,
  LeadershipSection,
  DivergenceMatrixSection,
  FeedHealthSection,
};
