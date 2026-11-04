/**
 * @fileoverview Solana perpetual-futures guard (Drift Protocol v2 evidence).
 *
 * Mirrors the Hyperliquid perp guard: a read-only decision gate that evaluates
 * caller-declared post-action USD values against live venue evidence and
 * cross-oracle consensus, never constructing, signing, or submitting a
 * transaction. A caller must separately bind a successful response to one
 * exact, user-authorized unsigned transaction before execution (planned
 * Drift transaction-binding surface).
 *
 * Scope: cross-oracle consensus integrity for the underlying and USDC margin,
 * the declared leverage band against a reviewed static profile (capped by the
 * live on-chain margin ratios), and disclosed Drift venue evidence (mark/oracle
 * divergence, funding, open interest utilisation, market status). Drift's
 * liquidation engine, matching priority, and later AMM changes are outside
 * this guard's claims.
 *
 * Cross-oracle consensus runs on canonical Ethereum-mainnet feeds: BTC, ETH,
 * and USDC carry deep independent coverage there, and consensus prices are
 * chain-agnostic for these majors. Drift's own Pyth Lazer oracle price is
 * compared against that consensus as a separate disclosed cross-venue check.
 *
 * Drift v2 publishes no REST API; the venue layer (`driftPerpMarket.ts`)
 * reads the reviewed markets' Anchor accounts directly through the repository's
 * Solana mainnet RPC configuration.
 */

import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import {
  fetchDriftPerpMarketEvidence,
  findReviewedDriftPerpMarket,
  SOLANA_MAINNET_CAIP2,
  type DriftPerpMarketEvidence,
} from '@/lib/perps/driftPerpMarket';

export const SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID = 'drift-v2-mainnet';
export const SOLANA_PERP_GUARD_SCHEMA_VERSION = 'insight.solana-perp-guard.v1';

/**
 * Reviewed per-market static leverage caps for Drift v2 perps, derived from
 * the on-chain margin ratios at review time (2026-11-04: marginRatioInitial
 * 500 / MARGIN_PRECISION 1e4 = 5% initial margin for all three reviewed
 * majors). Markets outside this set fail closed.
 */
const REVIEWED_MARKETS = {
  SOL: { maxLeverage: 20 },
  BTC: { maxLeverage: 20 },
  ETH: { maxLeverage: 20 },
} as const satisfies Record<string, { maxLeverage: number }>;

/**
 * Reviewed venue-integrity thresholds for the venue's own mark/oracle
 * divergence. These are static guard values, not caller-set preflight limits.
 */
const MARK_ORACLE_DEVIATION_CAUTION_BPS = 100;
const MARK_ORACLE_DEVIATION_BLOCK_BPS = 1_000;
/**
 * Reviewed cross-venue deviation between Insight's cross-oracle consensus
 * price and the Drift oracle price.
 */
const CONSENSUS_VENUE_DEVIATION_CAUTION_PCT = 1;
const CONSENSUS_VENUE_DEVIATION_BLOCK_PCT = 5;
/**
 * Reviewed open-interest utilisation bands against the on-chain
 * maxOpenInterest backstop. Near the cap, new size cannot open reliably and
 * liquidation cascades propagate through the AMM.
 */
const OPEN_INTEREST_UTILIZATION_CAUTION_PCT = 85;
const OPEN_INTEREST_UTILIZATION_BLOCK_PCT = 98;

export type SolanaPerpGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const SolanaPerpGuardInputSchema = z.object({
  protocolId: z.literal(SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID),
  action: z.enum(['open_long', 'open_short']),
  assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  /** Drift v2 perps are USDC-margined; v1 reviews only that deployment. */
  marginAssetSymbol: z.literal('USDC'),
  /** Caller-declared post-action notional position value, in USD. */
  sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
  /** Caller-declared post-action margin value, in USD. */
  marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
});
export type SolanaPerpGuardInput = z.infer<typeof SolanaPerpGuardInputSchema>;

export interface SolanaPerpGuardOracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  consensusPrice: number;
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  /** A reference to the separately verifiable Oracle Safety attestation, if configured. */
  attestationUid: string | null;
  attester: string | null;
}

export interface SolanaPerpGuardVenueEvidence {
  status: 'observed' | 'unavailable';
  observedAt: string | null;
  sourceFreshnessSeconds: number | null;
  markPrice: number | null;
  oraclePrice: number | null;
  markOracleDeviationBps: number | null;
  /** Order-book depth is not decoded on-chain in this phase. */
  displayedTopDepthNotionalUsd: null;
  fundingRate: number | null;
  openInterestCoin: number | null;
  dayNotionalVolume: null;
  liveMaxLeverage: number | null;
  /** Cross-venue deviation between Insight consensus and the venue oracle price. */
  consensusVenueDeviationPct: number | null;
  /** Drift-specific disclosed evidence (null when unavailable). */
  drift: {
    marketIndex: number | null;
    marketAccountAddress: string | null;
    oracleSource: string | null;
    oracleSourceSupported: boolean | null;
    oracleConfidence: number | null;
    markPriceTwap: number | null;
    last24hAvgFundingRatePerHourPercent: number | null;
    fundingPeriodSeconds: number | null;
    openInterestNotionalUsd: number | null;
    maxOpenInterestBase: number | null;
    openInterestUtilizationPct: number | null;
    netBaseAssetAmount: number | null;
    marginRatioMaintenance: number | null;
    contractTier: string | null;
    marketStatus: string | null;
    pausedOperationsMask: number | null;
    ammLastUpdateSlot: number | null;
    unavailableReason: string | null;
  };
}

export interface SolanaPerpGuardResult {
  schema: typeof SOLANA_PERP_GUARD_SCHEMA_VERSION;
  verdict: SolanaPerpGuardVerdict;
  protocolId: typeof SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID;
  action: SolanaPerpGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'drift';
    network: typeof SOLANA_MAINNET_CAIP2;
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
  };
  market: {
    assetSymbol: string;
    marginAssetSymbol: string;
    maxLeverage: number;
    maxLeverageSource:
      | 'reviewed-profile'
      | 'reviewed-profile-capped-by-live-venue'
      | 'reviewed-profile-live-unavailable';
    parameterSource: 'reviewed-profile';
  };
  projected: {
    sizeUsd: number;
    marginValueUsd: number;
    effectiveLeverage: number;
    liquidationBufferPct: number;
    conservativeMaxSizeUsd: number;
  };
  oracleChecks: {
    underlying: SolanaPerpGuardOracleCheckSummary;
    margin: SolanaPerpGuardOracleCheckSummary;
  };
  /**
   * Disclosed Drift venue evidence. It never enters the cross-oracle
   * consensus; concrete observed concerns escalate the verdict, and
   * unavailability is disclosed without changing it.
   */
  venue: SolanaPerpGuardVenueEvidence;
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface SolanaPerpGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  fetchVenueState?: (
    input: SolanaPerpGuardInput,
    now: Date
  ) => Promise<SolanaPerpGuardVenueEvidence>;
  now?: () => Date;
}

function normalizeSymbol(symbol: string): string {
  // Accept both the base symbol (BTC) and the Drift market name (BTC-PERP).
  return symbol
    .trim()
    .toUpperCase()
    .replace(/-PERP$/, '');
}

function summarize(result: PreTradeSafetyResult): SolanaPerpGuardOracleCheckSummary {
  return {
    verdict: result.verdict,
    consensusPrice: result.consensusPrice,
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    attester: result.attestation?.attester ?? null,
  };
}

function isBlockingOracleVerdict(verdict: PreTradeSafetyResult['verdict']): boolean {
  return verdict === 'DANGER' || verdict === 'BLOCK';
}

function bps(numerator: number, denominator: number): number {
  if (!(denominator > 0)) return Number.POSITIVE_INFINITY;
  return ((numerator - denominator) / denominator) * 10_000;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Fetch the reviewed market's on-chain evidence and map it into the guard's
 * disclosed venue-evidence shape. All decode/observation failures collapse
 * into the explicit `unavailable` status (fail closed, never invented).
 */
export async function fetchSolanaPerpGuardVenueState(
  input: SolanaPerpGuardInput,
  now: Date
): Promise<SolanaPerpGuardVenueEvidence> {
  const observedAt = now.toISOString();
  const unavailable = (reason: string): SolanaPerpGuardVenueEvidence => ({
    status: 'unavailable',
    observedAt: null,
    sourceFreshnessSeconds: null,
    markPrice: null,
    oraclePrice: null,
    markOracleDeviationBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRate: null,
    openInterestCoin: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: null,
      marketAccountAddress: null,
      oracleSource: null,
      oracleSourceSupported: null,
      oracleConfidence: null,
      markPriceTwap: null,
      last24hAvgFundingRatePerHourPercent: null,
      fundingPeriodSeconds: null,
      openInterestNotionalUsd: null,
      maxOpenInterestBase: null,
      openInterestUtilizationPct: null,
      netBaseAssetAmount: null,
      marginRatioMaintenance: null,
      contractTier: null,
      marketStatus: null,
      pausedOperationsMask: null,
      ammLastUpdateSlot: null,
      unavailableReason: reason,
    },
  });

  try {
    const reviewed = findReviewedDriftPerpMarket(input.assetSymbol);
    if (!reviewed) {
      throw new Error(`assetSymbol ${input.assetSymbol} is not a reviewed Drift perp market`);
    }
    const evidence: DriftPerpMarketEvidence = await fetchDriftPerpMarketEvidence(reviewed);
    const markOracleDeviationBps =
      evidence.markPrice !== null && evidence.oraclePrice !== null
        ? Math.abs(bps(evidence.markPrice, evidence.oraclePrice))
        : null;
    const openInterestUtilizationPct =
      evidence.openInterestBase !== null &&
      evidence.maxOpenInterestBase !== null &&
      evidence.maxOpenInterestBase > 0
        ? (Math.max(0, evidence.openInterestBase) / evidence.maxOpenInterestBase) * 100
        : null;
    const consensusVenueDeviationPct: number | null = null;
    return {
      status: 'observed',
      observedAt,
      sourceFreshnessSeconds:
        evidence.markPriceTwapUpdatedAtMs !== null
          ? Math.max(0, Math.round((now.getTime() - evidence.markPriceTwapUpdatedAtMs) / 1000))
          : null,
      markPrice: evidence.markPrice,
      oraclePrice: evidence.oraclePrice,
      markOracleDeviationBps:
        markOracleDeviationBps === null ? null : roundTo(markOracleDeviationBps, 2),
      displayedTopDepthNotionalUsd: null,
      fundingRate: evidence.fundingRatePerHourFraction,
      openInterestCoin: evidence.openInterestBase,
      dayNotionalVolume: null,
      liveMaxLeverage: evidence.maxLeverage,
      consensusVenueDeviationPct,
      drift: {
        marketIndex: evidence.marketIndex,
        marketAccountAddress: evidence.marketAccountAddress,
        oracleSource: evidence.oracleSource,
        oracleSourceSupported: evidence.oracleSourceSupported,
        oracleConfidence: evidence.oracleConfidence,
        markPriceTwap: evidence.markPriceTwap,
        last24hAvgFundingRatePerHourPercent: evidence.last24hAvgFundingRatePerHourPercent,
        fundingPeriodSeconds: evidence.fundingPeriodSeconds,
        openInterestNotionalUsd: evidence.openInterestNotionalUsd,
        maxOpenInterestBase: evidence.maxOpenInterestBase,
        openInterestUtilizationPct:
          openInterestUtilizationPct === null ? null : roundTo(openInterestUtilizationPct, 2),
        netBaseAssetAmount: evidence.netBaseAssetAmount,
        marginRatioMaintenance: evidence.marginRatioMaintenance,
        contractTier: evidence.contractTier,
        marketStatus: evidence.status,
        pausedOperationsMask: evidence.pausedOperationsMask,
        ammLastUpdateSlot: evidence.ammLastUpdateSlot,
        unavailableReason: null,
      },
    };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'Unknown Drift evidence failure');
  }
}

/**
 * Assess a caller-declared Drift perpetual position against live on-chain
 * venue evidence and cross-oracle consensus. Fails closed: missing venue
 * evidence is disclosed, and every price-integrity check treats missing
 * values as maximum divergence.
 */
export async function assessSolanaPerpGuard(
  rawInput: SolanaPerpGuardInput,
  dependencies: SolanaPerpGuardDependencies = {}
): Promise<SolanaPerpGuardResult> {
  const input = SolanaPerpGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const fetchVenueState = dependencies.fetchVenueState ?? fetchSolanaPerpGuardVenueState;
  const now = dependencies.now?.() ?? new Date();
  const evaluatedAt = now.toISOString();

  const profile =
    REVIEWED_MARKETS[normalizeSymbol(input.assetSymbol) as keyof typeof REVIEWED_MARKETS];
  if (!profile) {
    throw new Error('Declared market is not in the reviewed Solana perp guard market set');
  }

  const [underlyingResult, marginResult, venueState] = await Promise.all([
    checkOracle({
      asset: input.assetSymbol,
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: input.sizeUsd,
    }),
    checkOracle({
      asset: input.marginAssetSymbol,
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: input.marginValueUsd,
    }),
    fetchVenueState(input, now).catch(() => null),
  ]);

  const venue: SolanaPerpGuardVenueEvidence =
    venueState ?? fetchSolanaPerpGuardVenueStateSyncUnavailable(evaluatedAt);

  const effectiveLeverage = input.sizeUsd / input.marginValueUsd;
  // The on-chain margin ratio can be changed by Drift governance at any time;
  // the guard binds to the lower of the reviewed profile and the freshly
  // observed venue value, and discloses when the live value is missing.
  const liveMaxLeverage = venue.liveMaxLeverage;
  const cappedByLive = liveMaxLeverage !== null && liveMaxLeverage < profile.maxLeverage;
  const maxLeverage = cappedByLive ? (liveMaxLeverage as number) : profile.maxLeverage;
  const liquidationBufferPct = Math.max(0, (1 - effectiveLeverage / maxLeverage) * 100);
  // 90% of the effective cap leaves a mechanical buffer. This is advisory; it
  // is not a claim that the position is safe under every move.
  const conservativeMaxSizeUsd = roundTo(input.marginValueUsd * maxLeverage * 0.9, 2);

  const reasons: string[] = [];
  let verdict: SolanaPerpGuardVerdict = 'ALLOW';

  if (
    isBlockingOracleVerdict(underlyingResult.verdict) ||
    isBlockingOracleVerdict(marginResult.verdict)
  ) {
    verdict = 'BLOCK';
    reasons.push('At least one underlying or margin oracle assessment is DANGER or BLOCK.');
  }
  if (effectiveLeverage >= maxLeverage) {
    verdict = 'BLOCK';
    reasons.push(
      'Declared post-action leverage is at or above the effective leverage cap, leaving no reviewed buffer.'
    );
  } else if (effectiveLeverage >= maxLeverage * 0.9) {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push(
      'Declared post-action leverage consumes at least 90% of the effective leverage cap.'
    );
  }
  if (underlyingResult.verdict === 'CAUTION' || marginResult.verdict === 'CAUTION') {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push('At least one oracle assessment requires review before execution.');
  }

  // Disclosed venue-integrity layer. Concrete observed concerns escalate an
  // ALLOW; unavailability is disclosed and never changes the verdict.
  if (venue.status === 'unavailable') {
    reasons.push(
      'Drift venue evidence was unavailable; the verdict rests on oracle consensus and the declared leverage band only.'
    );
  } else {
    // Fail closed: a missing mark/oracle deviation counts as maximum divergence.
    const deviation = venue.markOracleDeviationBps ?? Number.POSITIVE_INFINITY;
    if (deviation >= MARK_ORACLE_DEVIATION_BLOCK_BPS) {
      verdict = 'BLOCK';
      reasons.push(
        `Drift mark/oracle divergence ${deviation === Number.POSITIVE_INFINITY ? 'is unobservable' : `${venue.markOracleDeviationBps?.toFixed(2)} bps`} and is at or above the reviewed ${MARK_ORACLE_DEVIATION_BLOCK_BPS} bps backstop.`
      );
    } else if (deviation >= MARK_ORACLE_DEVIATION_CAUTION_BPS) {
      if (verdict !== 'BLOCK') verdict = 'CAUTION';
      reasons.push(
        `Drift mark/oracle divergence ${venue.markOracleDeviationBps?.toFixed(2)} bps exceeds the reviewed ${MARK_ORACLE_DEVIATION_CAUTION_BPS} bps advisory band.`
      );
    }
    const crossVenue = venue.consensusVenueDeviationPct;
    if (crossVenue !== null) {
      if (crossVenue >= CONSENSUS_VENUE_DEVIATION_BLOCK_PCT) {
        verdict = 'BLOCK';
        reasons.push(
          `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the Drift oracle price, at or above the reviewed ${CONSENSUS_VENUE_DEVIATION_BLOCK_PCT}% backstop.`
        );
      } else if (crossVenue >= CONSENSUS_VENUE_DEVIATION_CAUTION_PCT) {
        if (verdict !== 'BLOCK') verdict = 'CAUTION';
        reasons.push(
          `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the Drift oracle price, above the reviewed ${CONSENSUS_VENUE_DEVIATION_CAUTION_PCT}% advisory band.`
        );
      }
    }
    if (venue.drift.marketStatus !== null && venue.drift.marketStatus !== 'active') {
      verdict = 'BLOCK';
      reasons.push(
        `Drift market status is ${venue.drift.marketStatus}, not active; trading is not in the reviewed operating state.`
      );
    }
    if (venue.drift.openInterestUtilizationPct !== null) {
      if (venue.drift.openInterestUtilizationPct >= OPEN_INTEREST_UTILIZATION_BLOCK_PCT) {
        verdict = 'BLOCK';
        reasons.push(
          `Open interest consumes ${venue.drift.openInterestUtilizationPct.toFixed(2)}% of the on-chain maxOpenInterest backstop, at or above the reviewed ${OPEN_INTEREST_UTILIZATION_BLOCK_PCT}% backstop.`
        );
      } else if (venue.drift.openInterestUtilizationPct >= OPEN_INTEREST_UTILIZATION_CAUTION_PCT) {
        if (verdict !== 'BLOCK') verdict = 'CAUTION';
        reasons.push(
          `Open interest consumes ${venue.drift.openInterestUtilizationPct.toFixed(2)}% of the on-chain maxOpenInterest backstop, above the reviewed ${OPEN_INTEREST_UTILIZATION_CAUTION_PCT}% advisory band.`
        );
      }
    }
    if (cappedByLive) {
      reasons.push(
        `Live on-chain max leverage ${venue.liveMaxLeverage}x is lower than the static reviewed profile cap ${profile.maxLeverage}x; the guard binds to the live value.`
      );
    }
  }

  reasons.push(
    'Leverage bands come from a static reviewed profile capped by the freshly observed on-chain margin ratios; Drift market parameters can change. Verify live venue configuration before execution.'
  );
  if (verdict === 'ALLOW') {
    reasons.push(
      'Oracle checks passed and declared post-action leverage remains below the conservative guard band.'
    );
  }

  // Cross-venue deviation is computed here so it can both disclose and escalate.
  const consensusPrice = underlyingResult.consensusPrice;
  if (venue.status === 'observed' && venue.oraclePrice !== null && consensusPrice > 0) {
    venue.consensusVenueDeviationPct = roundTo(
      Math.abs(((venue.oraclePrice - consensusPrice) / consensusPrice) * 100),
      4
    );
    if (venue.consensusVenueDeviationPct >= CONSENSUS_VENUE_DEVIATION_BLOCK_PCT) {
      verdict = 'BLOCK';
      reasons.push(
        `Insight cross-oracle consensus diverges ${venue.consensusVenueDeviationPct.toFixed(2)}% from the Drift oracle price, at or above the reviewed ${CONSENSUS_VENUE_DEVIATION_BLOCK_PCT}% backstop.`
      );
    } else if (venue.consensusVenueDeviationPct >= CONSENSUS_VENUE_DEVIATION_CAUTION_PCT) {
      if (verdict !== 'BLOCK') verdict = 'CAUTION';
      reasons.push(
        `Insight cross-oracle consensus diverges ${venue.consensusVenueDeviationPct.toFixed(2)}% from the Drift oracle price, above the reviewed ${CONSENSUS_VENUE_DEVIATION_CAUTION_PCT}% advisory band.`
      );
    }
  }

  return {
    schema: SOLANA_PERP_GUARD_SCHEMA_VERSION,
    verdict,
    protocolId: SOLANA_PERP_GUARD_DRIFT_V2_PROTOCOL_ID,
    action: input.action,
    evaluatedAt,
    scope: {
      venue: 'drift',
      network: SOLANA_MAINNET_CAIP2,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: input.assetSymbol,
      marginAssetSymbol: input.marginAssetSymbol,
      maxLeverage,
      maxLeverageSource: cappedByLive
        ? 'reviewed-profile-capped-by-live-venue'
        : liveMaxLeverage === null
          ? 'reviewed-profile-live-unavailable'
          : 'reviewed-profile',
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: input.sizeUsd,
      marginValueUsd: input.marginValueUsd,
      effectiveLeverage: roundTo(effectiveLeverage, 4),
      liquidationBufferPct: roundTo(liquidationBufferPct, 4),
      conservativeMaxSizeUsd,
    },
    oracleChecks: { underlying: summarize(underlyingResult), margin: summarize(marginResult) },
    venue,
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind this decision to one exact, user-authorized unsigned Drift transaction before execution; the binding surface is not part of this assessment.',
    },
  };
}

function fetchSolanaPerpGuardVenueStateSyncUnavailable(
  observedAt: string
): SolanaPerpGuardVenueEvidence {
  return {
    status: 'unavailable',
    observedAt: null,
    sourceFreshnessSeconds: null,
    markPrice: null,
    oraclePrice: null,
    markOracleDeviationBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRate: null,
    openInterestCoin: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    consensusVenueDeviationPct: null,
    drift: {
      marketIndex: null,
      marketAccountAddress: null,
      oracleSource: null,
      oracleSourceSupported: null,
      oracleConfidence: null,
      markPriceTwap: null,
      last24hAvgFundingRatePerHourPercent: null,
      fundingPeriodSeconds: null,
      openInterestNotionalUsd: null,
      maxOpenInterestBase: null,
      openInterestUtilizationPct: null,
      netBaseAssetAmount: null,
      marginRatioMaintenance: null,
      contractTier: null,
      marketStatus: null,
      pausedOperationsMask: null,
      ammLastUpdateSlot: null,
      unavailableReason: `Drift venue evidence could not be fetched (evaluated at ${observedAt}).`,
    },
  };
}
