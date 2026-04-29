'use client';

import { memo, useMemo } from 'react';

import { Heart, Activity, BarChart3, AlertTriangle, Zap } from 'lucide-react';

import type {
  UpdateRhythmMetrics,
  ConfidenceIntervalMetrics,
  HeartbeatMetrics,
  FeedHealthScore,
  FeedHealthLevel,
  RhythmAnomalyType,
} from '@/lib/analytics/feedBehavior';

interface FeedHealthTabProps {
  rhythmMetrics: UpdateRhythmMetrics[];
  confidenceMetrics: ConfidenceIntervalMetrics[];
  heartbeatMetrics: HeartbeatMetrics[];
  healthScores: FeedHealthScore[];
  overallHealthAvg: number;
  overallHealthLevel: FeedHealthLevel;
  anomalyCount: number;
  heartbeatLostCount: number;
  confidenceSurgeCount: number;
}

function getHealthLevelBadge(level: FeedHealthLevel): {
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

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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

function getScoreBadge(score: number): { label: string; bgClass: string; textClass: string } {
  if (score >= 80)
    return { label: 'Healthy', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= 60) return { label: 'Fair', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= 40)
    return { label: 'Degraded', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  return { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' };
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function MiniBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

function FeedHealthTabComponent({
  rhythmMetrics,
  confidenceMetrics,
  heartbeatMetrics,
  healthScores,
  overallHealthAvg,
  overallHealthLevel,
  anomalyCount,
  heartbeatLostCount,
  confidenceSurgeCount,
}: FeedHealthTabProps) {
  const overallBadge = getHealthLevelBadge(overallHealthLevel);
  const currentTime = useMemo(() => Date.now(), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">Feed Health Monitor</span>
          </div>
          <p className="text-xs text-gray-500">
            Monitor oracle feed behavior beyond price — update rhythm, confidence intervals, and
            heartbeat reliability reveal issues invisible to price-only analysis
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Overall Health</p>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-lg font-semibold text-gray-900 font-mono">
              {overallHealthAvg}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${overallBadge.bgClass} ${overallBadge.textClass}`}
            >
              {overallBadge.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium text-gray-700">Overall Health</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-gray-900 font-mono">{overallHealthAvg}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded mt-1.5 ${overallBadge.bgClass} ${overallBadge.textClass}`}
          >
            {overallBadge.label}
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
            <span className="text-xl font-bold text-gray-900 font-mono">
              {confidenceSurgeCount}
            </span>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded mt-1.5 ${confidenceSurgeCount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}
          >
            {confidenceSurgeCount > 0 ? 'Surge Detected' : 'Stable'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <span className="text-base font-semibold text-gray-900">Oracle Feed Health Scores</span>
        </div>
        <div className="space-y-4">
          {healthScores.map((oracle) => {
            const badge = getScoreBadge(oracle.score);
            const scoreColor = getScoreColor(oracle.score);
            return (
              <div key={oracle.provider} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
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
                  <span className="text-lg font-bold text-gray-900 font-mono">{oracle.score}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${oracle.score}%`, backgroundColor: scoreColor }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Rhythm Stability</span>
                      <span className="text-[10px] font-mono font-medium text-gray-700">
                        {oracle.rhythmStability}%
                      </span>
                    </div>
                    <MiniBar
                      value={oracle.rhythmStability}
                      maxValue={100}
                      color={getScoreColor(oracle.rhythmStability)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Confidence Stability</span>
                      <span className="text-[10px] font-mono font-medium text-gray-700">
                        {oracle.confidenceStability}%
                      </span>
                    </div>
                    <MiniBar
                      value={oracle.confidenceStability}
                      maxValue={100}
                      color={getScoreColor(oracle.confidenceStability)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Heartbeat Reliability</span>
                      <span className="text-[10px] font-mono font-medium text-gray-700">
                        {oracle.heartbeatReliability}%
                      </span>
                    </div>
                    <MiniBar
                      value={oracle.heartbeatReliability}
                      maxValue={100}
                      color={getScoreColor(oracle.heartbeatReliability)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Freshness</span>
                      <span className="text-[10px] font-mono font-medium text-gray-700">
                        {oracle.freshness}%
                      </span>
                    </div>
                    <MiniBar
                      value={oracle.freshness}
                      maxValue={100}
                      color={getScoreColor(oracle.freshness)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gray-700" />
          <span className="text-base font-semibold text-gray-900">Update Rhythm Analysis</span>
        </div>
        <div className="space-y-3">
          {rhythmMetrics.map((oracle) => {
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-gray-700" />
          <span className="text-base font-semibold text-gray-900">Heartbeat Monitor</span>
        </div>
        <div className="space-y-3">
          {heartbeatMetrics.map((oracle) => {
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
                  <span className="text-sm font-bold font-mono text-gray-900">
                    {reliabilityPct}%
                  </span>
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
                    <span className="text-gray-500">Last Update</span>
                    <p className="font-mono font-medium text-gray-700">
                      {oracle.lastUpdateTimestamp > 0 ? relativeTime : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confidenceMetrics.some((c) => c.widths.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-gray-700" />
            <span className="text-base font-semibold text-gray-900">
              Confidence Interval Tracking
            </span>
          </div>
          <div className="space-y-3">
            {confidenceMetrics
              .filter((c) => c.widths.length > 0)
              .map((oracle) => {
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
                            ⚠ Surge ({Math.round(oracle.surgeMagnitude * 100)}%)
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
      )}
    </div>
  );
}

export const FeedHealthTab = memo(FeedHealthTabComponent);
FeedHealthTab.displayName = 'FeedHealthTab';
