import { semanticColors } from '@/lib/config/colors';

export function getScoreColor(score: number): string {
  if (score >= 90) return semanticColors.success.DEFAULT;
  if (score >= 75) return semanticColors.info.DEFAULT;
  if (score >= 60) return semanticColors.warning.DEFAULT;
  if (score >= 40) return '#f97316';
  return semanticColors.danger.DEFAULT;
}

export function getScoreBadge(score: number): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  if (score >= 90)
    return { label: 'Excellent', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' };
  if (score >= 75) return { label: 'Good', bgClass: 'bg-blue-50', textClass: 'text-blue-700' };
  if (score >= 60) return { label: 'Fair', bgClass: 'bg-amber-50', textClass: 'text-amber-700' };
  if (score >= 40) return { label: 'Poor', bgClass: 'bg-orange-50', textClass: 'text-orange-700' };
  return { label: 'Unrated', bgClass: 'bg-gray-50', textClass: 'text-gray-500' };
}

export type CredibilityLevel = 'high' | 'medium' | 'low' | 'unverified';

export interface CredibilityConfig {
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
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return { text: 'just now', color: 'text-emerald-600' };
  if (minutes < 60) return { text: `${minutes}m ago`, color: 'text-emerald-600' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `${hours}h ago`, color: 'text-gray-500' };
  const days = Math.floor(hours / 24);
  return { text: `${days}d ago`, color: 'text-gray-400' };
}

export const SCORE_WEIGHTS = [
  { key: 'accuracy', label: 'Accuracy', weight: 30, color: '#3b82f6' },
  { key: 'uptime', label: 'Uptime', weight: 20, color: '#10b981' },
  { key: 'reliability', label: 'Reliability', weight: 20, color: '#8b5cf6' },
  { key: 'freshness', label: 'Freshness', weight: 15, color: '#f59e0b' },
  { key: 'latency', label: 'Latency', weight: 10, color: '#06b6d4' },
  { key: 'deviation', label: 'Deviation', weight: 5, color: '#f43f5e' },
] as const;

export function calculateLatencyScore(
  avgLatencyMs: number,
  baseline: number = 1000,
  providerType: 'onchain' | 'api' = 'api'
): number {
  if (avgLatencyMs <= 0) return 95;
  if (avgLatencyMs <= baseline) {
    return 85 + 15 * (1 - avgLatencyMs / baseline);
  }
  const excessRatio = (avgLatencyMs - baseline) / baseline;
  const maxPenalty = providerType === 'onchain' ? 50 : 60;
  const penalty = Math.min(excessRatio * (providerType === 'onchain' ? 25 : 30), maxPenalty);
  return Math.max(25, 85 - penalty);
}

export function calculateDeviationScore(avgDeviationPct: number): number {
  if (avgDeviationPct <= 0.1) return 100;
  if (avgDeviationPct <= 0.5) return 95 - ((avgDeviationPct - 0.1) / 0.4) * 15;
  if (avgDeviationPct <= 1.0) return 80 - ((avgDeviationPct - 0.5) / 0.5) * 25;
  if (avgDeviationPct <= 2.0) return 55 - ((avgDeviationPct - 1.0) / 1.0) * 30;
  return Math.max(10, 25 - (avgDeviationPct - 2.0) * 5);
}

export function calculateOverallScore(params: {
  accuracy: number;
  uptime: number;
  reliability: number;
  freshness: number;
  latencyScore: number;
  deviationScore: number;
}): number {
  const overall =
    params.accuracy * 0.3 +
    params.uptime * 0.2 +
    params.reliability * 0.2 +
    params.freshness * 0.15 +
    params.latencyScore * 0.1 +
    params.deviationScore * 0.05;
  return Math.min(100, Math.max(0, overall));
}
