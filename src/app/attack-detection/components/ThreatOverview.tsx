'use client';

import { CheckCircle, AlertTriangle, TrendingDown, Shield, Activity, Gauge } from 'lucide-react';

import { cn } from '@/lib/utils';

import { THREAT_LEVEL_CONFIG } from '../types/index';

import type { ThreatLevel, DivergenceAcceleration } from '../types/index';

// ── Acceleration config ──
const ACCELERATION_CONFIG: Record<
  DivergenceAcceleration,
  { label: string; icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  stable: {
    label: 'Stable',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  accelerating: {
    label: 'Accelerating',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  decelerating: {
    label: 'Decelerating',
    icon: TrendingDown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
};

interface ThreatOverviewProps {
  threatLevel: ThreatLevel;
  activeAlertCount: number;
  maxDeviation: number;
  acceleration: DivergenceAcceleration;
  confidence: number;
}

export function ThreatOverview({
  threatLevel,
  activeAlertCount,
  maxDeviation,
  acceleration,
  confidence,
}: ThreatOverviewProps) {
  const threatConfig = THREAT_LEVEL_CONFIG[threatLevel];
  const accelConfig = ACCELERATION_CONFIG[acceleration];
  const AccelIcon = accelConfig.icon;

  const deviationColor =
    maxDeviation > 5 ? 'text-red-600' : maxDeviation > 2 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Threat Level */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Threat Level
          </span>
        </div>
        <span
          className={cn(
            'inline-flex items-center px-3 py-1.5 text-sm font-bold rounded-md border',
            threatConfig.bgColor,
            threatConfig.color,
            threatConfig.borderColor
          )}
        >
          {threatConfig.icon} {threatConfig.label}
        </span>
        <div className="mt-2 text-xs text-gray-400">
          Confidence: {(confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Active Alerts
          </span>
        </div>
        <span className="text-2xl font-bold text-gray-900 font-mono">{activeAlertCount}</span>
        {activeAlertCount > 0 && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-600 rounded">
            ACTIVE
          </span>
        )}
      </div>

      {/* Max Deviation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Gauge className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Max Deviation
          </span>
        </div>
        <span className={cn('text-2xl font-bold font-mono', deviationColor)}>
          {maxDeviation.toFixed(2)}%
        </span>
        <div className="mt-1 flex items-center gap-1">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              maxDeviation > 5 ? 'bg-red-500' : maxDeviation > 2 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
          <span className="text-xs text-gray-400">Spot / TWAP</span>
        </div>
      </div>

      {/* Acceleration */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Acceleration
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-md',
              accelConfig.bgColor,
              accelConfig.color
            )}
          >
            <AccelIcon className="w-4 h-4" />
            {accelConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}
