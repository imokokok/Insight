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
 *
 * Venue-neutral pieces (verdict vocabulary, oracle-check summary shape,
 * reviewed venue-integrity thresholds, leverage-band evaluation, numeric
 * helpers) live in `perpGuardKernel.ts` so they cannot silently fork between
 * perp guards.
 */

import { z } from 'zod';

import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import {
  asterReviewedMarketForAsset,
  fetchAsterPerpMarketState,
  ASTER_MAINNET_NETWORK,
  type AsterPerpMarketState,
} from '@/lib/dex/asterPerpMarket';
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

export type BnbPerpGuardVerdict = PerpGuardVerdict;
export type BnbPerpGuardOracleCheckSummary = PerpGuardOracleCheckSummary;

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

  const [underlyingResult, marginResult, venueOutcome] = await Promise.all([
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
    fetchVenueState(input.assetSymbol).then(
      (state) => ({ kind: 'observed', state }) as const,
      (error: unknown) =>
        ({
          kind: 'unavailable',
          reason: error instanceof Error ? error.message : 'Unknown Aster evidence failure',
        }) as const
    ),
  ]);

  const venue: BnbPerpGuardVenueEvidence =
    venueOutcome.kind === 'unavailable'
      ? unavailableVenueEvidence(venueOutcome.reason)
      : venueEvidenceFromState(venueOutcome.state);

  // Cross-venue deviation between the Insight consensus price and Aster's
  // external-oracle index price. Computed only when both sides are observed;
  // when venue evidence is unavailable neither this check nor the mark/index
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
  let verdict: BnbPerpGuardVerdict = 'ALLOW';

  if (
    isBlockingOracleVerdict(underlyingResult.verdict) ||
    isBlockingOracleVerdict(marginResult.verdict)
  ) {
    verdict = 'BLOCK';
    reasons.push('At least one underlying or margin oracle assessment is DANGER or BLOCK.');
  }

  const leverageVerdicts = evaluatePerpGuardLeverageVerdicts(
    band.effectiveLeverage,
    band.maxLeverage
  );
  verdict = escalatePerpGuardVerdict(verdict, leverageVerdicts.verdict);
  reasons.push(...leverageVerdicts.reasons);

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
    const venueIntegrity = evaluatePerpGuardVenueIntegrity({
      venueLabel: 'Aster',
      indexPriceLabel: 'index price',
      divergenceLabel: 'mark/index',
      markIndexDeviationBps: venue.markIndexDeviationBps,
      consensusVenueDeviationPct: venue.consensusVenueDeviationPct,
      marketStatus: venue.aster.marketStatus,
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
      margin: summarizeOracleCheck(marginResult),
    },
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
