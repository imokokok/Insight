/**
 * Strict Solana message decoder for the exact Drift v2 perp order instruction
 * that the Solana Perp Guard is willing to attest.  It intentionally accepts a
 * single `place_perp_order` instruction only: no spot orders, no resting
 * limit/trigger/auction profiles, no reduce-only orders, and no instruction
 * bundles.  A caller that needs a different shape must obtain a new reviewed
 * profile instead of smuggling one past this decoder.
 *
 * Layout provenance (retrieved 2026-11-04): the `OrderParams` borsh layout and
 * the enum tags below were taken from the official Drift v2 IDL shipped with
 * `@drift-labs/sdk@2.156.0` (`lib/node/idl/drift.json`, program
 * `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`) — the same source the market
 * evidence offsets in `driftPerpMarket.ts` were validated against. Borsh
 * `Option<i64>`/`Option<u64>`/`Option<i32>`/`Option<u8>` fields decode as a
 * one-byte tag plus the payload when present, so the decoder never assumes a
 * fixed instruction-data length.
 */

import { createHash } from 'node:crypto';

import {
  decodeSolanaBase58,
  solanaLendingMessageHash,
  SolanaLendingTransactionSchema,
  type SolanaLendingTransaction,
} from '@/lib/lending/solanaLendingAction';

import { DRIFT_V2_MAINNET_PROGRAM_ID } from './driftPerpMarket';

export const DRIFT_PERP_PROTOCOL_ID = 'drift-v2-mainnet' as const;

/** sha256("global:place_perp_order")[0..8], computed the same way the Marginfi discriminators are. */
const PLACE_PERP_ORDER_DISCRIMINATOR = anchorDiscriminator('global:place_perp_order');

/** Drift v2 enum tags (IDL, see provenance above). */
const ORDER_TYPE_MARKET = 0;
const MARKET_TYPE_PERP = 1;
const POSITION_DIRECTION_LONG = 0;
const POSITION_DIRECTION_SHORT = 1;
const POST_ONLY_NONE = 0;
/** TriggerCondition "Above" is the SDK's canonical default when no trigger is set. */
const TRIGGER_CONDITION_ABOVE = 0;

/** Drift v2 precisions: base amounts are in BASE_PRECISION 1e9. */
export const DRIFT_BASE_PRECISION = 1_000_000_000n;

export type DriftPerpDecodedAction = {
  protocolId: typeof DRIFT_PERP_PROTOCOL_ID;
  action: 'open_long' | 'open_short';
  programId: string;
  /** The fee payer — the reviewed signer and the order authority. */
  account: string;
  marketIndex: number;
  /** Raw base asset amount in BASE_PRECISION 1e9 units. */
  baseAssetAmount: string;
  /** Market orders: always "0" (a nonzero price is outside the reviewed profile). */
  limitPrice: '0';
  /** Always "0": the reviewed profile accepts canonical market orders only. */
  userOrderId: '0';
  /** Order expiry timestamp encoded in the instruction, or null (None). */
  maxTs: number | null;
  instructionDataHash: `0x${string}`;
  messageHash: `0x${string}`;
};

/**
 * Decode one canonical direct Drift `place_perp_order` market instruction.
 * Fails closed on any shape outside the reviewed profile. The returned message
 * hash is the digest the guard decision and PriorSeal binding commit to.
 */
export function decodeSolanaPerpExactCall(
  rawTransaction: SolanaLendingTransaction
): DriftPerpDecodedAction {
  const transaction = SolanaLendingTransactionSchema.parse(rawTransaction);
  if (transaction.header.numRequiredSignatures !== 1) {
    throw new Error('The Solana perp profile permits exactly one fee-payer signature');
  }
  if (transaction.instructions.length !== 1) {
    throw new Error('The Solana perp profile permits exactly one protocol instruction');
  }
  const instruction = transaction.instructions[0];
  const keys = [
    ...transaction.accountKeys,
    ...transaction.loadedAddresses.writable,
    ...transaction.loadedAddresses.readonly,
  ];
  const programId = keys[instruction.programIdIndex];
  if (programId !== DRIFT_V2_MAINNET_PROGRAM_ID) {
    throw new Error('Exact call target is not the reviewed Drift v2 program');
  }
  const data = decodeSolanaBase58(instruction.data);
  if (data.length <= PLACE_PERP_ORDER_DISCRIMINATOR.length) {
    throw new Error('Drift instruction data is not canonical');
  }
  if (!PLACE_PERP_ORDER_DISCRIMINATOR.every((byte, index) => data[index] === byte)) {
    throw new Error('Drift instruction discriminator does not match the reviewed order type');
  }

  const params = decodeOrderParams(data.subarray(PLACE_PERP_ORDER_DISCRIMINATOR.length));
  if (params.orderType !== ORDER_TYPE_MARKET) {
    throw new Error('Drift guard binds canonical market orders only');
  }
  if (params.marketType !== MARKET_TYPE_PERP) {
    throw new Error('Drift guard binds perp market orders only');
  }
  if (params.userOrderId !== 0) {
    throw new Error('Drift reviewed profile accepts the canonical userOrderId 0 only');
  }
  if (params.baseAssetAmount <= 0n) {
    throw new Error('Drift order base asset amount must be greater than zero');
  }
  if (params.price !== 0n) {
    throw new Error('Drift market orders must not carry a limit price');
  }
  if (params.reduceOnly) {
    throw new Error('Reduce-only orders are outside the reviewed open-position profile');
  }
  if (params.postOnly !== POST_ONLY_NONE) {
    throw new Error('Post-only parameters are outside the reviewed market-order profile');
  }
  if (params.bitFlags !== 0) {
    throw new Error('Drift order bitFlags must be zero in the reviewed profile');
  }
  if (params.triggerPrice !== null) {
    throw new Error('Trigger prices are outside the reviewed market-order profile');
  }
  if (params.triggerCondition !== TRIGGER_CONDITION_ABOVE) {
    throw new Error('Drift trigger condition must be the canonical default');
  }
  if (params.oraclePriceOffset !== null) {
    throw new Error('Oracle price offsets are outside the reviewed market-order profile');
  }
  for (const auction of [
    params.auctionDuration,
    params.auctionStartPrice,
    params.auctionEndPrice,
  ]) {
    if (auction !== null && auction !== 0n) {
      throw new Error('Auction parameters are outside the reviewed market-order profile');
    }
  }

  const action =
    params.direction === POSITION_DIRECTION_LONG
      ? ('open_long' as const)
      : params.direction === POSITION_DIRECTION_SHORT
        ? ('open_short' as const)
        : null;
  if (!action) {
    throw new Error('Drift order direction is not a reviewed PositionDirection');
  }

  return {
    protocolId: DRIFT_PERP_PROTOCOL_ID,
    action,
    programId,
    account: transaction.feePayer,
    marketIndex: params.marketIndex,
    baseAssetAmount: params.baseAssetAmount.toString(),
    limitPrice: '0',
    userOrderId: '0',
    maxTs: params.maxTs === null ? null : Number(params.maxTs),
    instructionDataHash: `0x${createHash('sha256').update(data).digest('hex')}`,
    messageHash: solanaLendingMessageHash(transaction),
  };
}

type DecodedOrderParams = {
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
  maxTs: bigint | null;
  triggerPrice: bigint | null;
  triggerCondition: number;
  oraclePriceOffset: bigint | null;
  auctionDuration: bigint | null;
  auctionStartPrice: bigint | null;
  auctionEndPrice: bigint | null;
};

/** Cursor-based borsh decode of the IDL `OrderParams` struct (see provenance). */
function decodeOrderParams(bytes: Uint8Array): DecodedOrderParams {
  let cursor = 0;
  const readU8 = (): number => {
    if (cursor >= bytes.length) throw new Error('Drift order params are truncated');
    return bytes[cursor++]!;
  };
  const readUint = (size: number): bigint => {
    if (cursor + size > bytes.length) throw new Error('Drift order params are truncated');
    let result = 0n;
    for (let index = size - 1; index >= 0; index -= 1) {
      result = (result << 8n) | BigInt(bytes[cursor + index]!);
    }
    cursor += size;
    return result;
  };
  const readOptionUint = (size: number): bigint | null => {
    const tag = readU8();
    if (tag === 0) return null;
    if (tag !== 1) throw new Error('Drift order params carry an invalid Option tag');
    return readUint(size);
  };

  const orderType = readU8();
  const marketType = readU8();
  const direction = readU8();
  const userOrderId = readU8();
  const baseAssetAmount = readUint(8);
  const price = readUint(8);
  const marketIndex = Number(readUint(2));
  const reduceOnlyByte = readU8();
  if (reduceOnlyByte > 1) throw new Error('Drift order params are not canonical');
  const postOnly = readU8();
  const bitFlags = readU8();
  const maxTs = readOptionUint(8);
  const triggerPrice = readOptionUint(8);
  const triggerCondition = readU8();
  const oraclePriceOffsetRaw = readOptionUint(4);
  const oraclePriceOffset =
    oraclePriceOffsetRaw === null ? null : BigInt.asIntN(32, oraclePriceOffsetRaw);
  const auctionDuration = readOptionUint(1);
  const auctionStartPrice = readOptionUint(8);
  const auctionEndPrice = readOptionUint(8);
  if (cursor !== bytes.length) {
    throw new Error('Drift order params carry trailing bytes outside the reviewed layout');
  }
  return {
    orderType,
    marketType,
    direction,
    userOrderId,
    baseAssetAmount,
    price,
    marketIndex,
    reduceOnly: reduceOnlyByte === 1,
    postOnly,
    bitFlags,
    maxTs,
    triggerPrice,
    triggerCondition,
    oraclePriceOffset,
    auctionDuration,
    auctionStartPrice,
    auctionEndPrice,
  };
}

function anchorDiscriminator(name: string): Uint8Array {
  return createHash('sha256').update(name).digest().subarray(0, 8);
}

export type DriftPerpTransaction = SolanaLendingTransaction;
