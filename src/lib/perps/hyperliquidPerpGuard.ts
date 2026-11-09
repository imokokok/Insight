import { z } from 'zod';

import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import {
  getHyperliquidPerpExecutionMarketState,
  hyperliquidPerpMarketProfile,
  HYPERLIQUID_MAINNET_NETWORK,
  type HyperliquidPerpExecutionMarketState,
} from '@/lib/dex/hyperliquidPerpMarket';
import {
  bps,
  computeConsensusVenueDeviationPct,
  escalatePerpGuardVerdict,
  evaluatePerpGuardLeverageBand,
  evaluatePerpGuardLeverageVerdicts,
  evaluatePerpGuardVenueIntegrity,
  isBlockingOracleVerdict,
  normalizeSymbol,
  summarizeOracleCheck,
  type PerpGuardOracleCheckSummary,
  type PerpGuardVerdict,
} from '@/lib/perps/perpGuardKernel';

/**
 * A read-only, Hyperliquid-only perpetual-futures decision gate for the
 * Hyperliquid L1 perp venue. It deliberately evaluates caller-declared
 * post-action USD values rather than constructing, signing, or submitting an
 * order. A caller must bind a successful response to one exact,
 * user-authorized unsigned exchange envelope separately
 * (hyperliquidPerpGuardAction / hyperliquidPerpGuardAttestation).
 *
 * Scope: cross-oracle consensus integrity for the underlying and USDC margin,
 * the declared leverage band against a reviewed static profile (capped by the
 * live venue leverage limit), and disclosed Hyperliquid venue evidence
 * (mark/oracle divergence, displayed depth). The venue's liquidation engine,
 * matching priority, and later book changes are outside this guard's claims.
 *
 * Cross-oracle consensus runs on canonical Ethereum-mainnet feeds: BTC, ETH,
 * and USDC carry deep independent coverage there, and consensus prices are
 * chain-agnostic for these majors. The venue's own oracle price is compared
 * against that consensus as a separate disclosed cross-venue check.
 *
 * Venue-neutral pieces (verdict vocabulary, oracle-check summary shape,
 * reviewed venue-integrity thresholds, leverage-band evaluation, numeric
 * helpers) live in `perpGuardKernel.ts` so they cannot silently fork between
 * perp guards.
 */
export const HYPERLIQUID_PERPS_PROTOCOL_ID = 'hyperliquid-perps-mainnet' as const;

/**
 * Reviewed per-market static leverage caps for Hyperliquid perps. HYPE is
 * excluded until the cross-oracle corpus carries sufficient independent
 * coverage for it on a canonical feed; markets outside this set fail closed.
 */
const REVIEWED_MARKETS = {
  BTC: { maxLeverage: 40 },
  ETH: { maxLeverage: 25 },
} as const satisfies Record<string, { maxLeverage: number }>;

export type HyperliquidPerpGuardVerdict = PerpGuardVerdict;

export const HyperliquidPerpGuardInputSchema = z.object({
  protocolId: z.literal(HYPERLIQUID_PERPS_PROTOCOL_ID),
  action: z.enum(['open_long', 'open_short']),
  assetSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
  /** Hyperliquid perps are USDC-margined; v1 reviews only that deployment. */
  marginAssetSymbol: z.literal('USDC'),
  /** Caller-declared post-action notional position value, in USD. */
  sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
  /** Caller-declared post-action margin value, in USD. */
  marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
});
export type HyperliquidPerpGuardInput = z.infer<typeof HyperliquidPerpGuardInputSchema>;

/** Exact-order mode: one guard assessment bound to one unsigned order envelope. */
export const HyperliquidPerpGuardExactInputSchema = z
  .object({
    guard: HyperliquidPerpGuardInputSchema,
    order: z.unknown(),
  })
  .strict();
export type HyperliquidPerpGuardExactInput = z.infer<typeof HyperliquidPerpGuardExactInputSchema>;

export type HyperliquidPerpGuardOracleCheckSummary = PerpGuardOracleCheckSummary;

export interface HyperliquidPerpGuardVenueEvidence {
  status: 'observed' | 'unavailable';
  observedAt: string | null;
  sourceFreshnessSeconds: number | null;
  markPrice: number | null;
  oraclePrice: number | null;
  markOracleDeviationBps: number | null;
  spreadBps: number | null;
  /** Displayed top-level depth on the side implied by the action, in USD. */
  displayedTopDepthNotionalUsd: number | null;
  fundingRate: number | null;
  openInterestCoin: number | null;
  dayNotionalVolume: number | null;
  liveMaxLeverage: number | null;
  /**
   * Asset index of the assessed market as resolved from the same fresh main
   * perp-dex metadata read (`metaAndAssetCtxs` universe position). Exact-order
   * binding pins the envelope's asset id to this value so a same-symbol order
   * on another perp dex (for example a HIP-3 builder-deployed market, whose
   * asset ids are 100000+) cannot be bound to this assessment.
   */
  observedAssetIndex: number | null;
  /** Cross-venue deviation between Insight consensus and the venue oracle price. */
  consensusVenueDeviationPct: number | null;
}

export interface HyperliquidPerpGuardResult {
  schema: 'insight.hyperliquid-perp-guard.v1';
  verdict: HyperliquidPerpGuardVerdict;
  protocolId: typeof HYPERLIQUID_PERPS_PROTOCOL_ID;
  action: HyperliquidPerpGuardInput['action'];
  evaluatedAt: string;
  scope: {
    venue: 'hyperliquid';
    network: typeof HYPERLIQUID_MAINNET_NETWORK;
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
    underlying: HyperliquidPerpGuardOracleCheckSummary;
    margin: HyperliquidPerpGuardOracleCheckSummary;
  };
  /**
   * Disclosed Hyperliquid venue evidence. It never enters the cross-oracle
   * consensus; concrete observed concerns escalate the verdict, and
   * unavailability is disclosed without changing it.
   */
  venue: HyperliquidPerpGuardVenueEvidence;
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface HyperliquidPerpGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  fetchVenueState?: (assetSymbol: string) => Promise<HyperliquidPerpExecutionMarketState | null>;
  now?: () => Date;
}

async function defaultVenueState(
  assetSymbol: string
): Promise<HyperliquidPerpExecutionMarketState> {
  return getHyperliquidPerpExecutionMarketState(
    hyperliquidPerpMarketProfile(normalizeSymbol(assetSymbol) as 'BTC' | 'ETH')
  );
}

function venueEvidence(
  state: HyperliquidPerpExecutionMarketState,
  consensusPrice: number,
  action: HyperliquidPerpGuardInput['action']
): HyperliquidPerpGuardVenueEvidence {
  const bestBid = state.book.bids[0]?.price ?? null;
  const bestAsk = state.book.asks[0]?.price ?? null;
  const spreadBps =
    bestBid !== null && bestAsk !== null && bestBid > 0
      ? ((bestAsk - bestBid) / bestBid) * 10_000
      : null;
  // An open_long consumes displayed ask liquidity; an open_short consumes bids.
  const sideLevel = action === 'open_long' ? state.book.asks[0] : state.book.bids[0];
  return {
    status: 'observed',
    observedAt: state.observedAt,
    sourceFreshnessSeconds: state.sourceFreshnessSeconds,
    markPrice: state.perpetual.markPrice,
    oraclePrice: state.perpetual.oraclePrice,
    markOracleDeviationBps: Math.abs(bps(state.perpetual.markPrice, state.perpetual.oraclePrice)),
    spreadBps,
    displayedTopDepthNotionalUsd: sideLevel ? sideLevel.price * sideLevel.size : null,
    fundingRate: state.perpetual.fundingRate,
    openInterestCoin: state.perpetual.openInterest,
    dayNotionalVolume: state.perpetual.dayNotionalVolume,
    liveMaxLeverage: state.perpetual.maxLeverage,
    observedAssetIndex: state.assetIndex,
    consensusVenueDeviationPct: computeConsensusVenueDeviationPct(
      state.perpetual.oraclePrice,
      consensusPrice
    ),
  };
}

function unavailableVenueEvidence(): HyperliquidPerpGuardVenueEvidence {
  return {
    status: 'unavailable',
    observedAt: null,
    sourceFreshnessSeconds: null,
    markPrice: null,
    oraclePrice: null,
    markOracleDeviationBps: null,
    spreadBps: null,
    displayedTopDepthNotionalUsd: null,
    fundingRate: null,
    openInterestCoin: null,
    dayNotionalVolume: null,
    liveMaxLeverage: null,
    observedAssetIndex: null,
    consensusVenueDeviationPct: null,
  };
}

export async function assessHyperliquidPerpGuard(
  rawInput: HyperliquidPerpGuardInput,
  dependencies: HyperliquidPerpGuardDependencies = {}
): Promise<HyperliquidPerpGuardResult> {
  const input = HyperliquidPerpGuardInputSchema.parse(rawInput);
  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  const fetchVenueState = dependencies.fetchVenueState ?? defaultVenueState;
  const evaluatedAt = (dependencies.now ?? (() => new Date()))().toISOString();

  const profile: { maxLeverage: number } | undefined =
    REVIEWED_MARKETS[normalizeSymbol(input.assetSymbol) as keyof typeof REVIEWED_MARKETS];
  if (!profile) {
    throw new Error('Declared market is not in the reviewed Hyperliquid perp guard market set');
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
    fetchVenueState(input.assetSymbol).catch(() => null),
  ]);

  const venue = venueState
    ? venueEvidence(venueState, underlyingResult.consensusPrice, input.action)
    : unavailableVenueEvidence();

  // The live venue leverage limit can be lowered by Hyperliquid governance at
  // any time; the guard binds to the lower of the reviewed profile and the
  // freshly observed venue value.
  const band = evaluatePerpGuardLeverageBand(
    input.sizeUsd,
    input.marginValueUsd,
    profile.maxLeverage,
    venue.liveMaxLeverage
  );
  const reasons: string[] = [];
  let verdict: HyperliquidPerpGuardVerdict = 'ALLOW';

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
      'Hyperliquid venue evidence was unavailable; the verdict rests on oracle consensus and the declared leverage band only.'
    );
  } else {
    const venueIntegrity = evaluatePerpGuardVenueIntegrity({
      venueLabel: 'Hyperliquid',
      indexPriceLabel: 'oracle price',
      divergenceLabel: 'mark/oracle',
      markIndexDeviationBps: venue.markOracleDeviationBps,
      consensusVenueDeviationPct: venue.consensusVenueDeviationPct,
      marketStatus: null,
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
    'Leverage bands come from a static reviewed profile capped by the freshly observed venue limit; Hyperliquid market parameters can change. Verify live venue configuration before execution.'
  );
  if (verdict === 'ALLOW') {
    reasons.push(
      'Oracle checks passed and declared post-action leverage remains below the conservative guard band.'
    );
  }

  return {
    schema: 'insight.hyperliquid-perp-guard.v1',
    verdict,
    protocolId: HYPERLIQUID_PERPS_PROTOCOL_ID,
    action: input.action,
    evaluatedAt,
    scope: {
      venue: 'hyperliquid',
      network: HYPERLIQUID_MAINNET_NETWORK,
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
      effectiveLeverage: band.effectiveLeverage,
      liquidationBufferPct: band.liquidationBufferPct,
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
      priorSeal: 'Bind this decision to an exact, user-authorized order envelope before execution.',
    },
  };
}
