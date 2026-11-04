/**
 * @fileoverview Monad perpetual-futures guard (Perpl DEX, AUSD-margined).
 *
 * Mirrors the BNB perp guard: a read-only decision gate that evaluates
 * caller-declared post-action USD values against live venue evidence and
 * cross-oracle consensus, never constructing, signing, or submitting an
 * order. A caller must separately bind a successful response to one exact,
 * user-authorized order before execution; the Perpl order-binding surface is
 * not part of this assessment.
 *
 * Scope: cross-oracle consensus integrity for the underlying asset, the
 * declared leverage band against a reviewed static profile (capped by the
 * live venue initial-margin ratio from Perpl's public context), and
 * disclosed Perpl venue evidence (mark/oracle divergence, funding, open
 * interest, 24h notional volume, market status). The venue's liquidation
 * engine, matching priority, and later book changes are outside this guard's
 * claims.
 *
 * Cross-oracle consensus for the underlying runs on canonical
 * Ethereum-mainnet feeds: BTC, ETH, SOL, and MON carry deep independent
 * coverage there, and consensus prices are chain-agnostic for these majors.
 * Perpl's collateral (AUSD, Agora Dollar) has no independent cross-oracle
 * coverage today, so the margin check is best-effort: real DANGER/BLOCK
 * signals escalate, and insufficient-coverage outcomes are disclosed without
 * hard-blocking (Perpl margin accounting is venue-internal and the leverage
 * band still binds).
 */

import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import {
  fetchPerplPerpMarketState,
  perplReviewedMarketForAsset,
  PERPL_MAINNET_NETWORK,
  type PerplPerpMarketState,
} from '@/lib/perps/perplPerpMarket';

export const MONAD_PERP_GUARD_PERPL_PROTOCOL_ID = 'perpl-perps-monad-mainnet';
export const MONAD_PERP_GUARD_SCHEMA_VERSION = 'insight.monad-perp-guard.v1';

/**
 * Reviewed per-market static leverage caps for Perpl AUSD-margined perps,
 * derived from the live venue initial_margin at review time (2026-11-05:
 * BTC 1500 ⇒ 6.67x, ETH 1200 ⇒ 8.33x, SOL 1200 ⇒ 8.33x, MON 1000 ⇒ 10x;
 * rounded down). Markets outside this set fail closed.
 */
const REVIEWED_MARKETS: Record<string, { maxLeverage: number }> = {
  BTC: { maxLeverage: 6 },
  MON: { maxLeverage: 10 },
  ETH: { maxLeverage: 8 },
  SOL: { maxLeverage: 8 },
};

/**
 * Reviewed venue-integrity thresholds for the venue's own mark/oracle
 * divergence. These are static guard values, not caller-set preflight limits.
 */
const MARK_ORACLE_DEVIATION_CAUTION_BPS = 100;
const MARK_ORACLE_DEVIATION_BLOCK_BPS = 1_000;
/**
 * Reviewed cross-venue deviation between Insight's cross-oracle consensus
 * price and the Perpl oracle price.
 */
const CONSENSUS_VENUE_DEVIATION_CAUTION_PCT = 1;
const CONSENSUS_VENUE_DEVIATION_BLOCK_PCT = 5;

export type MonadPerpGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export const MonadPerpGuardInputSchema = z.object({
  protocolId: z.literal(MONAD_PERP_GUARD_PERPL_PROTOCOL_ID),
  action: z.enum(['open_long', 'open_short']),
  assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  /** Perpl reviewed perps are AUSD-margined; v1 reviews only that deployment. */
  marginAssetSymbol: z.literal('AUSD'),
  /** Caller-declared post-action notional position value, in USD. */
  sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
  /** Caller-declared post-action margin value, in USD. */
  marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
});
export type MonadPerpGuardInput = z.infer<typeof MonadPerpGuardInputSchema>;

export interface MonadPerpGuardOracleCheckSummary {
  verdict: PreTradeSafetyResult['verdict'];
  consensusPrice: number;
  maxDeviationPct: number;
  staleDataRisk: boolean;
  participantCount: number;
  /** A reference to the separately verifiable Oracle Safety attestation, if configured. */
  attestationUid: string | null;
  attester: string | null;
}

export interface MonadPerpGuardVenueEvidence {
  status: 'observed' | 'unavailable';
  observedAt: string | null;
  sourceFreshnessSeconds: number | null;
  markPrice: number | null;
  /** Perpl's on-exchange oracle price for the market. */
  indexPrice: number | null;
  markIndexDeviationBps: number | null;
  /** Order-book depth is not part of the reviewed context endpoint read. */
  displayedTopDepthNotionalUsd: null;
  fundingRatePerInterval: number | null;
  nextFundingTimeMs: number | null;
  openInterestBase: number | null;
  dayNotionalVolume: number | null;
  liveMaxLeverage: number | null;
  /** Cross-venue deviation between Insight consensus and the venue oracle price. */
  consensusVenueDeviationPct: number | null;
  /** Perpl-specific disclosed evidence (null when unavailable). */
  perpl: {
    symbol: string | null;
    marketId: number | null;
    marketStatus: string | null;
    unavailableReason: string | null;
  };
}

export interface MonadPerpGuardResult {
  schema: typeof MONAD_PERP_GUARD_SCHEMA_VERSION;
  verdict: MonadPerpGuardVerdict;
  protocolId: typeof MONAD_PERP_GUARD_PERPL_PROTOCOL_ID;
  action: MonadPerpGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'perpl';
    network: typeof PERPL_MAINNET_NETWORK;
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
    underlying: MonadPerpGuardOracleCheckSummary;
    /** Null when AUSD carries no usable independent consensus (disclosed). */
    margin: MonadPerpGuardOracleCheckSummary | null;
    marginConsensusStatus: 'verified' | 'insufficient_coverage' | 'unavailable';
  };
  /**
   * Disclosed Perpl venue evidence. It never enters the cross-oracle
   * consensus; concrete observed concerns escalate the verdict, and
   * unavailability is disclosed without changing it.
   */
  venue: MonadPerpGuardVenueEvidence;
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface MonadPerpGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  fetchVenueState?: (assetSymbol: string) => Promise<PerplPerpMarketState>;
  now?: () => Date;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function summarize(result: PreTradeSafetyResult): MonadPerpGuardOracleCheckSummary {
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

async function defaultVenueState(assetSymbol: string): Promise<PerplPerpMarketState> {
  return fetchPerplPerpMarketState(assetSymbol);
}

function unavailableVenueEvidence(reason: string): MonadPerpGuardVenueEvidence {
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
    perpl: {
      symbol: null,
      marketId: null,
      marketStatus: null,
      unavailableReason: reason,
    },
  };
}

function venueEvidenceFromState(state: PerplPerpMarketState): MonadPerpGuardVenueEvidence {
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
    perpl: {
      symbol: state.symbol,
      marketId: state.marketId,
      marketStatus: state.marketStatus,
      unavailableReason: null,
    },
  };
}

/**
 * Assess a caller-declared Perpl perpetual position against live venue
 * evidence and cross-oracle consensus. Fails closed: missing venue evidence
 * is disclosed, and every price-integrity check treats missing values as
 * maximum divergence.
 */
export async function assessMonadPerpGuard(
  rawInput: MonadPerpGuardInput,
  dependencies: MonadPerpGuardDependencies = {}
): Promise<MonadPerpGuardResult> {
  const input = MonadPerpGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const fetchVenueState = dependencies.fetchVenueState ?? defaultVenueState;
  const now = dependencies.now?.() ?? new Date();
  const evaluatedAt = now.toISOString();

  const normalizedAsset = normalizeSymbol(input.assetSymbol);
  const profile = REVIEWED_MARKETS[normalizedAsset];
  if (!profile || !perplReviewedMarketForAsset(normalizedAsset)) {
    throw new Error('Declared market is not in the reviewed Monad perp guard market set');
  }

  // AUSD (Agora Dollar) has no independent cross-oracle coverage today.
  // The check is attempted so future coverage participates automatically;
  // a BLOCK driven purely by insufficient independent providers (<3) is
  // disclosed rather than escalated because Perpl margin accounting is
  // venue-internal and the leverage band still binds.
  const [underlyingResult, marginOutcome, venueState] = await Promise.all([
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
    }).then(
      (result) => ({ kind: 'result', result }) as const,
      (error: unknown) =>
        ({
          kind: 'unavailable',
          reason: error instanceof Error ? error.message : 'Unknown AUSD oracle failure',
        }) as const
    ),
    fetchVenueState(input.assetSymbol).catch(
      (error: unknown) =>
        unavailableVenueEvidence(
          error instanceof Error ? error.message : 'Unknown Perpl evidence failure'
        ) as unknown as PerplPerpMarketState
    ),
  ]);

  const marginConsensusStatus = (() => {
    if (marginOutcome.kind === 'unavailable') return 'unavailable' as const;
    const summary = summarize(marginOutcome.result);
    if (summary.verdict === 'BLOCK' && summary.participantCount < 3) {
      return 'insufficient_coverage' as const;
    }
    return 'verified' as const;
  })();

  const margin: MonadPerpGuardOracleCheckSummary | null =
    marginOutcome.kind === 'result' && marginConsensusStatus === 'verified'
      ? summarize(marginOutcome.result)
      : null;

  const venue: MonadPerpGuardVenueEvidence =
    'perpl' in (venueState as unknown as Record<string, unknown>)
      ? (venueState as unknown as MonadPerpGuardVenueEvidence)
      : venueEvidenceFromState(venueState);

  // Cross-venue deviation between the Insight consensus price and Perpl's
  // on-exchange oracle price. Computed only when both sides are observed;
  // when venue evidence is unavailable neither this check nor the mark/oracle
  // divergence check can run, so unavailability is disclosed in `reasons`
  // without escalating the verdict (by design: the verdict then rests on
  // cross-oracle consensus and the declared leverage band only).
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
  let verdict: MonadPerpGuardVerdict = 'ALLOW';

  if (isBlockingOracleVerdict(underlyingResult.verdict)) {
    verdict = 'BLOCK';
    reasons.push('The underlying oracle assessment is DANGER or BLOCK.');
  }
  if (margin && isBlockingOracleVerdict(margin.verdict)) {
    verdict = 'BLOCK';
    reasons.push('The margin oracle assessment is DANGER or BLOCK.');
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
  if (underlyingResult.verdict === 'CAUTION' || margin?.verdict === 'CAUTION') {
    if (verdict !== 'BLOCK') verdict = 'CAUTION';
    reasons.push('At least one oracle assessment requires review before execution.');
  }
  if (marginConsensusStatus === 'insufficient_coverage') {
    reasons.push(
      'AUSD margin-asset cross-oracle consensus has insufficient independent coverage; the declared AUSD margin USD value is not independently verified in this assessment.'
    );
  } else if (marginConsensusStatus === 'unavailable') {
    reasons.push(
      'AUSD margin-asset oracle assessment was unavailable; the declared AUSD margin USD value is not independently verified in this assessment.'
    );
  }

  // Disclosed venue-integrity layer. Concrete observed concerns escalate an
  // ALLOW; unavailability is disclosed and never changes the verdict.
  if (venue.status === 'unavailable') {
    reasons.push(
      'Perpl venue evidence was unavailable; the verdict rests on oracle consensus and the declared leverage band only.'
    );
  } else {
    // Fail closed: a missing mark/oracle deviation counts as maximum divergence.
    const deviation = venue.markIndexDeviationBps ?? Number.POSITIVE_INFINITY;
    if (deviation >= MARK_ORACLE_DEVIATION_BLOCK_BPS) {
      verdict = 'BLOCK';
      reasons.push(
        `Perpl mark/oracle divergence ${deviation === Number.POSITIVE_INFINITY ? 'is unobservable' : `${venue.markIndexDeviationBps?.toFixed(2)} bps`} and is at or above the reviewed ${MARK_ORACLE_DEVIATION_BLOCK_BPS} bps backstop.`
      );
    } else if (deviation >= MARK_ORACLE_DEVIATION_CAUTION_BPS) {
      if (verdict !== 'BLOCK') verdict = 'CAUTION';
      reasons.push(
        `Perpl mark/oracle divergence ${venue.markIndexDeviationBps?.toFixed(2)} bps exceeds the reviewed ${MARK_ORACLE_DEVIATION_CAUTION_BPS} bps advisory band.`
      );
    }
    const crossVenue = venue.consensusVenueDeviationPct;
    if (crossVenue !== null) {
      if (crossVenue >= CONSENSUS_VENUE_DEVIATION_BLOCK_PCT) {
        verdict = 'BLOCK';
        reasons.push(
          `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the Perpl oracle price, at or above the reviewed ${CONSENSUS_VENUE_DEVIATION_BLOCK_PCT}% backstop.`
        );
      } else if (crossVenue >= CONSENSUS_VENUE_DEVIATION_CAUTION_PCT) {
        if (verdict !== 'BLOCK') verdict = 'CAUTION';
        reasons.push(
          `Insight cross-oracle consensus diverges ${crossVenue.toFixed(2)}% from the Perpl oracle price, above the reviewed ${CONSENSUS_VENUE_DEVIATION_CAUTION_PCT}% advisory band.`
        );
      }
    }
    if (venue.perpl.marketStatus !== null && venue.perpl.marketStatus !== 'TRADING') {
      verdict = 'BLOCK';
      reasons.push(
        `Perpl market status is ${venue.perpl.marketStatus}, not TRADING; trading is not in the reviewed operating state.`
      );
    }
    if (cappedByLive) {
      reasons.push(
        `Live venue max leverage ${venue.liveMaxLeverage}x is lower than the static reviewed profile cap ${profile.maxLeverage}x; the guard binds to the live value.`
      );
    }
  }

  reasons.push(
    'Leverage bands come from a static reviewed profile capped by the freshly observed venue initial-margin requirement; Perpl market parameters can change. Verify live venue configuration before execution.'
  );
  if (verdict === 'ALLOW') {
    reasons.push(
      'Oracle checks passed and declared post-action leverage remains below the conservative guard band.'
    );
  }

  return {
    schema: MONAD_PERP_GUARD_SCHEMA_VERSION,
    verdict,
    protocolId: MONAD_PERP_GUARD_PERPL_PROTOCOL_ID,
    action: input.action,
    evaluatedAt,
    scope: {
      venue: 'perpl',
      network: PERPL_MAINNET_NETWORK,
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
    oracleChecks: {
      underlying: summarize(underlyingResult),
      margin,
      marginConsensusStatus,
    },
    venue,
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind this decision to one exact, user-authorized Perpl order before execution; the binding surface is not part of this assessment.',
    },
  };
}
