'use client';

import { memo } from 'react';

import { TrendingUp, AlertTriangle, Zap, Navigation, Grid3x3, Activity } from 'lucide-react';

import type {
  DivergenceTimeSeries,
  OracleLeadership,
  DivergencePair,
  DivergenceDirection,
  DivergenceAcceleration,
  LeadershipStatus,
} from '@/lib/analytics/divergenceSignals';

interface DivergenceSignalTabProps {
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  alertCount: number;
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

function getLeadershipBadge(status: LeadershipStatus): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case 'leading':
      return { label: 'Leading', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    case 'synchronized':
      return { label: 'Synchronized', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
    case 'lagging':
      return { label: 'Lagging', bgClass: 'bg-red-50', textClass: 'text-red-700' };
    default:
      return { label: 'Unknown', bgClass: 'bg-gray-50', textClass: 'text-gray-700' };
  }
}

function getAccelerationBadge(acceleration: DivergenceAcceleration): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (acceleration) {
    case 'accelerating':
      return { label: 'Accelerating', bgClass: 'bg-red-50', textClass: 'text-red-700' };
    case 'decelerating':
      return { label: 'Decelerating', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    case 'stable':
      return { label: 'Stable', bgClass: 'bg-gray-50', textClass: 'text-gray-600' };
    default:
      return { label: 'Unknown', bgClass: 'bg-gray-50', textClass: 'text-gray-700' };
  }
}

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

function DivergenceSignalTabComponent({
  timeSeries,
  leadership,
  divergenceMatrix,
  alertCount,
  acceleratingCount,
  directionalBiasCount,
  leadingOracle,
  maxAcceleration,
}: DivergenceSignalTabProps) {
  const sortedLeadership = [...leadership].sort((a, b) => a.lagSeconds - b.lagSeconds);

  const oracleNames =
    divergenceMatrix.length > 0 ? divergenceMatrix[0].map((p) => p.providerA) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Divergence Signals</span>
          </div>
          <p className="text-xs text-gray-500">
            Track how each oracle deviates from market consensus over time, detect accelerating
            deviations and directional bias
          </p>
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
          <p className="text-xs text-blue-500 mt-1">
            Divergence signals require at least 2 oracle providers with price history. Enable
            auto-refresh to accumulate data points over time.
          </p>
        </div>
      )}

      {timeSeries.length > 0 && timeSeries.every((ts) => ts.points.length < 3) && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <p className="text-xs text-amber-700">
            Limited data available — acceleration and directional bias detection require 3+ data
            points per oracle. Keep auto-refresh enabled to accumulate more data.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Alert Count</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 font-mono">{alertCount}</p>
          <p className="text-[10px] text-gray-400 mt-1">Divergence alerts triggered</p>
        </div>

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
            Oracles with accelerating deviation
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
          <p className="text-[10px] text-gray-400 mt-1">Oracles with directional bias</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Leading Oracle</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 font-mono">
            {leadingOracle ? capitalize(leadingOracle) : 'N/A'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Fastest response to market</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-700" />
          <span className="text-base font-semibold text-gray-900">Deviation Time Series</span>
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
                      {capitalize(ts.provider)}
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="w-5 h-5 text-gray-700" />
          <span className="text-base font-semibold text-gray-900">Oracle Response Leadership</span>
        </div>
        <div className="space-y-2">
          {sortedLeadership.map((oracle, index) => {
            const badge = getLeadershipBadge(oracle.status);
            const reliability =
              oracle.totalUpdates > 0 ? (oracle.firstResponseCount / oracle.totalUpdates) * 100 : 0;

            return (
              <div
                key={oracle.provider}
                className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {capitalize(oracle.provider)}
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
                        {oracle.avgLagSeconds.toFixed(2)}s
                      </span>
                    </span>
                    <span>
                      First response:{' '}
                      <span className="font-mono font-medium text-gray-700">
                        {oracle.firstResponseCount}/{oracle.totalUpdates}
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
          {sortedLeadership.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">No leadership data available</p>
          )}
        </div>
      </div>

      {divergenceMatrix.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Grid3x3 className="w-5 h-5 text-gray-700" />
            <span className="text-base font-semibold text-gray-900">
              Inter-Oracle Divergence Matrix
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500" />
                  {oracleNames.map((name) => (
                    <th
                      key={name}
                      className="px-2 py-1.5 text-center text-[10px] font-medium text-gray-500"
                    >
                      {capitalize(name)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {divergenceMatrix.map((row, rowIdx) => (
                  <tr key={oracleNames[rowIdx]} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 text-[10px] font-medium text-gray-700 whitespace-nowrap">
                      {capitalize(oracleNames[rowIdx])}
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
      )}
    </div>
  );
}

export const DivergenceSignalTab = memo(DivergenceSignalTabComponent);
DivergenceSignalTab.displayName = 'DivergenceSignalTab';
