'use client';

import { memo, useState, useEffect } from 'react';

import { Heart } from 'lucide-react';

import type {
  FeedHealthLevel,
  UpdateRhythmMetrics,
  ConfidenceIntervalMetrics,
  HeartbeatMetrics,
  FeedHealthScore,
} from '@/lib/analytics/feedBehavior';

import {
  HealthScoreCards,
  OracleHealthScoresSection,
  RhythmAnalysisSection,
  HeartbeatMonitorSection,
  ConfidenceIntervalSection,
  getHealthLevelBadge,
} from './FeedHealthSections';

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
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">Feed Health Tracker</span>
          </div>
          <p className="text-xs text-gray-500">
            Track oracle feed behavior beyond price — update rhythm, confidence intervals, and
            heartbeat reliability reveal issues invisible to price-only analysis. Based on
            accumulated polled data (up to 24h window).
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

      <HealthScoreCards
        overallHealthAvg={overallHealthAvg}
        anomalyCount={anomalyCount}
        heartbeatLostCount={heartbeatLostCount}
        confidenceSurgeCount={confidenceSurgeCount}
      />

      <OracleHealthScoresSection healthScores={healthScores} />

      <RhythmAnalysisSection rhythmMetrics={rhythmMetrics} />

      <HeartbeatMonitorSection
        heartbeatMetrics={heartbeatMetrics}
        rhythmMetrics={rhythmMetrics}
        currentTime={currentTime}
      />

      <ConfidenceIntervalSection confidenceMetrics={confidenceMetrics} />
    </div>
  );
}

export const FeedHealthTab = memo(FeedHealthTabComponent);
FeedHealthTab.displayName = 'FeedHealthTab';
