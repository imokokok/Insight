import { parseUnits } from 'viem';

import { baseUniswapV3WethUsdcProfile, baseUniswapV3WethUsdc500Profile } from './baseUniswapV3';
import { monadUniswapV3WmonUsdcProfile } from './monadUniswapV3';
import { reviewedPancakeSwapV3Profile } from './pancakeSwapV3';
import {
  getUniswapV3MarketSnapshot,
  type UniswapV3MarketProfile,
  type UniswapV3MarketSnapshot,
  type UniswapV3CompatibleVenue,
  type UniswapV3QuoteDirection,
} from './uniswapV3Market';

export type ReviewedUniswapV3PreTradeProfile =
  | 'monad-wmon-usdc'
  | 'base-weth-usdc'
  | 'base-uniswap-v3-weth-usdc-500'
  | 'base-pancakeswap-v3-usdc-usdt'
  | 'bnb-pancakeswap-v3-usdt-usdc';

/**
 * Explicit pool selection for the Base WETH→USDC route, which now has two
 * reviewed profiles. Without it the legacy 0.3% pool is admitted so existing
 * callers keep their binding semantics; the deeper 0.05% pool must be named.
 */
export type ReviewedBaseWethUsdcProfileId =
  | 'base-uniswap-v3-weth-usdc'
  | 'base-uniswap-v3-weth-usdc-500';

export interface ReviewedUniswapV3PreTradeRequest {
  chainId: number;
  asset: string;
  destinationAsset: string | undefined;
  /** Optional explicit reviewed pool identity for routes with multiple pools. */
  profileId?: ReviewedBaseWethUsdcProfileId;
  /** Exact input amount in human-readable decimal units of the input token. */
  amountIn: string;
}

export interface ReviewedUniswapV3PreTradeEvidence {
  profile: ReviewedUniswapV3PreTradeProfile;
  venue: UniswapV3CompatibleVenue;
  market: string;
  /** Direction of the bound quote inside the reviewed pool. */
  direction: UniswapV3QuoteDirection;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: UniswapV3MarketSnapshot['block'];
  contracts: Pick<
    UniswapV3MarketSnapshot['contracts'],
    'factory' | 'pool' | 'quoterV2' | 'feeTier' | 'codeIdentity'
  >;
  quote: UniswapV3MarketSnapshot['quotes'][number];
  spotToken1PerToken0: number;
  twapToken1PerToken0: number;
  twapDeviationBpsFromSpot: number;
  /** Live pool reserves at the pinned block, for venue-liquidity sizing. */
  poolBalances: UniswapV3MarketSnapshot['poolBalances'];
}

const DECIMAL_AMOUNT = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;

function normalized(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

interface SelectedProfile {
  profile: ReviewedUniswapV3PreTradeProfile;
  definition: UniswapV3MarketProfile;
  direction: UniswapV3QuoteDirection;
}

function selectProfile(request: ReviewedUniswapV3PreTradeRequest): SelectedProfile | null {
  const asset = normalized(request.asset);
  const destination = normalized(request.destinationAsset);
  if (request.chainId === 143 && (asset === 'MON' || asset === 'WMON') && destination === 'USDC') {
    return {
      profile: 'monad-wmon-usdc',
      definition: monadUniswapV3WmonUsdcProfile(),
      direction: 'token0-to-token1',
    };
  }
  if (request.chainId === 8453 && (asset === 'ETH' || asset === 'WETH') && destination === 'USDC') {
    if (request.profileId === 'base-uniswap-v3-weth-usdc-500') {
      return {
        profile: 'base-uniswap-v3-weth-usdc-500',
        definition: baseUniswapV3WethUsdc500Profile(),
        direction: 'token0-to-token1',
      };
    }
    return {
      profile: 'base-weth-usdc',
      definition: baseUniswapV3WethUsdcProfile(),
      direction: 'token0-to-token1',
    };
  }
  if (request.chainId === 8453 && asset === 'USDC' && destination === 'USDT') {
    return {
      profile: 'base-pancakeswap-v3-usdc-usdt',
      definition: reviewedPancakeSwapV3Profile('base-pancakeswap-v3-usdc-usdt-100'),
      direction: 'token0-to-token1',
    };
  }
  // Reviewed reverse stable lane: the same PancakeSwap pool, quoted USDT→USDC.
  if (request.chainId === 8453 && asset === 'USDT' && destination === 'USDC') {
    return {
      profile: 'base-pancakeswap-v3-usdc-usdt',
      definition: reviewedPancakeSwapV3Profile('base-pancakeswap-v3-usdc-usdt-100'),
      direction: 'token1-to-token0',
    };
  }
  // BNB stable lane: the reviewed BNB PancakeSwap pool, quoted USDT→USDC
  // (USDT is token0 there) and the reverse USDC→USDT direction.
  if (request.chainId === 56 && asset === 'USDT' && destination === 'USDC') {
    return {
      profile: 'bnb-pancakeswap-v3-usdt-usdc',
      definition: reviewedPancakeSwapV3Profile('bnb-pancakeswap-v3-usdt-usdc-100'),
      direction: 'token0-to-token1',
    };
  }
  if (request.chainId === 56 && asset === 'USDC' && destination === 'USDT') {
    return {
      profile: 'bnb-pancakeswap-v3-usdt-usdc',
      definition: reviewedPancakeSwapV3Profile('bnb-pancakeswap-v3-usdt-usdc-100'),
      direction: 'token1-to-token0',
    };
  }
  return null;
}

function exactAmountInRaw(amountIn: string, decimals: number): bigint {
  if (!DECIMAL_AMOUNT.test(amountIn)) {
    throw new Error(
      'Reviewed Uniswap V3 amountIn must be a positive decimal amount without exponent notation.'
    );
  }
  try {
    const raw = parseUnits(amountIn, decimals);
    if (raw <= 0n) throw new Error('non-positive');
    return raw;
  } catch {
    throw new Error('Reviewed Uniswap V3 amountIn is outside the supported token precision.');
  }
}

/**
 * Obtain a block-pinned, exact-notional quote from one reviewed Uniswap V3
 * market. It deliberately accepts only the reviewed markets and directions
 * declared above: it must never silently substitute a pool, reverse a pair
 * that is not explicitly admitted, or turn generic DEX data into evidence
 * about the caller's declared trade.
 */
export async function getReviewedUniswapV3PreTradeEvidence(
  request: ReviewedUniswapV3PreTradeRequest,
  options: { nowMs?: number; signal?: AbortSignal } = {}
): Promise<ReviewedUniswapV3PreTradeEvidence> {
  const selected = selectProfile(request);
  if (!selected) {
    throw new Error('No reviewed Uniswap V3 pre-trade profile matches this chain and route.');
  }
  const inputDecimals =
    selected.direction === 'token0-to-token1'
      ? selected.definition.token0.decimals
      : selected.definition.token1.decimals;
  const rawAmount = exactAmountInRaw(request.amountIn, inputDecimals);
  const snapshot = await getUniswapV3MarketSnapshot(
    {
      ...selected.definition,
      // Preserve the raw amount in the internal profile identity for
      // diagnostics. Caching is disabled below because this amount is an
      // untrusted per-request value and must not create retained cache keys.
      id: `${selected.definition.id}-pretrade-${selected.direction}-${rawAmount.toString()}`,
      quoteAmountsToken0: undefined,
      ...(selected.direction === 'token1-to-token0'
        ? { quoteAmountsToken1Raw: [rawAmount] }
        : { quoteAmountsToken0Raw: [rawAmount] }),
    },
    { ...options, cache: false }
  );
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error('Reviewed Uniswap V3 quote was absent.');
  if (quote.direction !== selected.direction) {
    throw new Error(
      'Reviewed Uniswap V3 quote direction did not match the selected profile direction.'
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
      pool: snapshot.contracts.pool,
      quoterV2: snapshot.contracts.quoterV2,
      feeTier: snapshot.contracts.feeTier,
      ...(snapshot.contracts.codeIdentity ? { codeIdentity: snapshot.contracts.codeIdentity } : {}),
    },
    quote,
    spotToken1PerToken0: snapshot.spot.token1PerToken0,
    twapToken1PerToken0: snapshot.twap.token1PerToken0,
    twapDeviationBpsFromSpot: snapshot.twap.deviationBpsFromSpot,
    poolBalances: snapshot.poolBalances,
  };
}
