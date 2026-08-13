import {
  type OracleProvider,
  type PriceData,
  OracleProvider as OracleProviderEnum,
} from '@/types/oracle';

export type FreshnessStatus = 'fresh' | 'normal' | 'delayed' | 'critical' | 'stale';

export interface DataSourceInfo {
  key: string;
  provider: string;
  providerKey: OracleProvider;
  chain: string;
  price: number;
  priceDeviation: number;
  priceDeviationPercent: number;
  timestamp: number;
  freshnessSeconds: number;
  freshnessStatus: FreshnessStatus;
  freshnessScore: number;
  reliability: number;
  confidence: number;
  expectedUpdateFreq: number;
  healthScore: number;
  healthFactors: {
    freshness: number;
    reliability: number;
    consistency: number;
    confidence: number;
  };
  updateLagRatio: number;
  isRealtime: boolean;
}

interface FreshnessThresholds {
  fresh: number;
  normal: number;
  delayed: number;
  critical: number;
}

const HEALTH_WEIGHTS = {
  FRESHNESS: 0.4,
  RELIABILITY: 0.3,
  CONSISTENCY: 0.2,
  CONFIDENCE: 0.1,
};

export const ORACLE_UPDATE_FREQUENCIES: Record<OracleProvider, number> = {
  redstone: 1,
  switchboard: 1,
  supra: 60,
  flare: 90,
  reflector: 300,
  twap: 600,
  winklink: 1800,
  chainlink: 3600,
  api3: 3600,
  dia: 3600,
};

export const REALTIME_ORACLES: OracleProvider[] = [OracleProviderEnum.REDSTONE];

export function getDynamicThresholds(
  expectedUpdateFreq: number,
  isRealtime: boolean = false
): FreshnessThresholds {
  if (isRealtime) {
    return {
      fresh: expectedUpdateFreq * 5,
      normal: expectedUpdateFreq * 15,
      delayed: expectedUpdateFreq * 30,
      critical: expectedUpdateFreq * 60,
    };
  }
  return {
    fresh: expectedUpdateFreq * 0.5,
    normal: expectedUpdateFreq * 1.0,
    delayed: expectedUpdateFreq * 2.0,
    critical: expectedUpdateFreq * 4.0,
  };
}

export function getFreshnessStatus(
  seconds: number,
  thresholds: FreshnessThresholds
): FreshnessStatus {
  if (seconds <= thresholds.fresh) return 'fresh';
  if (seconds <= thresholds.normal) return 'normal';
  if (seconds <= thresholds.delayed) return 'delayed';
  if (seconds <= thresholds.critical) return 'critical';
  return 'stale';
}

export function getFreshnessColor(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return '#10b981';
    case 'normal':
      return '#3b82f6';
    case 'delayed':
      return '#f59e0b';
    case 'critical':
      return '#f97316';
    case 'stale':
      return '#ef4444';
  }
}

export function calculateFreshnessScore(
  seconds: number,
  expectedUpdateFreq: number,
  isRealtime: boolean
): number {
  const ratio = seconds / expectedUpdateFreq;

  if (isRealtime) {
    if (ratio <= 5) return 100 - (ratio / 5) * 10;
    if (ratio <= 15) return 90 - ((ratio - 5) / 10) * 20;
    if (ratio <= 30) return 70 - ((ratio - 15) / 15) * 30;
    if (ratio <= 60) return 40 - ((ratio - 30) / 30) * 25;
    return Math.max(0, 15 - (ratio - 60) * 1.5);
  }

  const decayRate = 0.5;
  const score = 100 * Math.exp(-decayRate * ratio);
  return Math.max(0, Math.min(100, Math.round(score)));
}

const CONSISTENCY_SCORE_BANDS: ReadonlyArray<{ max: number; score: number }> = [
  { max: 0.1, score: 100 },
  { max: 0.3, score: 95 },
  { max: 0.5, score: 90 },
  { max: 1, score: 70 },
  { max: 2, score: 50 },
  { max: 5, score: 30 },
];

function calculateConsistencyScore(deviationPercent: number): number {
  const absDeviation = Math.abs(deviationPercent);
  for (const band of CONSISTENCY_SCORE_BANDS) {
    if (absDeviation < band.max) return band.score;
  }
  return 10;
}

export function calculateConfidenceScore(priceData: PriceData): number {
  if (priceData.confidence !== undefined && priceData.confidence !== null) {
    if (priceData.confidence <= 1) {
      return Math.round(priceData.confidence * 100);
    }
    return Math.min(100, Math.max(0, priceData.confidence));
  }
  return 95;
}

export function calculateHealthScore(
  freshnessScore: number,
  reliability: number,
  priceDeviationPercent: number,
  confidence: number,
  hasMultipleSources: boolean
): { score: number; factors: DataSourceInfo['healthFactors'] } {
  const consistencyScore = hasMultipleSources
    ? calculateConsistencyScore(priceDeviationPercent)
    : 100;

  let totalScore =
    freshnessScore * HEALTH_WEIGHTS.FRESHNESS +
    reliability * HEALTH_WEIGHTS.RELIABILITY +
    consistencyScore * HEALTH_WEIGHTS.CONSISTENCY +
    confidence * HEALTH_WEIGHTS.CONFIDENCE;

  if (!hasMultipleSources) {
    totalScore =
      freshnessScore * (HEALTH_WEIGHTS.FRESHNESS + HEALTH_WEIGHTS.CONSISTENCY / 2) +
      reliability * HEALTH_WEIGHTS.RELIABILITY +
      confidence * (HEALTH_WEIGHTS.CONFIDENCE + HEALTH_WEIGHTS.CONSISTENCY / 2);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(totalScore))),
    factors: {
      freshness: freshnessScore,
      reliability,
      consistency: consistencyScore,
      confidence,
    },
  };
}

const HEALTH_GRADES: ReadonlyArray<{ min: number; label: string; color: string; level: number }> = [
  { min: 90, label: 'Excellent', color: '#10b981', level: 5 },
  { min: 80, label: 'Good', color: '#3b82f6', level: 4 },
  { min: 70, label: 'Fair', color: '#f59e0b', level: 3 },
  { min: 50, label: 'Poor', color: '#f97316', level: 2 },
];

export function getHealthGrade(score: number): { label: string; color: string; level: number } {
  for (const grade of HEALTH_GRADES) {
    if (score >= grade.min) return { label: grade.label, color: grade.color, level: grade.level };
  }
  return { label: 'Critical', color: '#ef4444', level: 1 };
}

export function formatFreshness(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatExpectedFrequency(seconds: number): string {
  if (seconds <= 1) return 'Real-time';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}
