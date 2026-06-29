import type { RiskLevelConfig } from './types';

export const RISK_LEVELS: Record<string, RiskLevelConfig> = {
  normal: {
    label: 'Normal',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    threshold: 0.25,
  },
  warning: {
    label: 'Warning',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    threshold: 1.0,
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    threshold: 3.0,
  },
  severe: {
    label: 'Severe',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    threshold: Infinity,
  },
};

export const STABLECOIN_RISK_THRESHOLDS = {
  warning: 0.25,
  critical: 1.0,
  severe: 3.0,
};

export const WRAPPED_ASSET_RISK_THRESHOLDS = {
  warning: 0.5,
  critical: 2.0,
  severe: 5.0,
};
