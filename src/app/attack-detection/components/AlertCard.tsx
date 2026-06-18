'use client';

import { THREAT_LEVEL_CONFIG } from '../types';

import type { AlertRecord } from '../types';

interface AlertCardProps {
  alert: AlertRecord;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function AlertCard({ alert }: AlertCardProps) {
  const levelConfig = THREAT_LEVEL_CONFIG[alert.threatLevel];
  const borderColor = alert.level === 'critical' ? 'border-l-red-500' : 'border-l-amber-500';

  return (
    <div className={`bg-white rounded-lg border-l-4 ${borderColor} shadow-sm p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${levelConfig.color} ${levelConfig.bgColor} ${levelConfig.borderColor} border`}
        >
          {levelConfig.icon} {levelConfig.label}
        </span>
        <span className="text-xs text-gray-400">{formatTimestamp(alert.startedAt)}</span>
      </div>

      {/* Body */}
      <div className="space-y-1 text-sm">
        <p className="text-gray-800 font-medium">
          {alert.symbol}@{alert.chain}
        </p>
        <p className="text-gray-500">{alert.provider}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
          <span>
            Deviation:{' '}
            <span className="font-medium text-gray-800">{alert.spotTwapDeviation.toFixed(2)}%</span>
          </span>
          <span>
            Acceleration:{' '}
            <span className="font-medium text-gray-800">
              {alert.deviationAcceleration === 'accelerating'
                ? 'Accelerating'
                : alert.deviationAcceleration === 'decelerating'
                  ? 'Decelerating'
                  : 'Stable'}
            </span>
          </span>
          <span>
            Agreement:{' '}
            <span className="font-medium text-gray-800">
              {(alert.crossOracleAgreement * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        {alert.resolvedAt && alert.durationSeconds != null ? (
          <span className="text-xs text-gray-400">
            Duration: {formatDuration(alert.durationSeconds)}
          </span>
        ) : (
          <span className="text-xs text-amber-500 font-medium">Active</span>
        )}
        <a href="#" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
          View Details
        </a>
      </div>
    </div>
  );
}
