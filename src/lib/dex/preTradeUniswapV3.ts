import { parseUnits } from 'viem';

import { baseUniswapV3WethUsdcProfile } from './baseUniswapV3';
import { monadUniswapV3WmonUsdcProfile } from './monadUniswapV3';
import {
  getUniswapV3MarketSnapshot,
  type UniswapV3MarketProfile,
  type UniswapV3MarketSnapshot,
} from './uniswapV3Market';

export type ReviewedUniswapV3PreTradeProfile = 'monad-wmon-usdc' | 'base-weth-usdc';

export interface ReviewedUniswapV3PreTradeRequest {
  chainId: number;
  asset: string;
  destinationAsset: string | undefined;
  /** Exact token0 input amount in human-readable decimal units. */
  amountIn: string;
}

export interface ReviewedUniswapV3PreTradeEvidence {
  profile: ReviewedUniswapV3PreTradeProfile;
  venue: 'uniswap-v3';
  market: string;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: UniswapV3MarketSnapshot['block'];
  contracts: Pick<UniswapV3MarketSnapshot['contracts'], 'pool' | 'quoterV2' | 'feeTier'>;
  quote: UniswapV3MarketSnapshot['quotes'][number];
  spotToken1PerToken0: number;
  twapToken1PerToken0: number;
  twapDeviationBpsFromSpot: number;
}

const DECIMAL_AMOUNT = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;

function normalized(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function selectProfile(
  request: ReviewedUniswapV3PreTradeRequest
): { profile: ReviewedUniswapV3PreTradeProfile; definition: UniswapV3MarketProfile } | null {
  const asset = normalized(request.asset);
  const destination = normalized(request.destinationAsset);
  if (request.chainId === 143 && (asset === 'MON' || asset === 'WMON') && destination === 'USDC') {
    return { profile: 'monad-wmon-usdc', definition: monadUniswapV3WmonUsdcProfile() };
  }
  if (request.chainId === 8453 && (asset === 'ETH' || asset === 'WETH') && destination === 'USDC') {
    return { profile: 'base-weth-usdc', definition: baseUniswapV3WethUsdcProfile() };
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
 * market.  This deliberately accepts only the two pairs reviewed for the
 * first pre-trade release and only token0 -> token1: it must never silently
 * substitute a pool, reverse a pair, or turn generic DEX data into evidence
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
  const rawAmount = exactAmountInRaw(request.amountIn, selected.definition.token0.decimals);
  const snapshot = await getUniswapV3MarketSnapshot(
    {
      ...selected.definition,
      // Preserve the raw amount in the internal profile identity for
      // diagnostics. Caching is disabled below because this amount is an
      // untrusted per-request value and must not create retained cache keys.
      id: `${selected.definition.id}-pretrade-${rawAmount.toString()}`,
      quoteAmountsToken0: undefined,
      quoteAmountsToken0Raw: [rawAmount],
    },
    { ...options, cache: false }
  );
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error('Reviewed Uniswap V3 quote was absent.');
  return {
    profile: selected.profile,
    venue: snapshot.venue,
    market: snapshot.market,
    sourceFreshnessSeconds: snapshot.sourceFreshnessSeconds,
    observedAt: snapshot.observedAt,
    block: snapshot.block,
    contracts: {
      pool: snapshot.contracts.pool,
      quoterV2: snapshot.contracts.quoterV2,
      feeTier: snapshot.contracts.feeTier,
    },
    quote,
    spotToken1PerToken0: snapshot.spot.token1PerToken0,
    twapToken1PerToken0: snapshot.twap.token1PerToken0,
    twapDeviationBpsFromSpot: snapshot.twap.deviationBpsFromSpot,
  };
}
