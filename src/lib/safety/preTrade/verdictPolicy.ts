/** Dependency-free verdict thresholds and helpers for pre-trade assessment. */

import { HARD_STALE_BLOCK_SECONDS } from '@/lib/oracles/feedCadence';

import type { SafetyVerdict } from './contracts';

export interface ThresholdSet {
  caution: number;
  danger: number;
  block: number;
}

export const PRE_TRADE_THRESHOLDS = {
  maxProviderDeviationPct: { caution: 1.0, danger: 3.0, block: 8.0 } as ThresholdSet,
  crossProviderSpreadPct: { caution: 0.5, danger: 2.0, block: 5.0 } as ThresholdSet,
  // Cadence-relative staleness only cautions. `block` remains the absolute
  // seven-day backstop for feeds that are genuinely stuck.
  dataStaleSeconds: { caution: 60, danger: 180, block: HARD_STALE_BLOCK_SECONDS } as ThresholdSet,
  crossProviderAgreement: { caution: 0.95, danger: 0.85, block: 0.7 } as ThresholdSet,
  stablecoinDepegPct: { caution: 0.3, danger: 1.0, block: 3.0 } as ThresholdSet,
} as const;

const VERDICT_RANK: Record<SafetyVerdict, number> = {
  PASS: 0,
  CAUTION: 1,
  DANGER: 2,
  BLOCK: 3,
};

export type RuleVerdict = Exclude<SafetyVerdict, 'PASS'>;

export function pickWorst(current: SafetyVerdict, candidate: SafetyVerdict): SafetyVerdict {
  return VERDICT_RANK[candidate] > VERDICT_RANK[current] ? candidate : current;
}

export function evaluateHighIsBad(
  value: number,
  thresholds: ThresholdSet,
  absolute = false
): RuleVerdict | null {
  const normalizedValue = absolute ? Math.abs(value) : value;
  if (normalizedValue >= thresholds.block) return 'BLOCK';
  if (normalizedValue >= thresholds.danger) return 'DANGER';
  if (normalizedValue >= thresholds.caution) return 'CAUTION';
  return null;
}

export function evaluateLowIsBad(value: number, thresholds: ThresholdSet): RuleVerdict | null {
  if (value <= thresholds.block) return 'BLOCK';
  if (value <= thresholds.danger) return 'DANGER';
  if (value <= thresholds.caution) return 'CAUTION';
  return null;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalize(value: number, maximum: number): number {
  if (maximum <= 0) return 0;
  return clamp01(value / maximum);
}
