/**
 * Shared assessment skeleton for reviewed concentrated-liquidity pool quotes
 * (Uniswap V3 and Aerodrome Slipstream). The two evidence sources apply the
 * identical policy flow — availability gate, direction binding, deviation vs
 * caller anchor, price-impact cap, and spot/TWAP divergence cap — differing
 * only in reason codes, display wording, and the venue-specific evidence tail.
 *
 * Message strings are assembled verbatim from the previous duplicated
 * implementations; both callers must keep their labels pinned so emitted
 * reason texts (which feed signed assessments) stay byte-identical.
 */

import {
  addReason,
  deviationBps,
  type DecisionInputReason,
  type DecisionInputReasonCode,
} from './shared';

/** Caller-declared policy for one reviewed pool quote. */
export interface ReviewedPoolQuotePolicy {
  maxQuoteDeviationBps: number;
  maxTwapDeviationBps: number;
  /** Same-unit anchor (destination tokens per source token) for deviation math. */
  routeEffectiveDestinationPerSource?: number;
}

/** Normalized shape shared by both reviewed pre-trade evidence payloads. */
export interface ReviewedPoolQuoteInput {
  quote: {
    direction: 'token0-to-token1' | 'token1-to-token0';
    effectiveToken1PerToken0?: number;
    effectiveToken0PerToken1?: number;
    priceImpactBps: number;
  };
  twapDeviationBpsFromSpot: number;
}

export interface ReviewedPoolQuoteCodes {
  unavailable: DecisionInputReasonCode;
  quoteDivergence: DecisionInputReasonCode;
  priceImpact: DecisionInputReasonCode;
  twapDeviation: DecisionInputReasonCode;
}

export interface ReviewedPoolQuoteContext {
  /** True when the bound quote direction is token0-to-token1. */
  forward: boolean;
  quoteDeviationBps: number | null;
}

export interface ReviewedPoolQuoteAssessment<TEvidence> {
  evidence: TEvidence | null;
}

export function assessReviewedPoolQuote<TEvidence>(args: {
  /** Display name used inside emitted reason messages (e.g. "Uniswap V3"). */
  displayName: string;
  /** Pool descriptor for the unavailable message (e.g. "concentrated-liquidity"). */
  unavailablePoolDescriptor: string;
  codes: ReviewedPoolQuoteCodes;
  policy: ReviewedPoolQuotePolicy | null | undefined;
  input: ReviewedPoolQuoteInput | null | undefined;
  maxSlippageBps: number;
  quotePriceUsd: number;
  reasons: DecisionInputReason[];
  /** Called only when all gates pass; builds the venue-specific evidence tail. */
  buildEvidence: (ctx: ReviewedPoolQuoteContext) => TEvidence;
}): ReviewedPoolQuoteAssessment<TEvidence> {
  const {
    displayName,
    unavailablePoolDescriptor,
    codes,
    policy,
    input,
    maxSlippageBps,
    quotePriceUsd,
    reasons,
  } = args;

  if (!policy) return { evidence: null };
  if (!input) {
    addReason(
      reasons,
      codes.unavailable,
      'insufficient_evidence',
      `No fresh block-pinned quote is available from the reviewed ${unavailablePoolDescriptor} pool for this exact route and amount.`
    );
    return { evidence: null };
  }

  const forward = input.quote.direction !== 'token1-to-token0';
  const effectivePerSource = forward
    ? input.quote.effectiveToken1PerToken0
    : input.quote.effectiveToken0PerToken1;
  if (effectivePerSource === undefined || !Number.isFinite(effectivePerSource)) {
    addReason(
      reasons,
      codes.unavailable,
      'insufficient_evidence',
      `The reviewed ${displayName} quote is missing a usable effective price for the bound direction.`
    );
    return { evidence: null };
  }
  // Prefer the same-unit anchor (destination tokens per source token) supplied
  // by the caller's own prepared route quote; fall back to the USD-per-source
  // `quotePriceUsd`, which is only numerically comparable when the destination
  // token is a $1 stablecoin.
  const anchorRate = policy.routeEffectiveDestinationPerSource;
  const anchor =
    anchorRate !== undefined && Number.isFinite(anchorRate) && anchorRate > 0
      ? anchorRate
      : quotePriceUsd;
  const quoteDeviationBps = deviationBps(effectivePerSource, anchor);
  if (quoteDeviationBps !== null && quoteDeviationBps > policy.maxQuoteDeviationBps) {
    addReason(
      reasons,
      codes.quoteDivergence,
      'block',
      `The reviewed ${displayName} quote differs from the submitted venue quote by ${quoteDeviationBps.toFixed(1)} bps; the limit is ${policy.maxQuoteDeviationBps} bps.`
    );
  }
  if (input.quote.priceImpactBps > maxSlippageBps) {
    addReason(
      reasons,
      codes.priceImpact,
      'block',
      `The reviewed ${displayName} exact-input quote has ${input.quote.priceImpactBps.toFixed(1)} bps price impact; the declared slippage limit is ${maxSlippageBps} bps.`
    );
  }
  if (input.twapDeviationBpsFromSpot > policy.maxTwapDeviationBps) {
    addReason(
      reasons,
      codes.twapDeviation,
      'block',
      `The reviewed ${displayName} spot/TWAP divergence is ${input.twapDeviationBpsFromSpot.toFixed(1)} bps; the limit is ${policy.maxTwapDeviationBps} bps.`
    );
  }

  return { evidence: args.buildEvidence({ forward, quoteDeviationBps }) };
}
