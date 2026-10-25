/**
 * Hyperliquid perpetual IOC-order preparation.
 *
 * Insight deliberately produces an unsigned action only. Hyperliquid uses a
 * specialised L1 action-signing scheme, and the account or approved agent
 * wallet must sign and submit the action in the user's own process. Keeping
 * that boundary means Insight has neither custody nor standing authority to
 * create, cancel, or amend a user's orders.
 */

import { keccak256, stringToHex } from 'viem';

import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  getHyperliquidPerpExecutionMarketState,
  hyperliquidPerpMarketProfile,
  type HyperliquidPerpBookLevel,
  type HyperliquidReviewedPerpMarket,
} from './hyperliquidPerpMarket';

const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const CLIENT_ORDER_ID = /^0x[0-9a-fA-F]{32}$/;
const MAX_ORDER_NOTIONAL_USD = 1_000_000_000;

export type HyperliquidPerpOrderSide = 'buy' | 'sell';

export interface HyperliquidPerpOrderPreflightRequest {
  market: HyperliquidReviewedPerpMarket;
  side: HyperliquidPerpOrderSide;
  /** Exact base size; never a float or exponent notation. */
  size: string;
  /** Exact IOC limit price; never a float or exponent notation. */
  limitPrice: string;
  reduceOnly: boolean;
  /** Client-generated 128-bit ID used to later query the exact order. */
  clientOrderId: string;
  /** Hard notional cap that must contain size × limit price. */
  maxNotionalUsd: number;
  /** Maximum L2 displayed-book impact from the best executable level. */
  maxPriceImpactBps: number;
  /** Maximum absolute mark-vs-exchange-oracle divergence. */
  maxMarkOracleDeviationBps: number;
  /** Defaults to true: an estimated partial IOC fill is refused. */
  requireFullFill?: boolean;
  /** Short expiry, included in the user-signed exchange envelope. Defaults to 30 seconds. */
  expiresAfterSeconds?: number;
}

export interface HyperliquidPerpOrderPreflight {
  schema: 'insight.hyperliquid-perp-order-preflight.v1';
  verdict: 'READY_TO_SIGN' | 'BLOCK';
  intentHash: `0x${string}`;
  observedAt: string;
  market: {
    coin: HyperliquidReviewedPerpMarket;
    assetIndex: number;
    sourceFreshnessSeconds: number;
    bookTimestamp: string;
    sizeDecimals: number;
    markPrice: number;
    oraclePrice: number;
    markOracleDeviationBps: number;
  };
  requestedOrder: {
    side: HyperliquidPerpOrderSide;
    size: string;
    limitPrice: string;
    reduceOnly: boolean;
    clientOrderId: `0x${string}`;
    maxNotionalUsd: number;
  };
  displayedBookEstimate: {
    bestExecutablePrice: number | null;
    marketable: boolean;
    filledBase: number;
    unfilledBase: number;
    filledNotionalUsd: number;
    averagePrice: number | null;
    priceImpactBps: number | null;
    complete: boolean;
  };
  policy: {
    maxPriceImpactBps: number;
    maxMarkOracleDeviationBps: number;
    requireFullFill: boolean;
  };
  blockingReasons: string[];
  /** Present only when every preflight gate passed. Sign this envelope locally. */
  unsignedExchangeEnvelope: {
    action: {
      type: 'order';
      orders: readonly [
        {
          a: number;
          b: boolean;
          p: string;
          s: string;
          r: boolean;
          t: { limit: { tif: 'Ioc' } };
          c: `0x${string}`;
        },
      ];
      grouping: 'na';
    };
    /** The signer chooses a fresh nonce immediately before signing. */
    expiresAfter: number;
  } | null;
  caveats: string[];
}

export class HyperliquidPerpOrderPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HyperliquidPerpOrderPreflightError';
  }
}

function assertFiniteInRange(value: number, field: string, minimum: number, maximum: number): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new HyperliquidPerpOrderPreflightError(`Hyperliquid order ${field} is invalid.`);
  }
}

function canonicalDecimal(
  value: string,
  field: string
): { text: string; value: number; decimals: number } {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL.test(value)) {
    throw new HyperliquidPerpOrderPreflightError(
      `Hyperliquid order ${field} must be a positive decimal string without exponent notation.`
    );
  }
  const [wholeInput, fractionalInput = ''] = value.split('.');
  const whole = wholeInput!.replace(/^0+(?=\d)/, '');
  const fractional = fractionalInput.replace(/0+$/, '');
  const text = fractional.length > 0 ? `${whole}.${fractional}` : whole;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_ORDER_NOTIONAL_USD) {
    throw new HyperliquidPerpOrderPreflightError(
      `Hyperliquid order ${field} is outside Insight's reviewed range.`
    );
  }
  return { text, value: parsed, decimals: fractional.length };
}

function assertHyperliquidPerpPriceTick(
  price: { text: string; decimals: number },
  sizeDecimals: number
): void {
  const maximumPriceDecimals = 6 - sizeDecimals;
  if (price.decimals > maximumPriceDecimals) {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid perpetual price exceeds the market tick precision.'
    );
  }
  if (price.decimals > 0) {
    const significantDigits = price.text.replace('.', '').replace(/^0+/, '').length;
    if (significantDigits > 5) {
      throw new HyperliquidPerpOrderPreflightError(
        'Hyperliquid perpetual fractional price exceeds five significant figures.'
      );
    }
  }
}

function bps(numerator: number, denominator: number): number {
  if (!(denominator > 0) || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid order cannot derive a finite price ratio.'
    );
  }
  return ((numerator - denominator) / denominator) * 10_000;
}

function estimateIocFill(
  levels: readonly HyperliquidPerpBookLevel[],
  side: HyperliquidPerpOrderSide,
  requestedBase: number,
  limitPrice: number
): HyperliquidPerpOrderPreflight['displayedBookEstimate'] {
  const executable = levels.filter((level) =>
    side === 'buy' ? level.price <= limitPrice : level.price >= limitPrice
  );
  let remaining = requestedBase;
  let filledBase = 0;
  let filledNotionalUsd = 0;
  for (const level of executable) {
    if (remaining <= 0) break;
    const filled = Math.min(remaining, level.size);
    filledBase += filled;
    filledNotionalUsd += filled * level.price;
    remaining -= filled;
  }
  const averagePrice = filledBase > 0 ? filledNotionalUsd / filledBase : null;
  const bestExecutablePrice = executable[0]?.price ?? null;
  const priceImpactBps =
    averagePrice !== null && bestExecutablePrice !== null
      ? side === 'buy'
        ? bps(averagePrice, bestExecutablePrice)
        : bps(bestExecutablePrice, averagePrice)
      : null;
  return {
    bestExecutablePrice,
    marketable: bestExecutablePrice !== null,
    filledBase,
    unfilledBase: Math.max(0, requestedBase - filledBase),
    filledNotionalUsd,
    averagePrice,
    priceImpactBps,
    complete: requestedBase - filledBase <= 1e-12,
  };
}

/**
 * Build an immediate-or-cancel order action after checking the reviewed market
 * metadata, live tick/lot rules, displayed book impact, exchange mark/oracle
 * divergence, a caller-set notional cap, and an explicit short expiry.
 */
export async function prepareHyperliquidPerpOrder(
  request: HyperliquidPerpOrderPreflightRequest,
  options: { fetcher?: typeof fetch; nowMs?: number; signal?: AbortSignal } = {}
): Promise<HyperliquidPerpOrderPreflight> {
  if (request.side !== 'buy' && request.side !== 'sell') {
    throw new HyperliquidPerpOrderPreflightError('Hyperliquid order side must be buy or sell.');
  }
  if (typeof request.reduceOnly !== 'boolean') {
    throw new HyperliquidPerpOrderPreflightError('Hyperliquid order reduceOnly must be boolean.');
  }
  if (typeof request.clientOrderId !== 'string' || !CLIENT_ORDER_ID.test(request.clientOrderId)) {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid order clientOrderId must be a 16-byte 0x-prefixed hex value.'
    );
  }
  assertFiniteInRange(request.maxNotionalUsd, 'maxNotionalUsd', 1, MAX_ORDER_NOTIONAL_USD);
  assertFiniteInRange(request.maxPriceImpactBps, 'maxPriceImpactBps', 0, 10_000);
  assertFiniteInRange(request.maxMarkOracleDeviationBps, 'maxMarkOracleDeviationBps', 0, 10_000);
  const requireFullFill = request.requireFullFill ?? true;
  if (typeof requireFullFill !== 'boolean') {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid order requireFullFill must be boolean.'
    );
  }
  const expiresAfterSeconds = request.expiresAfterSeconds ?? 30;
  if (
    !Number.isSafeInteger(expiresAfterSeconds) ||
    expiresAfterSeconds < 5 ||
    expiresAfterSeconds > 120
  ) {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid order expiresAfterSeconds must be an integer between 5 and 120.'
    );
  }

  const state = await getHyperliquidPerpExecutionMarketState(
    hyperliquidPerpMarketProfile(request.market),
    options
  );
  const size = canonicalDecimal(request.size, 'size');
  if (size.decimals > state.perpetual.sizeDecimals) {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid perpetual size exceeds the market lot precision.'
    );
  }
  const limitPrice = canonicalDecimal(request.limitPrice, 'limitPrice');
  assertHyperliquidPerpPriceTick(limitPrice, state.perpetual.sizeDecimals);
  const requestedNotionalUsd = size.value * limitPrice.value;
  if (!Number.isFinite(requestedNotionalUsd) || requestedNotionalUsd > request.maxNotionalUsd) {
    throw new HyperliquidPerpOrderPreflightError(
      'Hyperliquid order limit notional exceeds the caller-set maximum.'
    );
  }

  const estimate = estimateIocFill(
    request.side === 'buy' ? state.book.asks : state.book.bids,
    request.side,
    size.value,
    limitPrice.value
  );
  const markOracleDeviationBps = Math.abs(
    bps(state.perpetual.markPrice, state.perpetual.oraclePrice)
  );
  const blockingReasons: string[] = [];
  if (!estimate.marketable) {
    blockingReasons.push('The IOC limit does not cross the current displayed L2 book.');
  }
  if (requireFullFill && !estimate.complete) {
    blockingReasons.push(
      'The displayed L2 book cannot fully fill the requested IOC size at the limit price.'
    );
  }
  if (estimate.priceImpactBps === null) {
    blockingReasons.push(
      'No displayed executable liquidity is available for the requested IOC order.'
    );
  } else if (estimate.priceImpactBps > request.maxPriceImpactBps) {
    blockingReasons.push(
      `Displayed-book impact ${estimate.priceImpactBps.toFixed(2)} bps exceeds the caller limit.`
    );
  }
  if (markOracleDeviationBps > request.maxMarkOracleDeviationBps) {
    blockingReasons.push(
      `Exchange mark/oracle divergence ${markOracleDeviationBps.toFixed(2)} bps exceeds the caller limit.`
    );
  }

  const expiresAfter = (options.nowMs ?? Date.now()) + expiresAfterSeconds * 1_000;
  const action = {
    type: 'order' as const,
    orders: [
      {
        a: state.assetIndex,
        b: request.side === 'buy',
        p: limitPrice.text,
        s: size.text,
        r: request.reduceOnly,
        t: { limit: { tif: 'Ioc' as const } },
        c: request.clientOrderId.toLowerCase() as `0x${string}`,
      },
    ] as const,
    grouping: 'na' as const,
  };
  const intentHash = keccak256(
    stringToHex(
      canonicalJsonString({
        schema: 'insight.hyperliquid-perp-order-preflight.v1',
        action,
        expiresAfter,
        observedAt: state.observedAt,
        bookTimestamp: state.book.timestamp,
        requestedNotionalUsd,
        markOracleDeviationBps,
      })
    )
  );

  return {
    schema: 'insight.hyperliquid-perp-order-preflight.v1',
    verdict: blockingReasons.length === 0 ? 'READY_TO_SIGN' : 'BLOCK',
    intentHash,
    observedAt: state.observedAt,
    market: {
      coin: state.coin,
      assetIndex: state.assetIndex,
      sourceFreshnessSeconds: state.sourceFreshnessSeconds,
      bookTimestamp: state.book.timestamp,
      sizeDecimals: state.perpetual.sizeDecimals,
      markPrice: state.perpetual.markPrice,
      oraclePrice: state.perpetual.oraclePrice,
      markOracleDeviationBps,
    },
    requestedOrder: {
      side: request.side,
      size: size.text,
      limitPrice: limitPrice.text,
      reduceOnly: request.reduceOnly,
      clientOrderId: request.clientOrderId.toLowerCase() as `0x${string}`,
      maxNotionalUsd: request.maxNotionalUsd,
    },
    displayedBookEstimate: estimate,
    policy: {
      maxPriceImpactBps: request.maxPriceImpactBps,
      maxMarkOracleDeviationBps: request.maxMarkOracleDeviationBps,
      requireFullFill,
    },
    blockingReasons,
    unsignedExchangeEnvelope:
      blockingReasons.length === 0
        ? {
            action,
            expiresAfter,
          }
        : null,
    caveats: [
      'Insight did not create a nonce, signature, API wallet, or exchange submission. Sign this exact envelope only in the account or approved agent wallet process.',
      'The estimate consumes only the current displayed L2 levels. Matching priority, fees, margin, open-interest limits, exchange price bands, and later book changes can still prevent or change a fill.',
      'IOC is intentional: this reviewed lane never prepares a resting order. A blocked result must not be signed or submitted.',
    ],
  };
}
