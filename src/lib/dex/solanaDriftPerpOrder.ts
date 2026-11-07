/**
 * Drift v2 perpetual-order payload builder for Solana.
 *
 * The guard already owns every risk rule (`solanaPerpGuard.ts`); this adapter
 * does not duplicate them. It invokes that guard, forwards its verdict as a
 * reference, and — only when the verdict is not blocking — encodes one
 * canonical `place_perp_order` market-order payload that the existing
 * `solanaPerpAction.ts` decoder accepts byte-for-byte.
 *
 * The payload is not a complete transaction: Drift's instruction needs a large
 * account list supplied by the caller's Drift SDK/client. The core accounts
 * derivable locally are included, and the returned caveats state the boundary.
 *
 * Failure classes mirror the Jupiter adapter:
 *   - `UPSTREAM_UNAVAILABLE` — guard evidence or a dependency timed out / failed.
 *   - `MARKET_NOT_FOUND`     — the asset is not a reviewed Drift perp market.
 *   - `UNSUPPORTED`          — the requested order shape is outside the profile.
 */

import { createHash } from 'node:crypto';

import { getProgramDerivedAddress, type Address } from '@solana/kit';

import { SOLANA_MAINNET_CAIP2 } from '@/lib/execution/solanaSimulation';
import { decodeSolanaBase58 } from '@/lib/lending/solanaLendingAction';
import {
  DRIFT_V2_MAINNET_PROGRAM_ID,
  findReviewedDriftPerpMarket,
} from '@/lib/perps/driftPerpMarket';
import { DRIFT_BASE_PRECISION, DRIFT_PERP_PROTOCOL_ID } from '@/lib/perps/solanaPerpAction';
import {
  assessSolanaPerpGuard,
  type SolanaPerpGuardDependencies,
  type SolanaPerpGuardInput,
  type SolanaPerpGuardResult,
  type SolanaPerpGuardVerdict,
} from '@/lib/perps/solanaPerpGuard';

export const SOLANA_DRIFT_PERP_ORDER_SCHEMA = 'insight.solana-drift-perp-order.v1' as const;
export const SOLANA_DRIFT_PERP_VENUE = 'drift' as const;

const PLACE_PERP_ORDER_DISCRIMINATOR = anchorDiscriminator('global:place_perp_order');
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_EXPIRY_SECONDS = 30;
const MAX_EXPIRY_SECONDS = 300;
const MAX_USER_INDEX = 0xffff;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

/** Drift v2 enum tags (IDL; same provenance as solanaPerpAction.ts). */
const ORDER_TYPE_MARKET = 0;
const MARKET_TYPE_PERP = 1;
const POSITION_DIRECTION_LONG = 0;
const POSITION_DIRECTION_SHORT = 1;
const POST_ONLY_NONE = 0;
const TRIGGER_CONDITION_ABOVE = 0;

export type SolanaDriftPerpOrderErrorCode =
  | 'UPSTREAM_UNAVAILABLE'
  | 'MARKET_NOT_FOUND'
  | 'UNSUPPORTED';

export class SolanaDriftPerpOrderError extends Error {
  readonly code: SolanaDriftPerpOrderErrorCode;
  readonly detail: string | null;

  constructor(code: SolanaDriftPerpOrderErrorCode, message: string, detail: string | null = null) {
    super(message);
    this.name = 'SolanaDriftPerpOrderError';
    this.code = code;
    this.detail = detail;
  }

  get retryable(): boolean {
    return this.code === 'UPSTREAM_UNAVAILABLE';
  }
}

export interface SolanaDriftPerpOrderRequest {
  /** Reviewed Drift perp market: SOL, BTC, ETH (or `SOL-PERP` style names). */
  assetSymbol: string;
  action: 'open_long' | 'open_short';
  /** Caller-declared post-action notional, in USD. */
  sizeUsd: number;
  /** Caller-declared post-action margin, in USD. */
  marginValueUsd: number;
  /**
   * Optional exact base size in human units. When omitted the adapter derives
   * it from `sizeUsd / guard.venue.oraclePrice`.
   */
  sizeBase?: string;
  /** Order authority and fee payer; must be the signing wallet. */
  authority: string;
  /** Drift user sub-account index; defaults to 0. */
  userIndex?: number;
  /** Order expiry; defaults to 30 seconds (max 300). */
  expiresAfterSeconds?: number;
}

export interface SolanaDriftPerpRiskVerdictRef {
  source: 'solana_perp_guard';
  schema: 'insight.solana-perp-guard.v1';
  verdict: SolanaPerpGuardVerdict;
  evaluatedAt: string;
  assetSymbol: string;
  action: 'open_long' | 'open_short';
  reasons: string[];
}

export interface SolanaDriftPerpInstructionAccount {
  address: string;
  role: 'authority' | 'program' | 'state' | 'user' | 'perp-market';
  isSigner: boolean;
  isWritable: boolean;
}

export interface SolanaDriftPerpOrderPayload {
  schema: typeof SOLANA_DRIFT_PERP_ORDER_SCHEMA;
  venue: typeof SOLANA_DRIFT_PERP_VENUE;
  network: typeof SOLANA_MAINNET_CAIP2;
  /** Project-internal chain id: 0 is Solana. */
  chainId: 0;
  protocolId: typeof DRIFT_PERP_PROTOCOL_ID;
  verdict: 'READY_TO_SIGN' | 'CAUTION' | 'BLOCK';
  market: {
    assetSymbol: string;
    marketName: string;
    marketIndex: number;
    oraclePrice: number | null;
    /** On-chain slot at which the reviewed perp market was last updated. */
    observedSlot: number | null;
  };
  order: {
    orderType: 'market';
    marketType: 'perp';
    direction: 'long' | 'short';
    baseAssetAmountRaw: string;
    baseAssetAmount: number;
    baseAmountSource: 'caller-sizeBase' | 'sizeUsd-over-oracle-price';
    sizeUsd: number;
    marginValueUsd: number;
    impliedNotionalUsd: number | null;
    marketIndex: number;
    limitPrice: '0';
    userOrderId: '0';
    reduceOnly: false;
    maxTs: number;
    expiresAt: string;
  } | null;
  instruction: {
    programId: string;
    discriminator: `0x${string}`;
    dataBase58: string;
    dataBase64: string;
    dataHash: `0x${string}`;
    /** Locally derivable core accounts; remaining Drift accounts are caller-supplied. */
    accounts: SolanaDriftPerpInstructionAccount[];
  } | null;
  /** Timestamp the built order stops being valid. */
  orderExpiresAt: string | null;
  riskVerdictRef: SolanaDriftPerpRiskVerdictRef;
  blockingReasons: string[];
  caveats: string[];
}

export interface SolanaDriftPerpOrderOptions {
  /** Test/DI seam; production uses the reviewed guard. */
  assessGuard?: (
    input: SolanaPerpGuardInput,
    dependencies?: SolanaPerpGuardDependencies
  ) => Promise<SolanaPerpGuardResult>;
  guardDependencies?: SolanaPerpGuardDependencies;
  nowMs?: number;
  timeoutMs?: number;
}

type PlacePerpOrderParams = {
  orderType: number;
  marketType: number;
  direction: number;
  userOrderId: number;
  baseAssetAmount: bigint;
  price: bigint;
  marketIndex: number;
  reduceOnly: boolean;
  postOnly: number;
  bitFlags: number;
  maxTsSec: number;
};

function anchorDiscriminator(name: string): Uint8Array {
  return createHash('sha256').update(name).digest().subarray(0, 8);
}

function isSolanaAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false;
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) return false;
  try {
    return decodeSolanaBase58(value).length === 32;
  } catch {
    return false;
  }
}

function decimalToRaw(value: string, decimals: number, field: string): bigint {
  if (typeof value !== 'string' || !DECIMAL.test(value)) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      `Drift order ${field} must be a positive decimal string without exponent notation.`
    );
  }
  const [whole, fractional = ''] = value.split('.');
  if (fractional.length > decimals) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      `Drift order ${field} has more fractional digits than BASE_PRECISION supports (${decimals}).`
    );
  }
  const raw = BigInt(`${whole}${fractional.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, ''));
  if (raw <= 0n) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      `Drift order ${field} must be greater than zero.`
    );
  }
  return raw;
}

function writeUintLE(target: number[], value: bigint, size: number): void {
  let remaining = value;
  for (let index = 0; index < size; index += 1) {
    target.push(Number(remaining & 0xffn));
    remaining >>= 8n;
  }
  if (remaining !== 0n) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      'Drift order value exceeds its encoded width.'
    );
  }
}

/** Borsh-encode the IDL `OrderParams` struct in the exact reviewed field order. */
function encodeOrderParams(params: PlacePerpOrderParams): Uint8Array {
  const bytes: number[] = [];
  bytes.push(params.orderType, params.marketType, params.direction, params.userOrderId);
  writeUintLE(bytes, params.baseAssetAmount, 8);
  writeUintLE(bytes, params.price, 8);
  writeUintLE(bytes, BigInt(params.marketIndex), 2);
  bytes.push(params.reduceOnly ? 1 : 0, params.postOnly, params.bitFlags);
  bytes.push(1); // Option<u64>::Some
  writeUintLE(bytes, BigInt(params.maxTsSec), 8);
  bytes.push(0); // triggerPrice None
  bytes.push(TRIGGER_CONDITION_ABOVE);
  bytes.push(0); // oraclePriceOffset None
  bytes.push(0); // auctionDuration None
  bytes.push(0); // auctionStartPrice None
  bytes.push(0); // auctionEndPrice None
  return Uint8Array.from(bytes);
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let encoded = '';
  while (value > 0n) {
    const remainder = Number(value % 58n);
    encoded = BASE58_ALPHABET[remainder]! + encoded;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return encoded || '1';
}

function u16Le(value: number): Uint8Array {
  return Uint8Array.from([value & 0xff, (value >> 8) & 0xff]);
}

async function derivePda(seeds: Array<string | Uint8Array>): Promise<string> {
  const [address] = await getProgramDerivedAddress({
    programAddress: DRIFT_V2_MAINNET_PROGRAM_ID as Address,
    seeds: seeds.map((seed) => (typeof seed === 'string' ? new TextEncoder().encode(seed) : seed)),
  });
  return address;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new SolanaDriftPerpOrderError(
              'UPSTREAM_UNAVAILABLE',
              `${label} timed out after ${timeoutMs} ms.`
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function assertRequest(request: SolanaDriftPerpOrderRequest): {
  action: 'open_long' | 'open_short';
  userIndex: number;
  expiresAfterSeconds: number;
} {
  if (request.action !== 'open_long' && request.action !== 'open_short') {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      'Drift order action must be open_long or open_short.'
    );
  }
  if (!isSolanaAddress(request.authority)) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      'Drift order authority is not a valid address.'
    );
  }
  if (!Number.isFinite(request.sizeUsd) || request.sizeUsd <= 0) {
    throw new SolanaDriftPerpOrderError('UNSUPPORTED', 'Drift order sizeUsd must be positive.');
  }
  if (!Number.isFinite(request.marginValueUsd) || request.marginValueUsd <= 0) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      'Drift order marginValueUsd must be positive.'
    );
  }
  const userIndex = request.userIndex ?? 0;
  if (!Number.isSafeInteger(userIndex) || userIndex < 0 || userIndex > MAX_USER_INDEX) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      `Drift userIndex must be an integer in 0..${MAX_USER_INDEX}.`
    );
  }
  const expiresAfterSeconds = request.expiresAfterSeconds ?? DEFAULT_EXPIRY_SECONDS;
  if (
    !Number.isSafeInteger(expiresAfterSeconds) ||
    expiresAfterSeconds < 5 ||
    expiresAfterSeconds > MAX_EXPIRY_SECONDS
  ) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      `Drift expiresAfterSeconds must be an integer in 5..${MAX_EXPIRY_SECONDS}.`
    );
  }
  return { action: request.action, userIndex, expiresAfterSeconds };
}

/**
 * Assess one Drift perp position with the reviewed guard and build the matching
 * unsigned `place_perp_order` market-order payload.
 */
export async function prepareSolanaDriftPerpOrder(
  request: SolanaDriftPerpOrderRequest,
  options: SolanaDriftPerpOrderOptions = {}
): Promise<SolanaDriftPerpOrderPayload> {
  const { action, userIndex, expiresAfterSeconds } = assertRequest(request);
  const nowMs = options.nowMs ?? Date.now();
  const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100) {
    throw new SolanaDriftPerpOrderError(
      'UNSUPPORTED',
      'Drift order timeoutMs must be an integer >= 100.'
    );
  }

  const market = findReviewedDriftPerpMarket(request.assetSymbol);
  if (!market) {
    throw new SolanaDriftPerpOrderError(
      'MARKET_NOT_FOUND',
      `Drift perp market ${request.assetSymbol} is not in the reviewed set.`
    );
  }

  const assessGuard = options.assessGuard ?? assessSolanaPerpGuard;
  const guardInput: SolanaPerpGuardInput = {
    protocolId: DRIFT_PERP_PROTOCOL_ID,
    action,
    assetSymbol: market.baseAssetSymbol,
    marginAssetSymbol: 'USDC',
    sizeUsd: request.sizeUsd,
    marginValueUsd: request.marginValueUsd,
  };

  let guard: SolanaPerpGuardResult;
  try {
    guard = await withTimeout(
      assessGuard(guardInput, options.guardDependencies),
      timeoutMs,
      'Solana perp guard assessment'
    );
  } catch (error) {
    if (error instanceof SolanaDriftPerpOrderError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    if (/not in the reviewed/i.test(detail)) {
      throw new SolanaDriftPerpOrderError(
        'MARKET_NOT_FOUND',
        'Drift perp market is not in the reviewed guard set.',
        detail
      );
    }
    throw new SolanaDriftPerpOrderError(
      'UPSTREAM_UNAVAILABLE',
      'Solana perp guard assessment failed or its evidence was unavailable.',
      detail
    );
  }

  const riskVerdictRef: SolanaDriftPerpRiskVerdictRef = {
    source: 'solana_perp_guard',
    schema: 'insight.solana-perp-guard.v1',
    verdict: guard.verdict,
    evaluatedAt: guard.evaluatedAt,
    assetSymbol: market.baseAssetSymbol,
    action,
    reasons: [...guard.reasons],
  };
  const base: Omit<
    SolanaDriftPerpOrderPayload,
    'verdict' | 'order' | 'instruction' | 'orderExpiresAt' | 'blockingReasons'
  > = {
    schema: SOLANA_DRIFT_PERP_ORDER_SCHEMA,
    venue: SOLANA_DRIFT_PERP_VENUE,
    network: SOLANA_MAINNET_CAIP2,
    chainId: 0 as const,
    protocolId: DRIFT_PERP_PROTOCOL_ID,
    market: {
      assetSymbol: market.baseAssetSymbol,
      marketName: market.symbol,
      marketIndex: market.marketIndex,
      oraclePrice: guard.venue.oraclePrice,
      observedSlot: guard.venue.drift.ammLastUpdateSlot,
    },
    riskVerdictRef,
    caveats: [
      'Insight does not sign, submit, or custody this order; the user wallet must review and sign the completed Drift transaction.',
      'This payload contains only the locally derivable core accounts. The caller must add Drift user-stats, oracle, AMM and vault accounts from the official Drift SDK before submitting.',
      'The guard verdict is a pre-trade decision, not principal authorization; bind it to the exact signed message before execution.',
    ],
  };

  if (guard.verdict === 'BLOCK') {
    return {
      ...base,
      verdict: 'BLOCK',
      order: null,
      instruction: null,
      orderExpiresAt: null,
      blockingReasons: [
        'The reviewed Solana perp guard returned BLOCK; no order payload was built.',
        ...guard.reasons,
      ],
    };
  }

  if (
    guard.venue.drift.marketIndex !== null &&
    guard.venue.drift.marketIndex !== market.marketIndex
  ) {
    return {
      ...base,
      verdict: 'BLOCK',
      order: null,
      instruction: null,
      orderExpiresAt: null,
      blockingReasons: [
        `Guard evidence market index ${guard.venue.drift.marketIndex} does not match the reviewed ${market.symbol} index ${market.marketIndex}.`,
      ],
    };
  }

  const oraclePrice = guard.venue.oraclePrice;
  let baseAssetAmountRaw: bigint;
  let baseAmountSource: 'caller-sizeBase' | 'sizeUsd-over-oracle-price';
  if (request.sizeBase !== undefined) {
    baseAssetAmountRaw = decimalToRaw(request.sizeBase, 9, 'sizeBase');
    baseAmountSource = 'caller-sizeBase';
  } else {
    if (oraclePrice === null || oraclePrice <= 0) {
      return {
        ...base,
        verdict: 'BLOCK',
        order: null,
        instruction: null,
        orderExpiresAt: null,
        blockingReasons: [
          'No venue oracle price is available to convert sizeUsd into Drift BASE_PRECISION units; pass sizeBase explicitly or retry when evidence is available.',
        ],
      };
    }
    const raw = Math.round((request.sizeUsd / oraclePrice) * Number(DRIFT_BASE_PRECISION));
    if (!Number.isSafeInteger(raw) || raw <= 0) {
      throw new SolanaDriftPerpOrderError(
        'UNSUPPORTED',
        'Drift sizeUsd is outside the safe base-amount precision; pass sizeBase explicitly.'
      );
    }
    baseAssetAmountRaw = BigInt(raw);
    baseAmountSource = 'sizeUsd-over-oracle-price';
  }

  const baseAssetAmount = Number(baseAssetAmountRaw) / Number(DRIFT_BASE_PRECISION);
  const impliedNotionalUsd =
    oraclePrice !== null && oraclePrice > 0 ? baseAssetAmount * oraclePrice : null;
  if (
    baseAmountSource === 'caller-sizeBase' &&
    impliedNotionalUsd !== null &&
    Math.abs(impliedNotionalUsd - request.sizeUsd) / request.sizeUsd > 0.15
  ) {
    return {
      ...base,
      verdict: 'BLOCK',
      order: null,
      instruction: null,
      orderExpiresAt: null,
      blockingReasons: [
        `sizeBase implies ${impliedNotionalUsd.toFixed(2)} USD at the venue oracle price, departing from the assessed sizeUsd by more than the reviewed 15% tolerance.`,
      ],
    };
  }

  const expiresAtMs = nowMs + expiresAfterSeconds * 1_000;
  const maxTsSec = Math.floor(expiresAtMs / 1_000);
  const direction = action === 'open_long' ? POSITION_DIRECTION_LONG : POSITION_DIRECTION_SHORT;
  const params = encodeOrderParams({
    orderType: ORDER_TYPE_MARKET,
    marketType: MARKET_TYPE_PERP,
    direction,
    userOrderId: 0,
    baseAssetAmount: baseAssetAmountRaw,
    price: 0n,
    marketIndex: market.marketIndex,
    reduceOnly: false,
    postOnly: POST_ONLY_NONE,
    bitFlags: 0,
    maxTsSec,
  });
  const data = Uint8Array.from([...PLACE_PERP_ORDER_DISCRIMINATOR, ...params]);
  const [statePda, marketPda, userPda] = await Promise.all([
    derivePda(['drift_state']),
    derivePda(['perp_market', u16Le(market.marketIndex)]),
    derivePda(['user', decodeSolanaBase58(request.authority), u16Le(userIndex)]),
  ]);

  return {
    ...base,
    verdict: guard.verdict === 'CAUTION' ? 'CAUTION' : 'READY_TO_SIGN',
    order: {
      orderType: 'market',
      marketType: 'perp',
      direction: action === 'open_long' ? 'long' : 'short',
      baseAssetAmountRaw: baseAssetAmountRaw.toString(),
      baseAssetAmount,
      baseAmountSource,
      sizeUsd: request.sizeUsd,
      marginValueUsd: request.marginValueUsd,
      impliedNotionalUsd,
      marketIndex: market.marketIndex,
      limitPrice: '0',
      userOrderId: '0',
      reduceOnly: false,
      maxTs: maxTsSec,
      expiresAt: new Date(expiresAtMs).toISOString(),
    },
    instruction: {
      programId: DRIFT_V2_MAINNET_PROGRAM_ID,
      discriminator: `0x${Buffer.from(PLACE_PERP_ORDER_DISCRIMINATOR).toString('hex')}`,
      dataBase58: encodeBase58(data),
      dataBase64: Buffer.from(data).toString('base64'),
      dataHash: `0x${createHash('sha256').update(data).digest('hex')}`,
      accounts: [
        {
          address: request.authority,
          role: 'authority',
          isSigner: true,
          isWritable: false,
        },
        {
          address: DRIFT_V2_MAINNET_PROGRAM_ID,
          role: 'program',
          isSigner: false,
          isWritable: false,
        },
        { address: statePda, role: 'state', isSigner: false, isWritable: false },
        { address: marketPda, role: 'perp-market', isSigner: false, isWritable: true },
        { address: userPda, role: 'user', isSigner: false, isWritable: true },
      ],
    },
    orderExpiresAt: new Date(expiresAtMs).toISOString(),
    blockingReasons: [],
  };
}
