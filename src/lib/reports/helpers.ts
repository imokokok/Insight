import type { ProviderRanking, ReportRiskLevel } from './types';

export function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeJsonValue(v)])
    );
  }
  return value;
}

export function getSeverity(deviationPct: number): 'low' | 'medium' | 'high' | 'critical' {
  const absDev = Math.abs(deviationPct);
  if (absDev >= 2) return 'critical';
  if (absDev >= 1) return 'high';
  if (absDev >= 0.5) return 'medium';
  return 'low';
}

export function getDepegRiskLevel(absDeviation: number): ReportRiskLevel {
  if (absDeviation >= 3) return 'severe';
  if (absDeviation >= 1) return 'critical';
  if (absDeviation >= 0.5) return 'warning';
  return 'normal';
}

export function getWrappedPegRiskLevel(absDeviation: number): ReportRiskLevel {
  if (absDeviation >= 5) return 'severe';
  if (absDeviation >= 2) return 'critical';
  if (absDeviation >= 0.5) return 'warning';
  return 'normal';
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

export function scoreProvider(ranking: Omit<ProviderRanking, 'score'>): number {
  const successWeight = 30;
  const deviationWeight = 25;
  const latencyWeight = 20;
  const anomalyWeight = 15;
  const coverageWeight = 10;

  const successScore = ranking.successRate;
  const deviationScore = Math.max(0, 100 - (ranking.avgDeviationPct / 0.5) * 20);
  const latencyScore = Math.max(0, 100 - (ranking.avgLatencyMs / 1000) * 25);
  const anomalyScore = Math.max(0, 100 - ranking.anomalyCount * 5);
  const coverageScore = Math.min(100, (ranking.totalQueries / 24) * 100);

  return Number(
    (
      (successScore * successWeight +
        deviationScore * deviationWeight +
        latencyScore * latencyWeight +
        anomalyScore * anomalyWeight +
        coverageScore * coverageWeight) /
      100
    ).toFixed(2)
  );
}
