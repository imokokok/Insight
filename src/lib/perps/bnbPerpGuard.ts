/**
 * @fileoverview BNB Smart Chain perpetual-futures guard (Aster DEX, USDT-margined).
 *
 * Mirrors the Hyperliquid perp guard: a read-only decision gate that evaluates
 * caller-declared post-action USD values against live venue evidence and
 * cross-oracle consensus, never constructing, signing, or submitting an order.
 * A caller must separately bind a successful response to one exact,
 * user-authorized order before execution; the Aster exact-order binding
 * surface is not part of this assessment.
 *
 * Scope: cross-oracle consensus integrity for the underlying and USDT margin,
 * the declared leverage band against a reviewed static profile (capped by the
 * live venue required-margin ratio from exchangeInfo), and disclosed Aster
 * venue evidence (mark/index divergence, funding, open interest, 24h notional
 * volume, market status). The venue's liquidation engine, matching priority,
 * and later book changes are outside this guard's claims.
 *
 * Cross-oracle consensus runs on canonical Ethereum-mainnet feeds: BTC, ETH,
 * and USDT carry deep independent coverage there, and consensus prices are
 * chain-agnostic for these majors. The venue's index price (external-oracle
 * reference) is compared against that consensus as a separate disclosed
 * cross-venue check.
 */

import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import {
  asterReviewedMarketForAsset,
  fetchAsterPerpMarketState,
  ASTER_MAINNET_NETWORK,
  type AsterPerpMarketState,
} from '@/lib/dex/asterPerpMarket';

export const BNB_PERP_GUARD_ASTER_PROTOCOL_ID = 'aster-perps-bnb-mainnet';
export const BNB_PERP_GUARD_SCHEMA_VERSION = 'insight.bnb-perp-guard.v1';

/**
 * Reviewed per-market static leverage caps for Aster USDT-margined perps,
 * derived from the live venue requiredMarginPercent at review time
 * (2026-11-04: BTCUSDT and ETHUSDT both carried requiredMarginPercent 5.0
 * ⇒ 20x). Markets outside this set fail closed.
 */
const REVIEWED_MARKETS = {
  BTC: { maxLeverage: 20 },
  ETH: { maxLeverage: 20 },
} as const satisfies Record<string, { maxLeverage: number }>;

/**
 * Reviewed venue-integrity thresholds for the venue's own mark/index
 * divergence. These are static guard values, not caller-set preflight limits.
 */
const MARK_ORACLE_DEVIATION_CAUTION_BPS = 100;
const MARK_ORACLE_DEVIATION_BLOCK_BPS = 1_000;
/**
 * Reviewed cross-venue deviation between Insight's cross-oracle consensus
 * price and the Aster index price.
 */
const CONSENSUS_VENUE_DEVIATION_CAUTION_PCT = 1;
const CONSENSUS_VENUE_DEVIATION_BLOCK_PCT = 5;

export type BnbPerpGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const BnbPerpGuardInputSchema = z.object({
  protocolId: z.literal(BNB_PERP_GUARD_ASTER_PROTOCOL_ID),
  action: z.enum(['open_long', 'open_short']),
  assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  /** Aster reviewed perps are USDT-margined; v1 reviews only that deployment. */
  marginAssetSymbol: z.literal('USDT'),
  /** Caller-declared post-action notional position value, in USD. */
  sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
  /** Caller-declared post-action margin value, in USD. */
  marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
});
export type BnbPerpGuardInput = z.infer<typeof BnbPerpGuardInputSchema>;

export interface BnbPerpGuardOracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  consensusPrice: number;
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  /** A reference to the separately verifiable Oracle Safety attestation, if configured. */
  attestationUid: string | null;
  attester: string | null;
}

export interface BnbPerpGuardVenueEvidence {
  status: 'observed' | 'unavailable';
  observedAt: string | null;
  sourceFreshnessSeconds: number | null;
  markPrice: number | null;
  /** Aster's external-oracle reference price for the market. */
  indexPrice: number | null;
  markIndexDeviationBps: number | null;
  /** Order-book depth is not disclosed by the reviewed public endpoints. */
  displayedTopDepthNotionalUsd: null;
  fundingRatePerInterval: number | null;
  nextFundingTimeMs: number | null;
  openInterestBase: number | null;
  dayNotionalVolume: number | null;
  liveMaxLeverage: number | null;
  /** Cross-venue deviation between Insight consensus and the venue index price. */
  consensusVenueDeviationPct: number | null;
  /** Aster-specific disclosed evidence (null when unavailable). */
  aster: {
    symbol: string | null;
    marketStatus: string | null;
    unavailableReason: string | null;
  };
}

export interface BnbPerpGuardResult {
  schema: typeof BNB_PERP_GUARD_SCHEMA_VERSION;
  verdict: BnbPerpGuardVerdict;
  protocolId: typeof BNB_PERP_GUARD_ASTER_PROTOCOL_ID;
  action: BnbPerpGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'aster';
    network: typeof ASTER_MAINNET_NETWORK;
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
    underlying: BnbPerpGuardOracleCheckSummary;
    margin: BnbPerpGuardOracleCheckSummary;
  };
  /**
   * Disclosed Aster venue evidence. It never enters the cross-oracle
   * consensus; concrete observed concerns escalate the verdict, and
   * unavailability is disclosed without changing it.
   */
  venue: BnbPerpGuardVenueEvidence;
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface BnbPerpGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  fetchVenueState?: (assetSymbol: string) => Promise<AsterPerpMarketState>;
  now?: () => Date;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function summarize(result: PreTradeSafetyResult): BnbPerpGuardOracleCheckSummary {
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

async function defaultVenueState(assetSymbol: string): Promise<AsterPerpMarketState> {
  const market = asterReviewedMarketForAsset(assetSymbol);
  if (!market) {
    throw new Error(`assetSymbol ${assetSymbol} is not a reviewed Aster perp market`);
  }
  return fetchAsterPerpMarketState(market);
}

function unavailableVenueEvidence(reason: string): BnbPerpGuardVenueEvidence {
  return {
    status: 'unavailable',
    observedAt: null,
    sourceFreshnessSeconds: null,
    markPrice: null,
    indexPrice: null,
    markIndexDeviationBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRatePerInterval: null,
    nextFundingTimeMs: null,
    openInterestBase: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    consensusVenueDeviationPct: null,
    aster: {
      symbol: null,
      marketStatus: null,
      unavailableReason: reason,
    },
  };
}

/**
 * Assess a caller-declared Aster perpetual position against live venue
 * evidence and cross-oracle consensus. Fails closed: missing venue evidence
 * is disclosed, and every price-integrity check treats missing values as
 * maximum divergence.
 */
export async function assessBnbPerpGuard(
  rawInput: BnbPerpGuardInput,
  dependencies: BnbPerpGuardDependencies = {}
): Promise<BnbPerpGuardResult> {
  const input = BnbPerpGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const fetchVenueState = dependencies.fetchVenueState ?? defaultVenueState;
  const now = dependencies.now?.() ?? new Date();
  const evaluatedAt = now.toISOString();

  const profile =
    REVIEWED_MARKETS[normalizeSymbol(input.assetSymbol) as keyof typeof REVIEWED_MARKETS];
  if (!profile) {
    throw new Error('Declared market is not in the reviewed BNB perp guard market set');
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
    fetchVenueState(input.assetSymbol).catch(
      (error: unknown) =>
        unavailableVenueEvidence(
          error instanceof Error ? error.message : 'Unknown Aster evidence failure'
        ) as unknown as AsterPerpMarketState
    ),
  ]);

  const venue: BnbPerpGuardVenueEvidence =
    'aster' in (venueState as unknown as Record<string, unknown>)
      ? (venueState as unknown as BnbPerpGuardVenueEvidence)
      : venueEvidenceFromState(venueState);

  // Cross-venue deviation between the Insight consensus price and Aster's
  // external-oracle index price. Computed only when both sides are observed;
  // the escalation layer below consumes it (fail closed is handled by the
  // mark/index divergence check when venue evidence is unavailable).
  if (
    venue.status === 'observed' &&
    venue.indexPrice !== null &&
    Number.isFinite(underlyingResult.consensusPrice) &&
    underlyingResult.consensusPrice > 0
  ) {
    venue.consensusVenueDeviationPct = roundTo(
      (Math.abs(venue.indexPrice - underlyingResult.consensusPrice) /
        underlyingResult.consensusPrice) *
        100,
      4
    );
  }

  const effectiveLeverage = input.sizeUsd / input.marginValueUsd;
  // The venue margin requirement can be changed at any time; the guard binds
  // to the lower of the reviewed profile and the freshly observed venue value,
  // and discloses when the live value is missing.
  const liveMaxLeverage = venue.liveMaxLeverage;
  const cappedByLive = liveMaxLeverage !== null && liveMaxLeverage < profile.maxLeverage;
  const maxLeverage = cappedByLive ? (liveMaxLeverage as number) : profile.maxLeverage;
  const liquidationBufferPct = Math.max(0, (1 - effectiveLeverage / maxLeverage) * 100);
  // 90% of the effective cap leaves a mechanical buffer. This is advisory; it
  // is not a claim that the position is safe under every move.
  const conservativeMaxSizeUsd = roundTo(input.marginValueUsd * maxLeverage * 0.9, 2);

  const reasons: string[] = [];
  let verdict: BnbPerpGuardVerdict = 'ALLOW';

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
      'Aster venue evidence was unavailable; the verdict rests on oracle consensus and the declared leverage band only.'
    );
  } else {
    // Fail closed: a missing mark/index deviation counts as maximum divergence.
    const deviation = venue.markIndexDeviationBps ?? Number.POSITIVE_INFINITY;
    if (deviation >= MARK_ORACLE_DEVIATION_BLOCK_BPS) {
      verdict = 'BLOCK';
      reasons.push(
        `Aster mark/index divergence ${deviation === Number.POSITIVE_INFINITY ? 'is unobservable' : `${venue.markIndexDeviationBps?.toFixed(2)} bps`} and is at or above the reviewed ${MARK_ORACLE_DEVIATION_BLOCK_BPS} bps backstop.`
      );
    } else if (deviation >= MARK_ORACLE_DEVIATION_CAUTION_BPS) {
      if (verdict !== 'BLOCK') verdict = 'CAUTION';
      reasons.push(
        `Aster mark/index divergence ${venue.markIndexDeviationBps?.toFixed(2)} bps exceeds the reviewed ${MARK_ORACLE_DEVIATION_CAUTION_BPS} bps advisory band.`
      );
    }
    const crossVenue = venue.consensusVenueDeviationPct;
    if (crossVenue !== null) {
      if (crossVenue >= CONSENSUS_VENUE_DEVIATION_BLOCK_PCT) {
        verdict = 'BLOCK';
        reasons.push(
          `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the Aster index price, at or above the reviewed ${CONSENSUS_VENUE_DEVIATION_BLOCK_PCT}% backstop.`
        );
      } else if (crossVenue >= CONSENSUS_VENUE_DEVIATION_CAUTION_PCT) {
        if (verdict !== 'BLOCK') verdict = 'CAUTION';
        reasons.push(
          `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the Aster index price, above the reviewed ${CONSENSUS_VENUE_DEVIATION_CAUTION_PCT}% advisory band.`
        );
      }
    }
    if (venue.aster.marketStatus !== null && venue.aster.marketStatus !== 'TRADING') {
      verdict = 'BLOCK';
      reasons.push(
        `Aster market status is ${venue.aster.marketStatus}, not TRADING; trading is not in the reviewed operating state.`
      );
    }
    if (cappedByLive) {
      reasons.push(
        `Live venue max leverage ${venue.liveMaxLeverage}x is lower than the static reviewed profile cap ${profile.maxLeverage}x; the guard binds to the live value.`
      );
    }
  }

  reasons.push(
    'Leverage bands come from a static reviewed profile capped by the freshly observed venue margin requirement; Aster market parameters can change. Verify live venue configuration before execution.'
  );
  if (verdict === 'ALLOW') {
    reasons.push(
      'Oracle checks passed and declared post-action leverage remains below the conservative guard band.'
    );
  }

  return {
    schema: BNB_PERP_GUARD_SCHEMA_VERSION,
    verdict,
    protocolId: BNB_PERP_GUARD_ASTER_PROTOCOL_ID,
    action: input.action,
    evaluatedAt,
    scope: {
      venue: 'aster',
      network: ASTER_MAINNET_NETWORK,
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
        'Bind this decision to one exact, user-authorized Aster order before execution; the binding surface is not part of this assessment.',
    },
  };
}

function venueEvidenceFromState(state: AsterPerpMarketState): BnbPerpGuardVenueEvidence {
  return {
    status: 'observed',
    observedAt: state.observedAt,
    sourceFreshnessSeconds: state.sourceFreshnessSeconds,
    markPrice: state.markPrice,
    indexPrice: state.indexPrice,
    markIndexDeviationBps: roundTo(Math.abs(bps(state.markPrice, state.indexPrice)), 2),
    displayedTopDepthNotionalUsd: null,
    fundingRatePerInterval: state.fundingRatePerInterval,
    nextFundingTimeMs: state.nextFundingTimeMs,
    openInterestBase: state.openInterestBase,
    dayNotionalVolume: state.dayNotionalVolume,
    liveMaxLeverage: state.liveMaxLeverage,
    consensusVenueDeviationPct: null,
    aster: {
      symbol: state.symbol,
      marketStatus: state.marketStatus,
      unavailableReason: null,
    },
  };
}
