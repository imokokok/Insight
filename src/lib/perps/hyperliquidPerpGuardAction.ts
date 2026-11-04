/**
 * Exact-order binding for the Hyperliquid Perp Guard.
 *
 * The Base perp guard binds a decision to EVM calldata. Hyperliquid orders are
 * not EVM transactions: the caller signs a specialised L1 action envelope in
 * their own wallet process. This module therefore binds a guard assessment to
 * the exact unsigned exchange envelope produced by the reviewed IOC order
 * preflight (prepareHyperliquidPerpOrder) — one order, IOC-only, no resting
 * order, no substitution of any field after assessment.
 *
 * Insight signs risk assessment evidence only. It never creates a nonce, a
 * signature, or an exchange submission, and the returned decisionHash is not a
 * user authorization; PriorSeal (or another authorization system) must bind it
 * to the same exact envelope independently.
 */

import { keccak256 } from 'viem';
import { z } from 'zod';

import {
  HYPERLIQUID_MAX_PERP_BUILDER_FEE_TENTHS_BPS,
  type HyperliquidPerpOrderPreflight,
} from '@/lib/dex/hyperliquidPerpOrder';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  HYPERLIQUID_PERPS_PROTOCOL_ID,
  type HyperliquidPerpGuardResult,
} from './hyperliquidPerpGuard';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const CLIENT_ORDER_ID = /^0x[0-9a-fA-F]{32}$/;
const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

/**
 * Maximum relative distance between the caller-declared post-action notional
 * assessed by the guard and the notional implied by the bound envelope
 * (size × limit price). Beyond this the binding fails closed: the caller must
 * re-assess at the actual declared size.
 */
export const HYPERLIQUID_PERP_BINDING_NOTIONAL_TOLERANCE = 0.1;

/**
 * The exact unsigned exchange envelope accepted for binding. It mirrors the
 * preflight output: a single IOC limit order with optional builder fee, plus
 * the expiring envelope timestamp. A fresh nonce is chosen by the signer at
 * signing time and is deliberately not part of the binding.
 */
export const HyperliquidPerpOrderEnvelopeSchema = z
  .object({
    action: z
      .object({
        type: z.literal('order'),
        orders: z
          .array(
            z
              .object({
                a: z.number().int().nonnegative(),
                b: z.boolean(),
                p: z.string().regex(POSITIVE_DECIMAL),
                s: z.string().regex(POSITIVE_DECIMAL),
                r: z.literal(false),
                t: z.object({ limit: z.object({ tif: z.literal('Ioc') }).strict() }).strict(),
                c: z.string().regex(CLIENT_ORDER_ID),
              })
              .strict()
          )
          .length(1),
        grouping: z.literal('na'),
        builder: z
          .object({
            b: z.string().regex(ADDRESS),
            f: z.number().int().min(1).max(HYPERLIQUID_MAX_PERP_BUILDER_FEE_TENTHS_BPS),
          })
          .strict()
          .optional(),
      })
      .strict(),
    expiresAfter: z.number().int().nonnegative(),
  })
  .strict();
export type HyperliquidPerpOrderEnvelope = z.infer<typeof HyperliquidPerpOrderEnvelopeSchema>;

export interface HyperliquidPerpOrderBinding {
  /** keccak256 over the canonical unsigned envelope; the exact signed subject. */
  intentHash: `0x${string}`;
  coin: string;
  assetIndex: number;
  isBuy: boolean;
  size: string;
  limitPrice: string;
  reduceOnly: false;
  expiresAfter: number;
  /** size × limit price, the notional implied by the bound envelope. */
  impliedSizeUsd: number;
  builder: { b: string; f: number } | null;
}

export interface HyperliquidPerpExactOrder {
  guard: HyperliquidPerpGuardResult;
  order: HyperliquidPerpOrderEnvelope;
  binding: HyperliquidPerpOrderBinding;
}

const EXPECTED_TIF = 'Ioc';

/**
 * Validate one unsigned exchange envelope against a guard result and derive
 * the immutable binding. Fails closed on any mismatch between the assessed
 * action and the envelope, an expired envelope, a resting order type, a
 * reduce-only order, an unknown asset index, or an implied notional that
 * departs from the assessed declared size beyond the reviewed tolerance.
 */
export function bindHyperliquidPerpExactOrder(
  guard: HyperliquidPerpGuardResult,
  rawOrder: unknown,
  options: { nowMs?: number } = {}
): HyperliquidPerpExactOrder {
  const order = HyperliquidPerpOrderEnvelopeSchema.parse(rawOrder);
  const nowMs = options.nowMs ?? Date.now();

  if (guard.schema !== 'insight.hyperliquid-perp-guard.v1') {
    throw new Error('Guard result is not an insight.hyperliquid-perp-guard.v1 assessment');
  }
  if (guard.protocolId !== HYPERLIQUID_PERPS_PROTOCOL_ID) {
    throw new Error('Guard result protocol does not match the Hyperliquid perp guard');
  }
  if (order.expiresAfter <= nowMs) {
    throw new Error('Hyperliquid order envelope has already expired');
  }
  if (order.expiresAfter > nowMs + 120_000) {
    throw new Error(
      'Hyperliquid order envelope expiry is outside the reviewed 5-120 second window'
    );
  }

  const action = guard.action;
  const orderRequest = order.action.orders[0]!;
  if (orderRequest.t.limit.tif !== EXPECTED_TIF) {
    throw new Error('Hyperliquid guard binds IOC orders only');
  }
  if (orderRequest.b !== (action === 'open_long')) {
    throw new Error(`Envelope side does not match the assessed ${action} action`);
  }
  if (guard.verdict === 'BLOCK') {
    throw new Error('A BLOCK verdict must not be bound to an exact order');
  }

  // The asset index must be re-observed by the caller from the same fresh
  // market read that the preflight used; the guard cannot validate it against
  // a static table because Hyperliquid can list or reindex markets. The
  // binding therefore carries it verbatim and the attestation commits to it.
  const sizeValue = Number(orderRequest.s);
  const priceValue = Number(orderRequest.p);
  const impliedSizeUsd = sizeValue * priceValue;
  if (
    !Number.isFinite(impliedSizeUsd) ||
    impliedSizeUsd <= 0 ||
    Math.abs(impliedSizeUsd - guard.projected.sizeUsd) / guard.projected.sizeUsd >
      HYPERLIQUID_PERP_BINDING_NOTIONAL_TOLERANCE
  ) {
    throw new Error(
      'Envelope implied notional departs from the assessed declared size beyond the reviewed tolerance; re-assess at the actual size'
    );
  }

  const binding: HyperliquidPerpOrderBinding = {
    intentHash: hyperliquidPerpOrderIntentHash(order),
    coin: guard.market.assetSymbol,
    assetIndex: orderRequest.a,
    isBuy: orderRequest.b,
    size: orderRequest.s,
    limitPrice: orderRequest.p,
    reduceOnly: false,
    expiresAfter: order.expiresAfter,
    impliedSizeUsd,
    builder: order.action.builder ? { ...order.action.builder } : null,
  };
  return { guard, order, binding };
}

/**
 * Structural envelope accepted by the intent hash: it covers both the zod
 * parsed envelope and the preflight's readonly output type.
 */
type EnvelopeLike = {
  action: {
    type: 'order';
    orders: readonly {
      a: number;
      b: boolean;
      p: string;
      s: string;
      r: boolean;
      t: { limit: { tif: 'Ioc' } };
      c: string;
    }[];
    grouping: 'na';
    builder?: { b: string; f: number };
  };
  expiresAfter: number;
};

export function hyperliquidPerpOrderIntentHash(order: EnvelopeLike): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(order)));
}

/**
 * Optional sanity check used by tooling: confirm a binding was derived from
 * the preflight's own unsigned envelope (same intent hash).
 */
export function assertBindingMatchesPreflight(
  binding: HyperliquidPerpOrderBinding,
  preflight: Pick<HyperliquidPerpOrderPreflight, 'intentHash' | 'unsignedExchangeEnvelope'>
): void {
  if (
    !preflight.unsignedExchangeEnvelope ||
    preflight.intentHash !== hyperliquidPerpOrderIntentHash(preflight.unsignedExchangeEnvelope)
  ) {
    throw new Error('Preflight envelope is not READY_TO_SIGN or its intent hash changed');
  }
  if (binding.intentHash !== preflight.intentHash) {
    throw new Error('Binding does not commit to the preflight envelope');
  }
}
