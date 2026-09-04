import { getTimeAgoDiff, formatTimeAgoWithColor } from '@/lib/utils/timestamp';

interface ScoreThresholds {
  excellent: number;
  good: number;
  poor: number;
  critical?: number;
}

const DEFAULT_SCORE_THRESHOLDS: ScoreThresholds = { excellent: 80, good: 60, poor: 40 };

export function getScoreColor(
  score: number,
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): string {
  if (score >= thresholds.excellent) return '#10b981';
  if (score >= thresholds.good) return '#3b82f6';
  if (score >= thresholds.poor) return '#f59e0b';
  if (thresholds.critical !== undefined && score >= thresholds.critical) return '#f97316';
  return '#ef4444';
}

export function getScoreBadge(
  score: number,
  thresholds: ScoreThresholds = DEFAULT_SCORE_THRESHOLDS
): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  if (thresholds.critical !== undefined) {
    if (score >= thresholds.excellent)
      return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
    if (score >= thresholds.good)
      return { label: 'Good', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
    if (score >= thresholds.poor)
      return { label: 'Fair', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
    if (score >= thresholds.critical)
      return { label: 'Poor', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
    return { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' };
  }
  if (score >= thresholds.excellent)
    return { label: 'Healthy', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= thresholds.good)
    return { label: 'Fair', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= thresholds.poor)
    return { label: 'Degraded', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  return { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' };
}

export type CredibilityLevel = 'high' | 'medium' | 'low' | 'unverified';

interface CredibilityConfig {
  level: CredibilityLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export function getCredibilityFromScore(score: number): CredibilityConfig {
  if (score >= 85) {
    return {
      level: 'high',
      label: 'High',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'Proven track record with excellent accuracy and reliability',
    };
  }
  if (score >= 60) {
    return {
      level: 'medium',
      label: 'Medium',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Reliable provider with consistent performance',
    };
  }
  if (score > 0) {
    return {
      level: 'low',
      label: 'Low',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      description: 'Limited data or below-average performance metrics',
    };
  }
  return {
    level: 'unverified',
    label: 'Unverified',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Insufficient data to establish credibility rating',
  };
}

export function getCredibilityFromVerification(
  hasOnChainVerification: boolean,
  confidence?: number
): CredibilityConfig {
  if (hasOnChainVerification && (confidence ?? 0) >= 0.9) {
    return {
      level: 'high',
      label: 'High',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'On-chain verified with high confidence',
    };
  }
  if (hasOnChainVerification) {
    return {
      level: 'medium',
      label: 'Medium',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'On-chain verified',
    };
  }
  if ((confidence ?? 0) >= 0.7) {
    return {
      level: 'medium',
      label: 'Medium',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'High confidence data source',
    };
  }
  return {
    level: 'unverified',
    label: 'Unverified',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Insufficient verification data',
  };
}

export function formatTimeAgo(isoString: string | null): { text: string; color: string } | null {
  if (!isoString) return null;
  return formatTimeAgoWithColor(getTimeAgoDiff(new Date(isoString)));
}

export const SCORE_WEIGHTS = [
  { key: 'accuracy', label: 'Accuracy', weight: 30, color: '#3b82f6' },
  { key: 'uptime', label: 'Uptime', weight: 20, color: '#10b981' },
  { key: 'reliability', label: 'Reliability', weight: 20, color: '#2563eb' },
  { key: 'freshness', label: 'Freshness', weight: 15, color: '#f59e0b' },
  { key: 'latency', label: 'Latency', weight: 10, color: '#06b6d4' },
  { key: 'deviation', label: 'Deviation', weight: 5, color: '#f43f5e' },
] as const;

export function calculateLatencyScore(avgLatencyMs: number, baseline: number = 1000): number {
  if (avgLatencyMs <= 0) return 85;
  if (avgLatencyMs <= baseline) {
    return 85 + 15 * (1 - avgLatencyMs / baseline);
  }
  const excessRatio = (avgLatencyMs - baseline) / baseline;
  const penalty = Math.min(excessRatio * 28, 55);
  return Math.max(25, 85 - penalty);
}

export function calculateDeviationScore(avgDeviationPct: number): number {
  if (avgDeviationPct <= 0.1) return 100;
  if (avgDeviationPct <= 0.5) return 95 - ((avgDeviationPct - 0.1) / 0.4) * 15;
  if (avgDeviationPct <= 1.0) return 80 - ((avgDeviationPct - 0.5) / 0.5) * 25;
  if (avgDeviationPct <= 2.0) return 55 - ((avgDeviationPct - 1.0) / 1.0) * 30;
  return Math.max(10, 25 - (avgDeviationPct - 2.0) * 5);
}

// ------------------------------------------------------------------
// Tailwind class helpers for metric pills
// ------------------------------------------------------------------
// These replace the previous inline `style={{ color, backgroundColor }}`
// patterns (with hex-alpha string concatenation like `${color}15`) used in
// the reputation comparison table. Returning Tailwind class tuples keeps
// the styling system consistent and themeable.

export interface PillStyle {
  textClass: string;
  bgClass: string;
}

/**
 * Returns Tailwind pill classes for a latency value, mirroring the
 * getScoreColor thresholds (excellent / good / poor / critical).
 * `score` is the latency-derived score (100 - latency/20 in the caller).
 */
export function getLatencyPillClass(score: number): PillStyle {
  if (score >= 80) return { textClass: 'text-emerald-700', bgClass: 'bg-emerald-50' };
  if (score >= 60) return { textClass: 'text-blue-700', bgClass: 'bg-blue-50' };
  if (score >= 40) return { textClass: 'text-amber-700', bgClass: 'bg-amber-50' };
  return { textClass: 'text-red-700', bgClass: 'bg-red-50' };
}

/**
 * Returns Tailwind pill classes for a deviation percentage.
 * > 0.5% is considered elevated risk (red), otherwise healthy (emerald).
 */
export function getDeviationPillClass(avgDeviationPct: number): PillStyle {
  if (avgDeviationPct > 0.5) {
    return { textClass: 'text-red-700', bgClass: 'bg-red-50' };
  }
  return { textClass: 'text-emerald-700', bgClass: 'bg-emerald-50' };
}
