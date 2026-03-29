export const BASE_TIMESTAMP = 1700000000000;
export const DEFAULT_WIN_PRICE = 0.00012;

export const RISK_TREND_DATA = [3.2, 3.0, 2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.5, 2.5, 2.5, 2.5] as const;

export const STAKING_SCENARIOS = {
  conservative: { label: 'Conservative', apy: 8.5, color: '#60a5fa', description: 'Lower risk, stable returns' },
  moderate: { label: 'Moderate', apy: 12.5, color: '#3b82f6', description: 'Balanced risk and reward' },
  optimistic: { label: 'Optimistic', apy: 16.0, color: '#1d4ed8', description: 'Higher risk, potential for greater returns' },
} as const;

export const DEVIATION_THRESHOLDS = {
  excellent: 0.1,
  warning: 0.5,
} as const;

export const RELIABILITY_THRESHOLDS = {
  excellent: 99.5,
  good: 98,
  warning: 95,
} as const;
