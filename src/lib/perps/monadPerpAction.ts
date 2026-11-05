/**
 * Exact-order binding for the reviewed Monad perp surface (Perpl, AUSD-margined).
 *
 * HONEST BOUNDARY — read this first:
 * Perpl is reached through a centralized venue API. The order bound here has
 * NO chain-executable, signable bytes (no on-chain calldata, no EVM
 * transaction, no program instruction). This is therefore a
 * 「中心化订单 payload 的 canonical 序列化绑定」 — a deterministic hash over a
 * canonical serialization of the exact centralized order payload — NOT a
 * calldata/message hash, and NOT proof of on-chain execution.
 *
 * What it CAN prove: a decision was bound to one specific serialized order
 * payload, and any later change to any order field is detectable (the
 * payloadHash / decisionHash changes and verification fails).
 * What it CANNOT prove: that the venue accepted, matched, or executed the
 * order, that it was filled, or that any on-chain state changed. Execution
 * proof is outside this module (PriorSeal / venue settlement evidence).
 *
 * This mirrors the exact layer of basePerpAction.ts / solanaPerpAction.ts —
 * strict schema, canonical bytes, a payload hash, and a bind function that
 * rejects any field outside the reviewed profile — but the hashed bytes are a
 * centralized API order payload rather than chain calldata / instruction data.
 */

import { keccak256 } from 'viem';
import { z } from 'zod';

import { canonicalJsonString } from '@/lib/utils/canonicalJson';

import {
  MONAD_PERP_GUARD_PERPL_PROTOCOL_ID,
  MonadPerpGuardInputSchema,
} from './monadPerpGuard';
import { perplReviewedMarketForAsset } from './perplPerpMarket';

/**
 * The exact centralized Perpl order payload. Every field is bound; there is
 * deliberately no opaque "extra" bag, so a caller cannot smuggle an unbound
 * field past the decision. `.strict()` rejects unknown keys.
 */
export const MonadPerpExactOrderPayloadSchema = z
  .object({
    protocolId: z.literal(MONAD_PERP_GUARD_PERPL_PROTOCOL_ID),
    /** Reviewed Perpl market id (BTC=1, MON=10, ETH=20, SOL=31). */
    marketId: z.number().int().positive(),
    symbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    marginAssetSymbol: z.literal('AUSD'),
    /** long => open_long, short => open_short. */
    side: z.enum(['long', 'short']),
    orderType: z.enum(['market', 'limit']),
    /** Caller-declared post-action notional, USD (bound to the guard). */
    sizeUsd: z.number().finite().positive(),
    /** Caller-declared post-action margin, USD (bound to the guard). */
    marginUsd: z.number().finite().positive(),
    leverage: z.number().finite().positive(),
    /** Price boundary: null for market orders, >0 for limit orders. */
    limitPrice: z.number().finite().positive().nullable(),
    /** Reviewed slippage / price-band bound in basis points. */
    priceBoundBps: z.number().int().nonnegative(),
    reduceOnly: z.boolean(),
    /** Venue account identifier (a centralized venue id, NOT an on-chain signer). */
    account: z.string().min(1),
    /** Client order id / nonce, bound against replay. */
    clientOrderId: z.string().min(1),
    createdAtMs: z.number().int().nonnegative(),
  })
  .strict();

export type MonadPerpExactOrderPayload = z.infer<typeof MonadPerpExactOrderPayloadSchema>;

/** Exact-layer input: one guard assessment bound to one centralized order payload. */
export const MonadPerpGuardExactInputSchema = z
  .object({
    guard: MonadPerpGuardInputSchema,
    order: MonadPerpExactOrderPayloadSchema,
  })
  .strict();
export type MonadPerpGuardExactInput = z.infer<typeof MonadPerpGuardExactInputSchema>;

export interface MonadPerpDecodedAction {
  protocolId: typeof MONAD_PERP_GUARD_PERPL_PROTOCOL_ID;
  action: 'open_long' | 'open_short';
  marketId: number;
  symbol: string;
  marginAssetSymbol: 'AUSD';
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  sizeUsd: number;
  marginUsd: number;
  leverage: number;
  limitPrice: number | null;
  priceBoundBps: number;
  reduceOnly: boolean;
  account: string;
  clientOrderId: string;
  createdAtMs: number;
  /** keccak256 over the canonical serialization of the centralized order payload. */
  payloadHash: `0x${string}`;
  /** Explicit: this binds a centralized API payload, not chain calldata. */
  bindingSurface: 'centralized-order-payload-canonical-serialization';
  /** Explicit: this binding provides NO proof of on-chain execution. */
  provesOnchainExecution: false;
}

export interface MonadPerpExpectedScope {
  protocolId: typeof MONAD_PERP_GUARD_PERPL_PROTOCOL_ID;
  action: 'open_long' | 'open_short';
  assetSymbol: string;
  sizeUsd: number;
  marginValueUsd: number;
}

/** Deterministic bytes that both the decision hash and the signature commit to. */
export function monadPerpCanonicalPayload(payload: MonadPerpExactOrderPayload): string {
  return canonicalJsonString(MonadPerpExactOrderPayloadSchema.parse(payload));
}

export function monadPerpOrderPayloadHash(payload: MonadPerpExactOrderPayload): `0x${string}` {
  return keccak256(new TextEncoder().encode(monadPerpCanonicalPayload(payload)));
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Bind one centralized Perpl order payload to one guard assessment. Fails
 * closed on any field outside the reviewed profile. The returned payloadHash
 * is the digest the signed decision / attestation commits to; it is a
 * canonical-serialization binding, never a claim of on-chain execution.
 */
export function bindMonadPerpExactOrder(
  rawPayload: MonadPerpExactOrderPayload,
  expected: MonadPerpExpectedScope
): MonadPerpDecodedAction {
  const payload = MonadPerpExactOrderPayloadSchema.parse(rawPayload);
  const symbol = normalizeSymbol(payload.symbol);
  const reviewed = perplReviewedMarketForAsset(symbol);
  if (!reviewed || reviewed.marketId !== payload.marketId) {
    throw new Error('Perpl order marketId does not match the reviewed market for the declared asset');
  }
  if (symbol !== normalizeSymbol(expected.assetSymbol)) {
    throw new Error('Perpl order symbol does not match the assessed market');
  }
  if (expected.action === 'open_long' && payload.side !== 'long') {
    throw new Error('Perpl order side does not match the assessed open_long action');
  }
  if (expected.action === 'open_short' && payload.side !== 'short') {
    throw new Error('Perpl order side does not match the assessed open_short action');
  }
  // Open-position profile only; reduce-only / trigger / auction variants are
  // outside the reviewed exact layer (same restriction as solanaPerpAction.ts).
  if (payload.reduceOnly) {
    throw new Error('Reduce-only orders are outside the reviewed open-position profile');
  }
  if (payload.orderType === 'market' && payload.limitPrice !== null) {
    throw new Error('Perpl market orders must not carry a limit price');
  }
  if (payload.orderType === 'limit' && payload.limitPrice === null) {
    throw new Error('Perpl limit orders must declare a positive price boundary');
  }
  if (payload.sizeUsd !== expected.sizeUsd || payload.marginUsd !== expected.marginValueUsd) {
    throw new Error('Perpl order notional or margin does not match the assessed position values');
  }
  const expectedLeverage = expected.sizeUsd / expected.marginValueUsd;
  if (Math.abs(payload.leverage - expectedLeverage) > 1e-6) {
    throw new Error('Perpl order leverage does not match the assessed effective leverage');
  }

  return {
    protocolId: expected.protocolId,
    action: expected.action,
    marketId: payload.marketId,
    symbol,
    marginAssetSymbol: payload.marginAssetSymbol,
    side: payload.side,
    orderType: payload.orderType,
    sizeUsd: payload.sizeUsd,
    marginUsd: payload.marginUsd,
    leverage: payload.leverage,
    limitPrice: payload.limitPrice,
    priceBoundBps: payload.priceBoundBps,
    reduceOnly: payload.reduceOnly,
    account: payload.account,
    clientOrderId: payload.clientOrderId,
    createdAtMs: payload.createdAtMs,
    payloadHash: monadPerpOrderPayloadHash(payload),
    bindingSurface: 'centralized-order-payload-canonical-serialization',
    provesOnchainExecution: false,
  };
}
