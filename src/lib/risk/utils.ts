import type { RiskLevel } from './types';

export function calculateFilteredMedian(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length <= 2) return median(values);

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;

  const filtered = values.filter((p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);

  return median(filtered.length > 0 ? filtered : values);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function percentile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

export function calculateDeviationPercent(price: number, reference: number): number {
  if (reference === 0) return 0;
  return ((price - reference) / reference) * 100;
}

export function getRiskLevel(
  deviationPercent: number,
  thresholds: { warning: number; critical: number; severe: number }
): RiskLevel {
  const abs = Math.abs(deviationPercent);
  if (abs >= thresholds.severe) return 'severe';
  if (abs >= thresholds.critical) return 'critical';
  if (abs >= thresholds.warning) return 'warning';
  return 'normal';
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}
