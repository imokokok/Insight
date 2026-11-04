/**
 * Base Perp Guard v3 liquidity evidence layer.
 *
 * For a perp underlying, this observes the reviewed Base spot market (spot
 * price, TWAP deviation, in-range pool balances, and a depth quote ladder) as
 * *context* for the guard decision. It deliberately stays outside the
 * cross-oracle consensus: a single DEX venue is never a fair-price oracle, and
 * the Drift incident class (a wash-traded pool anchoring a perp price) is
 * surfaced here as disclosed evidence rather than silently trusted.
 *
 * Unavailability is disclosed, never fabricated: when no reviewed spot market
 * exists for an underlying, or the source cannot be observed, the guard keeps
 * its oracle-consensus verdict and states what was not verified.
 */

import { baseUniswapV3WethUsdc500Profile } from '@/lib/dex/baseUniswapV3';
import {
  getUniswapV3MarketSnapshot,
  type UniswapV3CompatibleVenue,
  type UniswapV3MarketSnapshot,
} from '@/lib/dex/uniswapV3Market';

export const BASE_PERP_LIQUIDITY_EVIDENCE_PROFILE_ID = 'base-uniswap-v3-weth-usdc-500' as const;

/** Advisory band: a top-of-ladder rung moving the pool price this much is thin. */
export const ELEVATED_PRICE_IMPACT_BPS = 250;
/** Advisory band: spot vs 30-minute TWAP divergence on the reviewed pool. */
export const ELEVATED_TWAP_DEVIATION_BPS = 100;

export type BasePerpLiquidityEvidenceStatus =
  | 'not_requested'
  | 'observed'
  | 'no_reviewed_spot_market'
  | 'market_source_unavailable';

export interface BasePerpLiquidityQuoteRun {
  /** Exact-input size on the reviewed ladder, in underlying token units. */
  amountIn: number;
  /** Approximate USD notional of the rung at the observed spot price. */
  notionalUsd: number;
  priceImpactBps: number;
  initializedTicksCrossed: number;
}

export interface BasePerpLiquidityEvidence {
  status: BasePerpLiquidityEvidenceStatus;
  assetSymbol: string;
  profileId?: typeof BASE_PERP_LIQUIDITY_EVIDENCE_PROFILE_ID;
  venue?: UniswapV3CompatibleVenue;
  market?: string;
  pool?: `0x${string}`;
  feeTier?: number;
  blockNumber?: string;
  observedAt?: string;
  sourceFreshnessSeconds?: number;
  spotPriceUsdcPerToken?: number;
  twapPriceUsdcPerToken?: number;
  twapDeviationBpsFromSpot?: number;
  activeLiquidityRaw?: string;
  poolBalanceToken?: number;
  poolBalanceUsdc?: number;
  quotes?: BasePerpLiquidityQuoteRun[];
  declaredSize?: {
    sizeUsd: number;
    referenceRung: BasePerpLiquidityQuoteRun | null;
    beyondReviewedLadder: boolean;
  };
  reason?: string;
}

export type FetchBasePerpLiquidityEvidence = (
  input: { assetSymbol: string; sizeUsd: number },
  options?: { nowMs?: number; signal?: AbortSignal }
) => Promise<BasePerpLiquidityEvidence>;

/** Neutral placeholder used when a caller does not opt into the v3 layer. */
export function basePerpLiquidityEvidenceNotRequested(
  assetSymbol: string
): BasePerpLiquidityEvidence {
  return {
    status: 'not_requested',
    assetSymbol,
    reason: 'Liquidity evidence was not requested for this assessment.',
  };
}

function reviewedSpotProfile(assetSymbol: string): 'weth-usdc-500' | null {
  const symbol = assetSymbol.trim().toUpperCase();
  if (symbol === 'ETH' || symbol === 'WETH') return 'weth-usdc-500';
  return null;
}

function rungsFromSnapshot(
  snapshot: UniswapV3MarketSnapshot,
  spotPriceUsdcPerToken: number
): BasePerpLiquidityQuoteRun[] {
  return snapshot.quotes
    .filter(
      (quote) =>
        quote.direction === 'token0-to-token1' && quote.effectiveToken1PerToken0 !== undefined
    )
    .map((quote) => ({
      amountIn: quote.amountIn,
      notionalUsd: quote.amountIn * spotPriceUsdcPerToken,
      priceImpactBps: quote.priceImpactBps,
      initializedTicksCrossed: quote.initializedTicksCrossed,
    }));
}

function referenceRung(
  rungs: BasePerpLiquidityQuoteRun[],
  sizeUsd: number
): { rung: BasePerpLiquidityQuoteRun | null; beyondLadder: boolean } {
  if (rungs.length === 0) return { rung: null, beyondLadder: false };
  const covering = rungs.find((rung) => rung.notionalUsd >= sizeUsd);
  if (covering) return { rung: covering, beyondLadder: false };
  return { rung: rungs[rungs.length - 1]!, beyondLadder: true };
}

function observedEvidence(
  assetSymbol: string,
  snapshot: UniswapV3MarketSnapshot,
  sizeUsd: number
): BasePerpLiquidityEvidence {
  const spotPriceUsdcPerToken = snapshot.spot.token1PerToken0;
  const rungs = rungsFromSnapshot(snapshot, spotPriceUsdcPerToken);
  const { rung, beyondLadder } = referenceRung(rungs, sizeUsd);
  return {
    status: 'observed',
    assetSymbol,
    profileId: BASE_PERP_LIQUIDITY_EVIDENCE_PROFILE_ID,
    venue: snapshot.venue,
    market: snapshot.market,
    pool: snapshot.contracts.pool,
    feeTier: snapshot.contracts.feeTier,
    blockNumber: snapshot.block.number,
    observedAt: snapshot.observedAt,
    sourceFreshnessSeconds: snapshot.sourceFreshnessSeconds,
    spotPriceUsdcPerToken,
    twapPriceUsdcPerToken: snapshot.twap.token1PerToken0,
    twapDeviationBpsFromSpot: snapshot.twap.deviationBpsFromSpot,
    activeLiquidityRaw: snapshot.activeLiquidityRaw,
    poolBalanceToken: snapshot.poolBalances.token0,
    poolBalanceUsdc: snapshot.poolBalances.token1,
    quotes: rungs,
    declaredSize: { sizeUsd, referenceRung: rung, beyondReviewedLadder: beyondLadder },
  };
}

/**
 * Observe the reviewed Base spot market for a perp underlying. This never
 * throws: an observation failure degrades to a disclosed unavailable status so
 * the oracle-consensus verdict remains decidable.
 */
export const fetchBasePerpLiquidityEvidence: FetchBasePerpLiquidityEvidence = async (
  input,
  options = {}
) => {
  const assetSymbol = input.assetSymbol.trim().toUpperCase();
  if (!reviewedSpotProfile(assetSymbol)) {
    return {
      status: 'no_reviewed_spot_market',
      assetSymbol,
      reason:
        'No reviewed Base spot market profile exists for this underlying; execution liquidity is not verified by this guard.',
    };
  }
  let snapshot: UniswapV3MarketSnapshot;
  try {
    snapshot = await getUniswapV3MarketSnapshot(baseUniswapV3WethUsdc500Profile(), {
      ...options,
      cache: true,
    });
  } catch {
    return {
      status: 'market_source_unavailable',
      assetSymbol,
      reason:
        'The reviewed spot market source could not be observed; the oracle consensus checks are unaffected.',
    };
  }
  return observedEvidence(assetSymbol, snapshot, input.sizeUsd);
};

/**
 * Advisory concern text for observed evidence. Returns null when the evidence
 * shows nothing unusual; a non-null result escalates an ALLOW to CAUTION.
 */
export function basePerpLiquidityConcern(evidence: BasePerpLiquidityEvidence): string | null {
  if (evidence.status === 'observed') {
    const concerns: string[] = [];
    const twapDeviation = evidence.twapDeviationBpsFromSpot;
    if (twapDeviation !== undefined && twapDeviation >= ELEVATED_TWAP_DEVIATION_BPS) {
      concerns.push(
        `reviewed-pool TWAP deviates ${twapDeviation.toFixed(1)} bps from spot, at or above the ${ELEVATED_TWAP_DEVIATION_BPS} bps advisory band`
      );
    }
    const rung = evidence.declaredSize?.referenceRung;
    if (rung && rung.priceImpactBps >= ELEVATED_PRICE_IMPACT_BPS) {
      concerns.push(
        `declared size lands at a reviewed depth rung with ${rung.priceImpactBps.toFixed(1)} bps price impact, at or above the ${ELEVATED_PRICE_IMPACT_BPS} bps advisory band`
      );
    }
    if (evidence.declaredSize?.beyondReviewedLadder) {
      concerns.push(
        'declared size exceeds the largest reviewed depth rung; deeper execution impact is unverified'
      );
    }
    if (concerns.length === 0) return null;
    return `Liquidity evidence concern: ${concerns.join('; ')}.`;
  }
  if (evidence.status === 'no_reviewed_spot_market') {
    return 'No reviewed Base spot market exists for this underlying; a thin or wash-traded venue market would not be visible to this guard.';
  }
  if (evidence.status === 'market_source_unavailable') {
    return 'Spot liquidity evidence could not be observed; this verdict rests on oracle consensus only.';
  }
  return null;
}
