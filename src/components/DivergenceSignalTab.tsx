'use client';

import { memo } from 'react';

import { TrendingUp, AlertTriangle, Activity } from 'lucide-react';

import type {
  DivergenceTimeSeries,
  OracleLeadership,
  DivergencePair,
} from '@/lib/analytics/divergenceSignals';

import {
  LABELS,
  DivergenceStatsCards,
  TimeSeriesSection,
  LeadershipSection,
  DivergenceMatrixSection,
  FeedHealthSection,
} from './DivergenceSignalSections';

import type { DivergenceMode, FeedHealthScore } from './DivergenceSignalSections';

export type { FeedHealthScore } from './DivergenceSignalSections';

interface DivergenceSignalTabProps {
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  alertCount: number;
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingEntity: string | null;
  maxAcceleration: number;
  mode: DivergenceMode;
  getDisplayName: (key: string) => string;
  feedHealthScores?: FeedHealthScore[];
}

function DivergenceSignalTabComponent({
  timeSeries,
  leadership,
  divergenceMatrix,
  alertCount,
  acceleratingCount,
  directionalBiasCount,
  leadingEntity,
  maxAcceleration,
  mode,
  getDisplayName,
  feedHealthScores,
}: DivergenceSignalTabProps) {
  const labels = LABELS[mode];
  const sortedLeadership = [...leadership].sort((a, b) => a.lagSeconds - b.lagSeconds);
  const entityNames =
    divergenceMatrix.length > 0 ? divergenceMatrix.map((row) => row[0]?.providerA ?? '') : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">{labels.title}</span>
          </div>
          <p className="text-xs text-gray-500">{labels.subtitle}</p>
        </div>
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">
              {alertCount} Alert{alertCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {timeSeries.length === 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 text-center">
          <Activity className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">
            Insufficient Data for Divergence Analysis
          </p>
          <p className="text-xs text-blue-500 mt-1">{labels.emptyMessage}</p>
        </div>
      )}

      {timeSeries.length > 0 && timeSeries.every((ts) => ts.points.length < 3) && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <p className="text-xs text-amber-700">
            Limited data available — acceleration and directional bias detection require 3+ data
            points {labels.limitedDataSuffix}. Keep auto-refresh enabled to accumulate more data.
          </p>
        </div>
      )}

      <DivergenceStatsCards
        alertCount={alertCount}
        acceleratingCount={acceleratingCount}
        directionalBiasCount={directionalBiasCount}
        leadingEntity={leadingEntity}
        maxAcceleration={maxAcceleration}
        acceleratingLabel={labels.acceleratingLabel}
        directionalLabel={labels.directionalLabel}
        leadingLabel={labels.leadingLabel}
        getDisplayName={getDisplayName}
      />

      <TimeSeriesSection
        timeSeries={timeSeries}
        title={labels.timeSeriesTitle}
        getDisplayName={getDisplayName}
      />

      <LeadershipSection
        leadership={sortedLeadership}
        title={labels.leadershipTitle}
        getDisplayName={getDisplayName}
      />

      {divergenceMatrix.length > 0 && (
        <DivergenceMatrixSection
          divergenceMatrix={divergenceMatrix}
          entityNames={entityNames}
          title={labels.matrixTitle}
          getDisplayName={getDisplayName}
        />
      )}

      {feedHealthScores && feedHealthScores.length > 0 && (
        <FeedHealthSection
          feedHealthScores={feedHealthScores}
          title={labels.feedHealthTitle}
          getDisplayName={getDisplayName}
        />
      )}
    </div>
  );
}

export const DivergenceSignalTab = memo(DivergenceSignalTabComponent);
DivergenceSignalTab.displayName = 'DivergenceSignalTab';
