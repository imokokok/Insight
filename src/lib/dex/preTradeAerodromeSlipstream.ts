import { parseUnits } from 'viem';

import {
  findReviewedAerodromeSlipstreamProfile,
  getAerodromeSlipstreamMarketSnapshotForProfile,
  reviewedAerodromeSlipstreamProfile,
  type AerodromeSlipstreamRpcClient,
  type AerodromeSlipstreamMarketProfile,
  type AerodromeSlipstreamMarketSnapshot,
  type ReviewedAerodromeSlipstreamProfileId,
} from './aerodromeSlipstream';

import type { UniswapV3QuoteDirection } from './uniswapV3Market';

export type ReviewedAerodromeSlipstreamPreTradeProfile = ReviewedAerodromeSlipstreamProfileId;

export interface ReviewedAerodromeSlipstreamPreTradeRequest {
  chainId: number;
  asset: string;
  destinationAsset: string | undefined;
  /**
   * Optional explicit reviewed pool identity. Without it, a route must match
   * exactly one allowlisted profile and direction; ambiguous routes fail
   * closed.
   */
  profileId?: ReviewedAerodromeSlipstreamProfileId;
  /** Exact input amount in human-readable decimal units of the input token. */
  amountIn: string;
}

export interface ReviewedAerodromeSlipstreamPreTradeEvidence {
  profile: ReviewedAerodromeSlipstreamPreTradeProfile;
  venue: 'aerodrome-slipstream';
  market: string;
  /** Direction of the bound quote inside the reviewed pool. */
  direction: UniswapV3QuoteDirection;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: AerodromeSlipstreamMarketSnapshot['block'];
  contracts: Pick<
    AerodromeSlipstreamMarketSnapshot['contracts'],
    'factory' | 'quoterV2' | 'pool' | 'tickSpacing' | 'feePips' | 'codeIdentity'
  >;
  quote: AerodromeSlipstreamMarketSnapshot['quotes'][number];
  spotToken1PerToken0: number;
  twapToken1PerToken0: number;
  twapDeviationBpsFromSpot: number;
  /** Live pool reserves at the pinned block, for venue-liquidity sizing. */
  poolBalances: AerodromeSlipstreamMarketSnapshot['poolBalances'];
}

const DECIMAL_AMOUNT = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;

function normalized(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function selectProfile(request: ReviewedAerodromeSlipstreamPreTradeRequest): {
  profile: ReviewedAerodromeSlipstreamPreTradeProfile;
  definition: AerodromeSlipstreamMarketProfile;
  direction: UniswapV3QuoteDirection;
} | null {
  const route = {
    chainId: request.chainId,
    tokenInSymbol: normalized(request.asset),
    tokenOutSymbol: normalized(request.destinationAsset),
  };
  if (request.profileId) {
    const definition = reviewedAerodromeSlipstreamProfile(request.profileId);
    if (definition.chainId !== route.chainId) return null;
    const token0 = definition.token0.symbol.toUpperCase();
    const token1 = definition.token1.symbol.toUpperCase();
    if (route.tokenInSymbol === token0 && route.tokenOutSymbol === token1) {
      return { profile: request.profileId, definition, direction: 'token0-to-token1' };
    }
    if (route.tokenInSymbol === token1 && route.tokenOutSymbol === token0) {
      return { profile: request.profileId, definition, direction: 'token1-to-token0' };
    }
    return null;
  }
  const forward = findReviewedAerodromeSlipstreamProfile(route);
  if (forward) {
    return {
      profile: forward.id as ReviewedAerodromeSlipstreamPreTradeProfile,
      definition: forward,
      direction: 'token0-to-token1',
    };
  }
  const reverse = findReviewedAerodromeSlipstreamProfile({
    chainId: route.chainId,
    tokenInSymbol: route.tokenOutSymbol,
    tokenOutSymbol: route.tokenInSymbol,
  });
  if (reverse) {
    return {
      profile: reverse.id as ReviewedAerodromeSlipstreamPreTradeProfile,
      definition: reverse,
      direction: 'token1-to-token0',
    };
  }
  return null;
}

function exactAmountInRaw(amountIn: string, decimals: number): bigint {
  if (!DECIMAL_AMOUNT.test(amountIn)) {
    throw new Error(
      'Reviewed Aerodrome Slipstream amountIn must be a positive decimal amount without exponent notation.'
    );
  }
  try {
    const raw = parseUnits(amountIn, decimals);
    if (raw <= 0n) throw new Error('non-positive');
    return raw;
  } catch {
    throw new Error(
      'Reviewed Aerodrome Slipstream amountIn is outside the supported token precision.'
    );
  }
}

/**
 * Quote the exact user-declared amount against one reviewed Aerodrome
 * Slipstream Base pool in an admitted direction (the reviewed pools are
 * two-way single-pair lanes, never multi-hop). It neither prepares a
 * transaction nor accepts arbitrary pools, routers, or routes.
 */
export async function getReviewedAerodromeSlipstreamPreTradeEvidence(
  request: ReviewedAerodromeSlipstreamPreTradeRequest,
  options: {
    rpc?: AerodromeSlipstreamRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<ReviewedAerodromeSlipstreamPreTradeEvidence> {
  const selected = selectProfile(request);
  if (!selected) {
    throw new Error(
      'No reviewed Aerodrome Slipstream pre-trade profile matches this chain and route.'
    );
  }
  const inputDecimals =
    selected.direction === 'token0-to-token1'
      ? selected.definition.token0.decimals
      : selected.definition.token1.decimals;
  const rawAmount = exactAmountInRaw(request.amountIn, inputDecimals);
  const snapshot = await getAerodromeSlipstreamMarketSnapshotForProfile(
    {
      ...selected.definition,
      // This identity can never collide with a whole-token market snapshot.
      // Cache is disabled below because amountIn is per-request, untrusted
      // input after strict parsing and must not create retained cache keys.
      id: `${selected.definition.id}-pretrade-${selected.direction}-${rawAmount.toString()}`,
      quoteAmountsToken0: undefined,
      ...(selected.direction === 'token1-to-token0'
        ? { quoteAmountsToken1Raw: [rawAmount] }
        : { quoteAmountsToken0Raw: [rawAmount] }),
    },
    { ...options, cache: false }
  );
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error('Reviewed Aerodrome Slipstream quote was absent.');
  if (quote.direction !== selected.direction) {
    throw new Error(
      'Reviewed Aerodrome Slipstream quote direction did not match the selected profile direction.'
    );
  }

  return {
    profile: selected.profile,
    venue: snapshot.venue,
    market: snapshot.market,
    direction: quote.direction,
    sourceFreshnessSeconds: snapshot.sourceFreshnessSeconds,
    observedAt: snapshot.observedAt,
    block: snapshot.block,
    contracts: {
      factory: snapshot.contracts.factory,
      quoterV2: snapshot.contracts.quoterV2,
      pool: snapshot.contracts.pool,
      tickSpacing: snapshot.contracts.tickSpacing,
      feePips: snapshot.contracts.feePips,
      codeIdentity: snapshot.contracts.codeIdentity,
    },
    quote,
    spotToken1PerToken0: snapshot.spot.token1PerToken0,
    twapToken1PerToken0: snapshot.twap.token1PerToken0,
    twapDeviationBpsFromSpot: snapshot.twap.deviationBpsFromSpot,
    poolBalances: snapshot.poolBalances,
  };
}
