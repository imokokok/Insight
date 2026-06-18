import {
  type ThreatLevel,
  type DeviationDirection,
  type AttackSignature,
  type SignatureScores,
  type FlashLoanAlert,
  type FlashLoanDetectionResult,
  DEFAULT_DEVIATION_THRESHOLDS,
} from '@/app/attack-detection/types';
import type { ConsensusResult } from '@/lib/analytics/consensusPrice';
import type { DivergenceSignalResult } from '@/lib/analytics/divergenceSignals';
import type { FeedBehaviorResult } from '@/lib/analytics/feedBehavior';
import type { LiquidityAnalysisResult } from '@/lib/analytics/liquidityAnalysis';
import { getSymbolCategory } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';
import type { OracleProvider } from '@/types/oracle';

const logger = createLogger('flashLoanDetection');

// ── Deviation thresholds by asset category ──
const DEVIATION_THRESHOLDS_PCT: Record<string, number> = {
  stablecoin: DEFAULT_DEVIATION_THRESHOLDS.stablecoin,
  major: DEFAULT_DEVIATION_THRESHOLDS.major,
  alt: DEFAULT_DEVIATION_THRESHOLDS.alt,
  micro: DEFAULT_DEVIATION_THRESHOLDS.micro,
};

function getDeviationThresholdPct(symbol: string): number {
  const category = getSymbolCategory(symbol);
  return DEVIATION_THRESHOLDS_PCT[category] ?? DEVIATION_THRESHOLDS_PCT.alt;
}

// ── Score weights (8 dimensions, optimized for liquidity manipulation detection) ──
const SCORE_WEIGHTS = {
  spotTwap: 0.15,
  acceleration: 0.1,
  agreement: 0.2,
  directionalBias: 0.05,
  heartbeat: 0.1,
  liquidityDrain: 0.15,
  liquidityLevel: 0.15,
  poolConsistency: 0.1,
} as const;

// ── Composite manipulation signal boost ──
const COMPOSITE_BOOST_MULTIPLIER = 1.3;
const COMPOSITE_BOOST_LIQUIDITY_RISK = 0.7;
const COMPOSITE_BOOST_AGREEMENT = 0.7;

// ── Input ──
export interface FlashLoanDetectionInput {
  symbol: string;
  oraclePrices: Array<{ provider: OracleProvider; price: number; timestamp: number }>;
  twapPrice: number;
  spotPrice: number;
  divergenceResult: DivergenceSignalResult;
  consensusResult: ConsensusResult;
  feedBehaviorResult: FeedBehaviorResult;
  liquidityAnalysis?: LiquidityAnalysisResult;
}

// ── Score deviation: map deviation % to 0~1 ──
function scoreDeviation(deviationPct: number, thresholdPct: number): number {
  if (thresholdPct <= 0) return 0;
  const ratio = Math.abs(deviationPct) / thresholdPct;
  // Below 50% threshold → 0, at threshold → 0.5, 2x threshold → 1
  return Math.min(1, Math.max(0, (ratio - 0.5) * 2));
}

// ── Overall confidence ──
function calculateConfidence(scores: SignatureScores): number {
  const values = Object.values(scores);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  // More data points → higher confidence
  const dataPoints = Object.values(scores).filter((v) => v > 0).length;
  const dataFactor = Math.min(1, dataPoints / 8);
  return Math.round(avg * dataFactor * 100) / 100;
}

// ── Generate alerts ──
function generateAlerts(
  input: FlashLoanDetectionInput,
  signature: AttackSignature,
  thresholdPct: number
): FlashLoanAlert[] {
  const alerts: FlashLoanAlert[] = [];
  const now = Date.now();
  const defaultProvider = input.oraclePrices[0]?.provider ?? ('chainlink' as OracleProvider);

  // Spot/TWAP deviation alert
  if (Math.abs(signature.spotTwapDeviation) > thresholdPct) {
    const isCritical = Math.abs(signature.spotTwapDeviation) > thresholdPct * 2;
    alerts.push({
      level: isCritical ? 'critical' : 'warning',
      provider: defaultProvider,
      message: `${input.symbol} Spot/TWAP deviation at ${signature.spotTwapDeviation > 0 ? '+' : ''}${signature.spotTwapDeviation.toFixed(2)}%, exceeding ${thresholdPct}% threshold`,
      deviation: signature.spotTwapDeviation,
      timestamp: now,
    });
  }

  // Acceleration alert
  if (signature.deviationAcceleration === 'accelerating') {
    alerts.push({
      level: 'critical',
      provider: defaultProvider,
      message: `${input.symbol} deviation is accelerating, possible oracle manipulation in progress`,
      deviation: signature.spotTwapDeviation,
      timestamp: now,
    });
  }

  // Agreement alert
  if (signature.crossOracleAgreement < 0.5) {
    alerts.push({
      level: 'warning',
      provider: defaultProvider,
      message: `Cross-oracle agreement at only ${(signature.crossOracleAgreement * 100).toFixed(1)}%, an oracle may be manipulated`,
      deviation: signature.spotTwapDeviation,
      timestamp: now,
    });
  }

  // Liquidity drain alert
  if (signature.isLiquidityDrain && signature.drainSeverity > 0.5) {
    alerts.push({
      level: signature.drainSeverity > 0.7 ? 'critical' : 'warning',
      provider: defaultProvider,
      message: `${input.symbol} pool liquidity dropped ${(signature.liquidityChangeRate * 100).toFixed(1)}%, possible liquidity drain before manipulation`,
      deviation: signature.spotTwapDeviation,
      timestamp: now,
    });
  }

  // Low liquidity + price deviation composite alert
  if (
    signature.priceImpactRisk >= COMPOSITE_BOOST_LIQUIDITY_RISK &&
    Math.abs(signature.spotTwapDeviation) > thresholdPct
  ) {
    alerts.push({
      level: 'critical',
      provider: defaultProvider,
      message: `${input.symbol} price deviation ${signature.spotTwapDeviation.toFixed(2)}% on ${signature.liquidityLevel} liquidity pool, high manipulation risk`,
      deviation: signature.spotTwapDeviation,
      timestamp: now,
    });
  }

  // Pool state inconsistency alert
  if (signature.poolConsistencyAnomaly) {
    alerts.push({
      level: 'warning',
      provider: defaultProvider,
      message: `${input.symbol} pool state inconsistency detected (sqrtPriceX96 vs tick deviation ${(signature.consistencyDeviation * 100).toFixed(2)}%)`,
      deviation: signature.spotTwapDeviation,
      timestamp: now,
    });
  }

  return alerts;
}

// ── Generate recommendation ──
function generateRecommendation(threatLevel: ThreatLevel, _signature: AttackSignature): string {
  switch (threatLevel) {
    case 'critical':
      return 'High-risk oracle manipulation detected! Check position liquidation risk immediately and pause new borrowing relying on this oracle.';
    case 'high':
      return 'Significant price anomaly detected, possible manipulation. Monitor position health closely and consider adding collateral.';
    case 'medium':
      return 'Minor price deviation detected, manipulation risk present. Continue monitoring and watch position safety buffer.';
    case 'low':
      return 'No anomalous manipulation detected. Oracle prices are operating normally.';
  }
}

// ── Core: Flash loan attack detection ──
export function detectFlashLoanAttack(input: FlashLoanDetectionInput): FlashLoanDetectionResult {
  try {
    const {
      symbol,
      twapPrice,
      spotPrice,
      divergenceResult,
      consensusResult,
      feedBehaviorResult,
      liquidityAnalysis,
    } = input;

    // 1. Calculate Spot/TWAP deviation
    const spotTwapDeviation = twapPrice > 0 ? ((spotPrice - twapPrice) / twapPrice) * 100 : 0;
    const spotTwapDirection: DeviationDirection =
      spotTwapDeviation > 0.01 ? 'positive' : spotTwapDeviation < -0.01 ? 'negative' : 'neutral';

    // 2. Get threshold
    const thresholdPct = getDeviationThresholdPct(symbol);

    // 3. Build 8-dimension attack signature
    const signature: AttackSignature = {
      spotTwapDeviation: Number(spotTwapDeviation.toFixed(4)),
      spotTwapDirection,
      deviationAcceleration: divergenceResult.acceleratingCount > 0 ? 'accelerating' : 'stable',
      crossOracleAgreement: consensusResult.agreement,
      directionalBiasCount: divergenceResult.directionalBiasCount,
      heartbeatAnomaly: feedBehaviorResult.heartbeatLostCount > 0,
      rhythmAnomaly: feedBehaviorResult.anomalyCount > 0 ? 'sudden_speedup' : null,
      liquidityLevel: liquidityAnalysis?.liquidityLevel ?? 'deep',
      liquidityChangeRate: liquidityAnalysis?.liquidityChangeRate ?? 0,
      isLiquidityDrain: liquidityAnalysis?.isLiquidityDrain ?? false,
      drainSeverity: liquidityAnalysis?.drainSeverity ?? 0,
      priceImpactRisk: liquidityAnalysis?.priceImpactRisk ?? 0,
      consistencyDeviation: liquidityAnalysis?.consistencyDeviation ?? 0,
      poolConsistencyAnomaly: liquidityAnalysis?.hasInconsistency ?? false,
    };

    // 4. Score each dimension
    const scores: SignatureScores = {
      spotTwap: scoreDeviation(spotTwapDeviation, thresholdPct),
      acceleration: signature.deviationAcceleration === 'accelerating' ? 1 : 0,
      agreement: 1 - signature.crossOracleAgreement,
      directionalBias: Math.min(signature.directionalBiasCount / 3, 1),
      heartbeat: signature.heartbeatAnomaly ? 1 : 0,
      liquidityDrain: signature.drainSeverity,
      liquidityLevel: signature.priceImpactRisk,
      poolConsistency: signature.poolConsistencyAnomaly ? 1 : 0,
    };

    // 5. Weighted overall score
    const totalScore = Number(
      (
        scores.spotTwap * SCORE_WEIGHTS.spotTwap +
        scores.acceleration * SCORE_WEIGHTS.acceleration +
        scores.agreement * SCORE_WEIGHTS.agreement +
        scores.directionalBias * SCORE_WEIGHTS.directionalBias +
        scores.heartbeat * SCORE_WEIGHTS.heartbeat +
        scores.liquidityDrain * SCORE_WEIGHTS.liquidityDrain +
        scores.liquidityLevel * SCORE_WEIGHTS.liquidityLevel +
        scores.poolConsistency * SCORE_WEIGHTS.poolConsistency
      ).toFixed(4)
    );

    // 5.5 Composite manipulation signal boost:
    // When low liquidity + Spot/TWAP deviation + cross-source divergence co-occur,
    // this is a strong manipulation signal (USTRY/Sharwa pattern)
    let adjustedScore = totalScore;
    if (liquidityAnalysis) {
      const compositeManipulationSignal =
        liquidityAnalysis.priceImpactRisk >= COMPOSITE_BOOST_LIQUIDITY_RISK &&
        Math.abs(spotTwapDeviation) > thresholdPct &&
        signature.crossOracleAgreement < COMPOSITE_BOOST_AGREEMENT;
      if (compositeManipulationSignal) {
        adjustedScore = Math.min(1, totalScore * COMPOSITE_BOOST_MULTIPLIER);
      }
    }

    // 6. Map to threat level
    let threatLevel: ThreatLevel;
    if (adjustedScore < 0.2) {
      threatLevel = 'low';
    } else if (adjustedScore < 0.4) {
      threatLevel = 'medium';
    } else if (adjustedScore < 0.65) {
      threatLevel = 'high';
    } else {
      threatLevel = 'critical';
    }

    // 7. Generate alerts
    const alerts = generateAlerts(input, signature, thresholdPct);

    // 8. Generate recommendation
    const recommendation = generateRecommendation(threatLevel, signature);

    // 9. Calculate confidence
    const confidence = calculateConfidence(scores);

    logger.info(
      `Flash loan detection for ${symbol}: threat=${threatLevel}, score=${adjustedScore}, spotTwapDev=${spotTwapDeviation.toFixed(2)}%, liqLevel=${signature.liquidityLevel}, drain=${signature.isLiquidityDrain}`
    );

    return {
      threatLevel,
      confidence,
      signature,
      scores,
      totalScore: adjustedScore,
      alerts,
      recommendation,
    };
  } catch (error) {
    logger.error(
      'Failed to detect flash loan attack',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      threatLevel: 'low',
      confidence: 0,
      signature: {
        spotTwapDeviation: 0,
        spotTwapDirection: 'neutral',
        deviationAcceleration: 'stable',
        crossOracleAgreement: 1,
        directionalBiasCount: 0,
        heartbeatAnomaly: false,
        rhythmAnomaly: null,
        liquidityLevel: 'deep',
        liquidityChangeRate: 0,
        isLiquidityDrain: false,
        drainSeverity: 0,
        priceImpactRisk: 0,
        consistencyDeviation: 0,
        poolConsistencyAnomaly: false,
      },
      scores: {
        spotTwap: 0,
        acceleration: 0,
        agreement: 0,
        directionalBias: 0,
        heartbeat: 0,
        liquidityDrain: 0,
        liquidityLevel: 0,
        poolConsistency: 0,
      },
      totalScore: 0,
      alerts: [],
      recommendation: 'Detection system error, unable to assess. Please try again later.',
    };
  }
}

// ── Calculate per-oracle vs TWAP deviations ──
export function calculateOracleTwapDeviations(
  oraclePrices: Array<{ provider: OracleProvider; price: number; timestamp: number }>,
  twapPrice: number,
  symbol: string
): Array<{
  provider: OracleProvider;
  spotPrice: number;
  twapPrice: number;
  deviationPercent: number;
  direction: DeviationDirection;
  isOverThreshold: boolean;
}> {
  const threshold = getDeviationThresholdPct(symbol);

  return oraclePrices.map(({ provider, price }) => {
    const deviationPercent = twapPrice > 0 ? ((price - twapPrice) / twapPrice) * 100 : 0;
    const direction: DeviationDirection =
      deviationPercent > 0.01 ? 'positive' : deviationPercent < -0.01 ? 'negative' : 'neutral';

    return {
      provider,
      spotPrice: price,
      twapPrice,
      deviationPercent: Number(deviationPercent.toFixed(4)),
      direction,
      isOverThreshold: Math.abs(deviationPercent) > threshold,
    };
  });
}
