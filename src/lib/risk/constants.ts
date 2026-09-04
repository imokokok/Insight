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
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    threshold: Infinity,
  },
};

export const STABLECOIN_RISK_THRESHOLDS = {
  warning: 0.25,
  critical: 1.0,
  severe: 3.0,
};

// Market (DEX) internal deviation thresholds — tighter than oracle thresholds
// because DEX prices reflect real market conditions
export const MARKET_RISK_THRESHOLDS = {
  warning: 0.15,
  critical: 0.5,
  severe: 2.0,
};

// Oracle-Market cross deviation thresholds
export const ORACLE_MARKET_RISK_THRESHOLDS = {
  warning: 0.2,
  critical: 0.75,
  severe: 2.5,
};

export const WRAPPED_ASSET_RISK_THRESHOLDS = {
  warning: 0.5,
  critical: 2.0,
  severe: 5.0,
};
