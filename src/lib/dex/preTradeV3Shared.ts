import { parseUnits } from 'viem';

import type { UniswapV3QuoteDirection } from './uniswapV3Market';

/**
 * Shared scaffolding for "reviewed V3-style pre-trade evidence" builders
 * (Uniswap V3, Aerodrome Slipstream, and future concentrated-liquidity
 * venues): strict decimal-amount parsing, direction-aware input-decimal
 * selection, and the quote-extraction contract. Route/profile admission and
 * evidence assembly stay venue-specific on purpose — they encode each
 * venue's reviewed pool set and contract surface.
 */

const DECIMAL_AMOUNT = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;

export function normalizedV3Symbol(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

export function reviewedV3InputDecimals(
  direction: UniswapV3QuoteDirection,
  tokens: { token0: { decimals: number }; token1: { decimals: number } }
): number {
  return direction === 'token0-to-token1' ? tokens.token0.decimals : tokens.token1.decimals;
}

/** Strict positive-decimal parse; the venue label reproduces per-venue wording. */
export function exactV3StyleAmountInRaw(
  venueLabel: string,
  amountIn: string,
  decimals: number
): bigint {
  if (!DECIMAL_AMOUNT.test(amountIn)) {
    throw new Error(
      `Reviewed ${venueLabel} amountIn must be a positive decimal amount without exponent notation.`
    );
  }
  try {
    const raw = parseUnits(amountIn, decimals);
    if (raw <= 0n) throw new Error('non-positive');
    return raw;
  } catch {
    throw new Error(`Reviewed ${venueLabel} amountIn is outside the supported token precision.`);
  }
}

/** Extract the single bound quote and enforce direction agreement, fail closed. */
export function reviewedV3StyleQuote<Q extends { direction: UniswapV3QuoteDirection }>(
  venueLabel: string,
  snapshot: { quotes: Q[] },
  expectedDirection: UniswapV3QuoteDirection
): Q {
  const quote = snapshot.quotes[0];
  if (!quote) throw new Error(`Reviewed ${venueLabel} quote was absent.`);
  if (quote.direction !== expectedDirection) {
    throw new Error(
      `Reviewed ${venueLabel} quote direction did not match the selected profile direction.`
    );
  }
  return quote;
}
