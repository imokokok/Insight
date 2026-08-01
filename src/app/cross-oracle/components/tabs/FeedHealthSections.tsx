import { useMemo } from 'react';

import { Heart, Activity, BarChart3, AlertTriangle, Zap } from 'lucide-react';

import type {
  UpdateRhythmMetrics,
  ConfidenceIntervalMetrics,
  HeartbeatMetrics,
  FeedHealthScore,
  FeedHealthLevel,
  RhythmAnomalyType,
} from '@/lib/analytics/feedBehavior';
import { getScoreBadge } from '@/lib/oracles/utils/reputationUtils';
import { capitalize } from '@/lib/utils/format';

export function getHealthLevelBadge(level: FeedHealthLevel): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (level) {
    case 'healthy':
      return { label: 'Healthy', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    case 'fair':
      return { label: 'Fair', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
    case 'degraded':
      return { label: 'Degraded', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
    case 'critical':
      return { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' };
    default:
      return { label: 'Unknown', bgClass: 'bg-gray-50', textClass: 'text-gray-700' };
  }
}

function getAnomalyTypeLabel(type: RhythmAnomalyType): string {
  switch (type) {
    case 'irregular':
      return 'Irregular';
    case 'sudden_slowdown':
      return 'Sudden Slowdown';
    case 'sudden_speedup':
      return 'Sudden Speedup';
    case 'gap_detected':
      return 'Gap Detected';
    default:
      return 'Unknown';
  }
}

function getReliabilityColor(reliability: number): string {
  if (reliability >= 90) return 'bg-emerald-500';
  if (reliability >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getTrendBadge(trend: string): { label: string; bgClass: string; textClass: string } {
  switch (trend) {
    case 'expanding':
      return { label: 'Expanding', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
    case 'contracting':
      return { label: 'Contracting', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    case 'stable':
      return { label: 'Stable', bgClass: 'bg-gray-50', textClass: 'text-gray-700' };
    default:
      return { label: 'Unknown', bgClass: 'bg-gray-50', textClass: 'text-gray-700' };
  }
}

interface HealthScoreCardsProps {
  overallHealthAvg: number;
  anomalyCount: number;
  heartbeatLostCount: number;
  confidenceSurgeCount: number;
}

export function HealthScoreCards({
  overallHealthAvg,
  anomalyCount,
  heartbeatLostCount,
  confidenceSurgeCount,
}: HealthScoreCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-gray-700">Overall Health</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-gray-900 font-mono">{overallHealthAvg}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded mt-1.5 bg-blue-50 text-blue-700">
          {overallHealthAvg >= 80 ? 'Broadly Healthy' : 'Needs Review'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity
            className={`w-4 h-4 ${anomalyCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}
          />
          <span className="text-xs font-medium text-gray-700">Rhythm Anomalies</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-gray-900 font-mono">{anomalyCount}</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded mt-1.5 ${anomalyCount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {anomalyCount > 0 ? 'Anomalies Detected' : 'Normal'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle
            className={`w-4 h-4 ${heartbeatLostCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}
          />
          <span className="text-xs font-medium text-gray-700">Heartbeat Lost</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-gray-900 font-mono">{heartbeatLostCount}</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded mt-1.5 ${heartbeatLostCount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {heartbeatLostCount > 0 ? 'Lost Detected' : 'All Active'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap
            className={`w-4 h-4 ${confidenceSurgeCount > 0 ? 'text-orange-500' : 'text-emerald-500'}`}
          />
          <span className="text-xs font-medium text-gray-700">Confidence Surges</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-gray-900 font-mono">{confidenceSurgeCount}</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded mt-1.5 ${confidenceSurgeCount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {confidenceSurgeCount > 0 ? 'Surge Detected' : 'Stable'}
        </span>
      </div>
    </div>
  );
}

interface OracleHealthScoresSectionProps {
  healthScores: FeedHealthScore[];
}

export function OracleHealthScoresSection({ healthScores }: OracleHealthScoresSectionProps) {
  const rankedScores = [...healthScores].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <div>
            <span className="block text-base font-semibold text-gray-900">
              Oracle Feed Health Scores
            </span>
            <p className="text-xs text-gray-500">
              Ranked by overall feed quality. Sub-metrics below 85% are flagged as potential
              weakness.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {rankedScores.map((oracle) => {
          const badge = getScoreBadge(oracle.score);
          const weakestSignals = [
            { label: 'Rhythm', value: oracle.rhythmStability },
            { label: 'Confidence', value: oracle.confidenceStability },
            { label: 'Heartbeat', value: oracle.heartbeatReliability },
            { label: 'Freshness', value: oracle.freshness },
          ]
            .sort((a, b) => a.value - b.value)
            .filter((metric) => metric.value < 85)
            .slice(0, 2);

          return (
            <div key={oracle.provider} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {capitalize(oracle.provider)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${badge.bgClass} ${badge.textClass}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-lg font-bold text-gray-900 font-mono">
                    {oracle.score}
                  </span>
                  <span className="text-[10px] text-gray-500">overall score</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {weakestSignals.length > 0 ? (
                  weakestSignals.map((metric) => (
                    <span
                      key={`${oracle.provider}-${metric.label}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-700"
                    >
                      {metric.label}
                      <span className="font-mono">{metric.value}%</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No material weakness detected</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RhythmAnalysisSectionProps {
  rhythmMetrics: UpdateRhythmMetrics[];
}

export function RhythmAnalysisSection({ rhythmMetrics }: RhythmAnalysisSectionProps) {
  const flaggedMetrics = [...rhythmMetrics]
    .filter((oracle) => oracle.isAnomalous)
    .sort((a, b) => b.intervalCV - a.intervalCV);
  const hiddenHealthyCount = rhythmMetrics.length - flaggedMetrics.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-700" />
          <div>
            <span className="block text-base font-semibold text-gray-900">
              Update Rhythm Analysis
            </span>
            <p className="text-xs text-gray-500">Only cadence anomalies are shown.</p>
          </div>
        </div>
        {hiddenHealthyCount > 0 && (
          <span className="text-xs text-gray-500">{hiddenHealthyCount} healthy feeds hidden</span>
        )}
      </div>
      <div className="space-y-3">
        {flaggedMetrics.length === 0 && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-800">
            No update rhythm anomalies detected across tracked providers.
          </div>
        )}
        {flaggedMetrics.map((oracle) => {
          const ratio =
            oracle.expectedIntervalSeconds > 0
              ? oracle.actualAvgIntervalSeconds / oracle.expectedIntervalSeconds
              : 0;
          const barPosition = Math.min(Math.max(ratio, 0), 2);
          const barPercent = (barPosition / 2) * 100;
          return (
            <div key={oracle.provider} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {capitalize(oracle.provider)}
                </span>
                {oracle.isAnomalous && oracle.anomalyType ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-red-50 text-red-700">
                    {getAnomalyTypeLabel(oracle.anomalyType)}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700">
                    Normal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
                <span>
                  Expected:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {formatInterval(oracle.expectedIntervalSeconds)}
                  </span>
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Actual:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {formatInterval(oracle.actualAvgIntervalSeconds)}
                  </span>
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  CV:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {(oracle.intervalCV * 100).toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-2">
                <div className="absolute top-0 h-2 w-px bg-gray-400" style={{ left: '50%' }} />
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${barPercent}%`,
                    backgroundColor:
                      ratio > 1.5 || ratio < 0.5
                        ? '#ef4444'
                        : ratio > 1.2 || ratio < 0.8
                          ? '#f59e0b'
                          : '#10b981',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                <span>0x</span>
                <span>1.0x</span>
                <span>2.0x</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HeartbeatMonitorSectionProps {
  heartbeatMetrics: HeartbeatMetrics[];
  rhythmMetrics: UpdateRhythmMetrics[];
  currentTime: number;
}

export function HeartbeatMonitorSection({
  heartbeatMetrics,
  rhythmMetrics,
  currentTime,
}: HeartbeatMonitorSectionProps) {
  const expectedIntervalMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rhythmMetrics) {
      map.set(r.provider, r.expectedIntervalSeconds);
    }
    return map;
  }, [rhythmMetrics]);

  const flaggedMetrics = [...heartbeatMetrics]
    .filter(
      (oracle) => oracle.isHeartbeatLost || oracle.reliability < 0.9 || oracle.missedBeats > 0
    )
    .sort((a, b) => {
      if (Number(b.isHeartbeatLost) !== Number(a.isHeartbeatLost)) {
        return Number(b.isHeartbeatLost) - Number(a.isHeartbeatLost);
      }
      return a.reliability - b.reliability;
    });
  const hiddenHealthyCount = heartbeatMetrics.length - flaggedMetrics.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-gray-700" />
          <div>
            <span className="block text-base font-semibold text-gray-900">Heartbeat Tracker</span>
            <p className="text-xs text-gray-500">
              Only feeds with missed beats or weak reliability are shown.
            </p>
          </div>
        </div>
        {hiddenHealthyCount > 0 && (
          <span className="text-xs text-gray-500">{hiddenHealthyCount} healthy feeds hidden</span>
        )}
      </div>
      <div className="space-y-3">
        {flaggedMetrics.length === 0 && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-800">
            All tracked feeds have active heartbeats with acceptable reliability.
          </div>
        )}
        {flaggedMetrics.map((oracle) => {
          const reliabilityPct = Math.round(oracle.reliability * 100);
          const barColor = getReliabilityColor(reliabilityPct);
          const timeSinceLastUpdate =
            oracle.lastUpdateTimestamp > 0
              ? Math.max(Math.floor((currentTime - oracle.lastUpdateTimestamp) / 1000), 0)
              : 0;
          const relativeTime =
            timeSinceLastUpdate < 60
              ? `${timeSinceLastUpdate}s ago`
              : timeSinceLastUpdate < 3600
                ? `${Math.floor(timeSinceLastUpdate / 60)}m ago`
                : `${Math.floor(timeSinceLastUpdate / 3600)}h ago`;
          return (
            <div key={oracle.provider} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {capitalize(oracle.provider)}
                </span>
                {oracle.isHeartbeatLost ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-red-50 text-red-700 animate-pulse">
                    LOST
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-700">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Reliability:</span>
                <span className="text-sm font-bold font-mono text-gray-900">{reliabilityPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(reliabilityPct, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Missed Beats</span>
                  <p className="font-mono font-medium text-gray-700">{oracle.missedBeats}</p>
                </div>
                <div>
                  <span className="text-gray-500">Max Gap</span>
                  <p className="font-mono font-medium text-gray-700">
                    {formatInterval(oracle.maxGapSeconds)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Expected Interval</span>
                  <p className="font-mono font-medium text-gray-700">
                    {expectedIntervalMap.has(oracle.provider)
                      ? formatInterval(expectedIntervalMap.get(oracle.provider)!)
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last Update:{' '}
                <span className="font-mono font-medium text-gray-700">
                  {oracle.lastUpdateTimestamp > 0 ? relativeTime : 'N/A'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ConfidenceIntervalSectionProps {
  confidenceMetrics: ConfidenceIntervalMetrics[];
}

export function ConfidenceIntervalSection({ confidenceMetrics }: ConfidenceIntervalSectionProps) {
  const trackedMetrics = confidenceMetrics.filter((c) => c.widths.length > 0);
  if (trackedMetrics.length === 0) return null;

  const flaggedMetrics = [...trackedMetrics]
    .filter(
      (oracle) =>
        oracle.isSurge ||
        oracle.trend === 'expanding' ||
        oracle.currentWidth > Math.max(oracle.avgWidth * 1.5, oracle.avgWidth + 0.05)
    )
    .sort((a, b) => Number(b.isSurge) - Number(a.isSurge) || b.widthChangeRate - a.widthChangeRate);
  const hiddenStableCount = trackedMetrics.length - flaggedMetrics.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-gray-700" />
          <div>
            <span className="block text-base font-semibold text-gray-900">
              Confidence Interval Tracking
            </span>
            <p className="text-xs text-gray-500">
              Width history from recent updates. Stable feeds are hidden to reduce noise.
            </p>
          </div>
        </div>
        {hiddenStableCount > 0 && (
          <span className="text-xs text-gray-500">{hiddenStableCount} stable feeds hidden</span>
        )}
      </div>
      <div className="space-y-3">
        {flaggedMetrics.length === 0 && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-800">
            No expanding or surged confidence intervals detected.
          </div>
        )}
        {flaggedMetrics.map((oracle) => {
          const trendBadge = getTrendBadge(oracle.trend);
          const changePct = (oracle.widthChangeRate * 100).toFixed(1);
          const maxW = Math.max(...oracle.widths, 0.01);
          return (
            <div key={oracle.provider} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {capitalize(oracle.provider)}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${trendBadge.bgClass} ${trendBadge.textClass}`}
                  >
                    {trendBadge.label}
                  </span>
                  {oracle.isSurge && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-red-50 text-red-700">
                      Surge ({Math.round(oracle.surgeMagnitude * 100)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
                <span>
                  Current:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {oracle.currentWidth.toFixed(2)}
                  </span>
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Average:{' '}
                  <span className="font-mono font-medium text-gray-700">
                    {oracle.avgWidth.toFixed(2)}
                  </span>
                </span>
                <span className="text-gray-300">|</span>
                <span>
                  Change:{' '}
                  <span
                    className={`font-mono font-medium ${Number(changePct) > 0 ? 'text-amber-600' : Number(changePct) < 0 ? 'text-emerald-600' : 'text-gray-700'}`}
                  >
                    {Number(changePct) > 0 ? '+' : ''}
                    {changePct}%
                  </span>
                </span>
              </div>
              <div className="flex items-end gap-px h-8">
                {oracle.widths.map((w, i) => {
                  const height = Math.max((w / maxW) * 100, 2);
                  const isLast = i === oracle.widths.length - 1;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all duration-300"
                      style={{
                        height: `${height}%`,
                        backgroundColor: isLast
                          ? '#3b82f6'
                          : oracle.isSurge && i >= oracle.widths.length - 3
                            ? '#f97316'
                            : '#d1d5db',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
