import type { DivergenceAcceleration } from '@/lib/analytics/divergenceSignals';
import type { RhythmAnomalyType } from '@/lib/analytics/feedBehavior';
import type { LiquidityLevel } from '@/lib/analytics/liquidityAnalysis';
import type { RefreshInterval } from '@/types/common';
import { OracleProvider, Blockchain } from '@/types/oracle';

// Re-export types needed by components
export type { DivergenceAcceleration } from '@/lib/analytics/divergenceSignals';
export type { LiquidityLevel } from '@/lib/analytics/liquidityAnalysis';

// ── Threat Level ──
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

// ── Deviation Direction ──
export type DeviationDirection = 'positive' | 'negative' | 'neutral';

// ── Attack Signature (8 Dimensions) ──
export interface AttackSignature {
  /** Spot vs TWAP deviation percentage */
  spotTwapDeviation: number;
  /** Deviation direction */
  spotTwapDirection: DeviationDirection;
  /** Deviation acceleration */
  deviationAcceleration: DivergenceAcceleration;
  /** Cross-oracle agreement (0~1) */
  crossOracleAgreement: number;
  /** Directional bias consecutive count */
  directionalBiasCount: number;
  /** Whether heartbeat is anomalous */
  heartbeatAnomaly: boolean;
  /** Rhythm anomaly type */
  rhythmAnomaly: RhythmAnomalyType | null;
  /** Pool liquidity level (only available for TWAP provider) */
  liquidityLevel: LiquidityLevel;
  /** Liquidity change rate vs historical average */
  liquidityChangeRate: number;
  /** Whether liquidity drain detected */
  isLiquidityDrain: boolean;
  /** Liquidity drain severity (0~1) */
  drainSeverity: number;
  /** Price impact risk based on liquidity level (0~1) */
  priceImpactRisk: number;
  /** Pool state consistency deviation (sqrtPriceX96 vs tick) */
  consistencyDeviation: number;
  /** Whether pool state inconsistency detected */
  poolConsistencyAnomaly: boolean;
}

// ── Signature Scores (0~1 per dimension) ──
export interface SignatureScores {
  spotTwap: number;
  acceleration: number;
  agreement: number;
  directionalBias: number;
  heartbeat: number;
  liquidityDrain: number;
  liquidityLevel: number;
  poolConsistency: number;
}

// ── Alerts ──
export interface FlashLoanAlert {
  level: 'warning' | 'critical';
  provider: OracleProvider;
  message: string;
  deviation: number;
  timestamp: number;
}

// ── Detection Result ──
export interface FlashLoanDetectionResult {
  threatLevel: ThreatLevel;
  confidence: number;
  signature: AttackSignature;
  scores: SignatureScores;
  totalScore: number;
  alerts: FlashLoanAlert[];
  recommendation: string;
}

// ── Spot/TWAP Deviation Data Point ──
export interface SpotTwapDeviationPoint {
  timestamp: number;
  spotPrice: number;
  twapPrice: number;
  consensusPrice: number;
  deviationPercent: number;
  isOverThreshold: boolean;
}

// ── Oracle Deviation Entry ──
export interface OracleDeviationEntry {
  provider: OracleProvider;
  spotPrice: number;
  twapPrice: number;
  deviationPercent: number;
  direction: DeviationDirection;
  isOverThreshold: boolean;
}

// ── Control Panel State ──
export interface AttackDetectionConfig {
  symbol: string;
  chain: Blockchain;
  selectedOracles: OracleProvider[];
  twapWindowMinutes: number;
  refreshIntervalMs: RefreshInterval;
  customThresholds: {
    stablecoin: number;
    major: number;
    alt: number;
    micro: number;
  };
}

// ── Default Thresholds ──
export const DEFAULT_DEVIATION_THRESHOLDS = {
  stablecoin: 0.5,
  major: 2.0,
  alt: 5.0,
  micro: 10.0,
} as const;

// ── Default Config ──
export const DEFAULT_ATTACK_DETECTION_CONFIG: AttackDetectionConfig = {
  symbol: 'ETH',
  chain: Blockchain.ETHEREUM,
  selectedOracles: [
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.TWAP,
    OracleProvider.REDSTONE,
    OracleProvider.API3,
    OracleProvider.DIA,
    OracleProvider.WINKLINK,
    OracleProvider.SUPRA,
    OracleProvider.REFLECTOR,
    OracleProvider.FLARE,
  ],
  twapWindowMinutes: 30,
  refreshIntervalMs: 10000,
  customThresholds: { ...DEFAULT_DEVIATION_THRESHOLDS },
};

// ── Threat Level Config ──
export const THREAT_LEVEL_CONFIG: Record<
  ThreatLevel,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  low: {
    label: 'LOW',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: '✓',
  },
  medium: {
    label: 'MEDIUM',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: '⚠',
  },
  high: {
    label: 'HIGH',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '⚡',
  },
  critical: {
    label: 'CRITICAL',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '🔥',
  },
};
