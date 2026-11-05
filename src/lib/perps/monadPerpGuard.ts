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
 *
 * Venue-neutral pieces (verdict vocabulary, oracle-check summary shape,
 * reviewed venue-integrity thresholds, leverage-band evaluation, numeric
 * helpers) live in `perpGuardKernel.ts` so they cannot silently fork between
 * perp guards.
 */

import { z } from 'zod';

import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import {
  bps,
  computeConsensusVenueDeviationPct,
  escalatePerpGuardVerdict,
  evaluatePerpGuardLeverageBand,
  evaluatePerpGuardLeverageVerdicts,
  evaluatePerpGuardVenueIntegrity,
  isBlockingOracleVerdict,
  normalizeSymbol,
  roundTo,
  summarizeOracleCheck,
  type PerpGuardOracleCheckSummary,
  type PerpGuardVerdict,
} from '@/lib/perps/perpGuardKernel';
import {
  fetchPerplPerpMarketState,
  perplReviewedMarketForAsset,
  PERPL_MAINNET_NETWORK,
  type PerplPerpMarketState,
} from '@/lib/perps/perplPerpMarket';
import {
  AUSD_UNVERIFIED_DESCRIPTOR,
  evaluateAusdCoverage,
  type AusdCoverageDescriptor,
  type AusdCoverageResult,
} from '@/lib/oracles/ausdCoverage';

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

export type MonadPerpGuardVerdict = PerpGuardVerdict;
export type MonadPerpGuardOracleCheckSummary = PerpGuardOracleCheckSummary;

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
  /**
   * Opt-in strict mode: BLOCK when AUSD carries no verified independent
   * oracle coverage. Default (false) keeps the disclosed-advisory behavior
   * so existing verdicts never change.
   */
  requireIndependentAusdCoverage: z.boolean().optional(),
});
export type MonadPerpGuardInput = z.infer<typeof MonadPerpGuardInputSchema>;

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
  /**
   * Independent AUSD oracle-coverage evaluation. Always present; advisory
   * by default, verdict-enforcing only under the opt-in
   * `requireIndependentAusdCoverage` strict mode.
   */
  ausdCoverage: AusdCoverageResult;
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
  /**
   * Injectable AUSD coverage source. May return an `AusdCoverageDescriptor`
   * (re-evaluated by the guard) or a pre-computed `AusdCoverageResult`
   * (used as-is). Defaults to the UNVERIFIED descriptor: no fabricated
   * feed addresses, fail closed.
   */
  resolveAusdCoverage?: () => AusdCoverageDescriptor | AusdCoverageResult | undefined;
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
  const fetchVenueState = dependencies.fetchVenueState ?? fetchPerplPerpMarketState;
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
  const [underlyingResult, marginOutcome, venueOutcome] = await Promise.all([
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
    fetchVenueState(input.assetSymbol).then(
      (state) => ({ kind: 'observed', state }) as const,
      (error: unknown) =>
        ({
          kind: 'unavailable',
          reason: error instanceof Error ? error.message : 'Unknown Perpl evidence failure',
        }) as const
    ),
  ]);

  const marginConsensusStatus = (() => {
    if (marginOutcome.kind === 'unavailable') return 'unavailable' as const;
    const summary = summarizeOracleCheck(marginOutcome.result);
    if (summary.verdict === 'BLOCK' && summary.participantCount < 3) {
      return 'insufficient_coverage' as const;
    }
    return 'verified' as const;
  })();

  const margin: MonadPerpGuardOracleCheckSummary | null =
    marginOutcome.kind === 'result' && marginConsensusStatus === 'verified'
      ? summarizeOracleCheck(marginOutcome.result)
      : null;

  const venue: MonadPerpGuardVenueEvidence =
    venueOutcome.kind === 'unavailable'
      ? unavailableVenueEvidence(venueOutcome.reason)
      : venueEvidenceFromState(venueOutcome.state);

  // Independent AUSD oracle coverage (P1-1). Always evaluated and disclosed;
  // verdict-enforcing only under the opt-in `requireIndependentAusdCoverage`
  // strict mode. An injected pre-computed result is used as-is; an injected
  // descriptor is re-evaluated here. Nothing fabricates feed addresses.
  const injectedAusdCoverage = dependencies.resolveAusdCoverage?.();
  const ausdCoverage: AusdCoverageResult =
    injectedAusdCoverage &&
    typeof injectedAusdCoverage === 'object' &&
    'covered' in injectedAusdCoverage &&
    'reasonCode' in injectedAusdCoverage
      ? (injectedAusdCoverage as AusdCoverageResult)
      : evaluateAusdCoverage(injectedAusdCoverage as AusdCoverageDescriptor | undefined, () => now);

  // Cross-venue deviation between the Insight consensus price and Perpl's
  // on-exchange oracle price. Computed only when both sides are observed;
  // when venue evidence is unavailable neither this check nor the mark/oracle
  // divergence check can run, so unavailability is disclosed in `reasons`
  // without escalating the verdict (by design: the verdict then rests on
  // cross-oracle consensus and the declared leverage band only).
  if (venue.status === 'observed') {
    venue.consensusVenueDeviationPct = computeConsensusVenueDeviationPct(
      venue.indexPrice,
      underlyingResult.consensusPrice
    );
  }

  const band = evaluatePerpGuardLeverageBand(
    input.sizeUsd,
    input.marginValueUsd,
    profile.maxLeverage,
    venue.liveMaxLeverage
  );

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

  const leverageVerdicts = evaluatePerpGuardLeverageVerdicts(
    band.effectiveLeverage,
    band.maxLeverage
  );
  verdict = escalatePerpGuardVerdict(verdict, leverageVerdicts.verdict);
  reasons.push(...leverageVerdicts.reasons);

  // Opt-in strict mode (P1-1): insufficient independent AUSD coverage blocks.
  // Default mode keeps the disclosed-advisory behavior (zero regression).
  if (input.requireIndependentAusdCoverage === true && !ausdCoverage.covered) {
    verdict = 'BLOCK';
    const injectedDescriptor =
      injectedAusdCoverage &&
      typeof injectedAusdCoverage === 'object' &&
      'note' in injectedAusdCoverage
        ? (injectedAusdCoverage as AusdCoverageDescriptor)
        : AUSD_UNVERIFIED_DESCRIPTOR;
    reasons.push(
      `Strict AUSD coverage mode is enabled and AUSD has no verified independent oracle coverage (${ausdCoverage.reasonCode}); ${injectedDescriptor.note}`
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
    const venueIntegrity = evaluatePerpGuardVenueIntegrity({
      venueLabel: 'Perpl',
      indexPriceLabel: 'oracle price',
      divergenceLabel: 'mark/oracle',
      markIndexDeviationBps: venue.markIndexDeviationBps,
      consensusVenueDeviationPct: venue.consensusVenueDeviationPct,
      marketStatus: venue.perpl.marketStatus,
    });
    verdict = escalatePerpGuardVerdict(verdict, venueIntegrity.verdict);
    reasons.push(...venueIntegrity.reasons);
    if (band.cappedByLive) {
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
      maxLeverage: band.maxLeverage,
      maxLeverageSource: band.maxLeverageSource,
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: input.sizeUsd,
      marginValueUsd: input.marginValueUsd,
      effectiveLeverage: roundTo(band.effectiveLeverage, 4),
      liquidationBufferPct: roundTo(band.liquidationBufferPct, 4),
      conservativeMaxSizeUsd: band.conservativeMaxSizeUsd,
    },
    oracleChecks: {
      underlying: summarizeOracleCheck(underlyingResult),
      margin,
      marginConsensusStatus,
    },
    venue,
    ausdCoverage,
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind this decision to one exact, user-authorized Perpl order before execution; the binding surface is not part of this assessment.',
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
