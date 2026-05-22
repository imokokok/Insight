import { memo } from 'react';

import {
  type FreshnessStatus,
  getFreshnessColor,
  getHealthGrade,
  formatFreshness,
} from '../utils/freshnessUtils';

export const FreshnessIndicator = memo(function FreshnessIndicator({
  freshnessSeconds,
  freshnessStatus,
  expectedUpdateFreq,
  isRealtime,
}: {
  freshnessSeconds: number;
  freshnessStatus: FreshnessStatus;
  expectedUpdateFreq: number;
  isRealtime: boolean;
}) {
  const ratio = freshnessSeconds / expectedUpdateFreq;
  const progressPercent = Math.min(100, (ratio / 4) * 100);

  return (
    <td className="py-2.5 px-3">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          {isRealtime && freshnessStatus === 'fresh' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span
            className="text-xs font-medium font-mono"
            style={{ color: getFreshnessColor(freshnessStatus) }}
          >
            {formatFreshness(freshnessSeconds)}
          </span>
        </div>
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: getFreshnessColor(freshnessStatus),
            }}
          />
        </div>
        <span className="text-[9px] text-gray-400">{ratio.toFixed(1)}x expected</span>
      </div>
    </td>
  );
});

export const HealthRing = memo(function HealthRing({
  score,
  size = 80,
}: {
  score: number;
  size?: number;
}) {
  const grade = getHealthGrade(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={grade.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color: grade.color }}>
          {score}
        </span>
        <span className="text-[9px] text-gray-500">{grade.label}</span>
      </div>
    </div>
  );
});

export const DistributionBar = memo(function DistributionBar({
  stats,
}: {
  stats: {
    freshCount: number;
    normalCount: number;
    delayedCount: number;
    criticalCount: number;
    staleCount: number;
    total: number;
  };
}) {
  const { freshCount, normalCount, delayedCount, criticalCount, staleCount, total } = stats;

  return (
    <div className="space-y-2">
      <div className="h-3 flex rounded-full overflow-hidden bg-gray-200 shadow-inner">
        {freshCount > 0 && (
          <div
            className="bg-emerald-500 transition-all relative group"
            style={{ width: `${(freshCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {normalCount > 0 && (
          <div
            className="bg-blue-500 transition-all relative group"
            style={{ width: `${(normalCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {delayedCount > 0 && (
          <div
            className="bg-amber-500 transition-all relative group"
            style={{ width: `${(delayedCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-amber-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {criticalCount > 0 && (
          <div
            className="bg-orange-500 transition-all relative group"
            style={{ width: `${(criticalCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-orange-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {staleCount > 0 && (
          <div
            className="bg-red-500 transition-all relative group"
            style={{ width: `${(staleCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-red-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-600">
            Fresh <span className="font-medium text-emerald-700">{freshCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-gray-600">
            Normal <span className="font-medium text-blue-700">{normalCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-gray-600">
            Delayed <span className="font-medium text-amber-700">{delayedCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-gray-600">
            Critical <span className="font-medium text-orange-700">{criticalCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-600">
            Stale <span className="font-medium text-red-700">{staleCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
});
