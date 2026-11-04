/**
 * Strict Solana message decoder for the exact Orca Whirlpool swap instruction
 * that the Solana swap guard is willing to attest.  It intentionally accepts a
 * single legacy `swap` instruction only: no swapV2/swap_v2, no two-hop routes,
 * no remaining-accounts-info indirection, no aggregator bundles, and no
 * zero-minimum-output swaps.  A caller that needs a different shape must obtain
 * a new reviewed profile instead of smuggling one past this decoder.
 */

import { createHash } from 'node:crypto';

import {
  decodeSolanaBase58,
  solanaLendingMessageHash,
  SolanaLendingTransactionSchema,
  type SolanaLendingTransaction,
} from '@/lib/lending/solanaLendingAction';

import {
  directionAToB,
  reviewedSolanaSwapProfile,
  SPL_TOKEN_PROGRAM_ID,
  type SolanaSwapGuardDirection,
  type SolanaSwapGuardProfileId,
} from './solanaOrcaWhirlpool';

/** sha256("global:swap")[0..8] — the canonical legacy Whirlpool swap discriminator. */
const WHIRLPOOL_SWAP_DISCRIMINATOR = Uint8Array.from([248, 198, 158, 145, 225, 117, 135, 200]);

/** Layout: disc(8) + amount u64 + otherAmountThreshold u64 + sqrtPriceLimit u128 + 2 bools. */
const SWAP_DATA_LENGTH = 42;
/** tokenProgram, tokenAuthority, whirlpool, ownerA, vaultA, ownerB, vaultB, 1-3 tick arrays, oracle. */
const SWAP_MIN_ACCOUNTS = 9;
const SWAP_MAX_ACCOUNTS = 11;
const SWAP_TICK_ARRAY_BASE = 7;

export type SolanaSwapDecodedAction = {
  profileId: SolanaSwapGuardProfileId;
  direction: SolanaSwapGuardDirection;
  programId: string;
  /** The fee payer — the sole reviewed signer and token-account owner. */
  account: string;
  pool: string;
  /** Exact input amount, raw integer units of the source token. */
  amount: string;
  /** otherAmountThreshold — the caller's guaranteed minimum output, raw units. */
  minOut: string;
  /** Always "0": a nonzero limit is outside the reviewed profile. */
  sqrtPriceLimitX64: '0';
  inputTokenAccount: string;
  inputVault: string;
  outputVault: string;
  outputTokenAccount: string;
  tickArray0: string;
  oracle: string;
  instructionDataHash: `0x${string}`;
  messageHash: `0x${string}`;
};

type ExpectedScope = {
  profileId: SolanaSwapGuardProfileId;
  direction: SolanaSwapGuardDirection;
};

/**
 * Decode one canonical direct Whirlpool swap instruction.  The returned message
 * hash is the digest the guard decision and settlement commit to.
 */
export function decodeSolanaSwapExactCall(
  rawTransaction: SolanaLendingTransaction,
  expected: ExpectedScope
): SolanaSwapDecodedAction {
  const transaction = SolanaLendingTransactionSchema.parse(rawTransaction);
  const profile = reviewedSolanaSwapProfile(expected.profileId);
  if (transaction.header.numRequiredSignatures !== 1) {
    throw new Error('The Solana swap profile permits exactly one fee-payer signature');
  }
  if (transaction.instructions.length !== 1) {
    throw new Error('The Solana swap profile permits exactly one protocol instruction');
  }
  const keys = [
    ...transaction.accountKeys,
    ...transaction.loadedAddresses.writable,
    ...transaction.loadedAddresses.readonly,
  ];
  const instruction = transaction.instructions[0];
  const programId = keys[instruction.programIdIndex];
  if (programId !== profile.programId) {
    throw new Error('Exact call target is not the reviewed Orca Whirlpool program');
  }
  const data = decodeSolanaBase58(instruction.data);
  if (data.length !== SWAP_DATA_LENGTH) {
    throw new Error('Whirlpool swap instruction data is not canonical');
  }
  if (!WHIRLPOOL_SWAP_DISCRIMINATOR.every((byte, index) => data[index] === byte)) {
    throw new Error('Whirlpool instruction discriminator does not match the reviewed swap');
  }
  const { amount, minOut, aToB } = decodeSwapArgs(data);

  if (
    instruction.accountIndexes.length < SWAP_MIN_ACCOUNTS ||
    instruction.accountIndexes.length > SWAP_MAX_ACCOUNTS
  ) {
    throw new Error('Whirlpool swap instruction account layout is not canonical');
  }
  const a = instruction.accountIndexes;
  const oracleIndex = a.length - 1;
  if (a[0] === undefined || a[1] === undefined || a[2] === undefined) {
    throw new Error('Whirlpool swap instruction account layout is not canonical');
  }
  if (keys[a[0]] !== SPL_TOKEN_PROGRAM_ID) {
    throw new Error('Whirlpool swap must bind the canonical SPL Token program');
  }
  if (keys[a[1]] !== transaction.feePayer) {
    throw new Error('Whirlpool swap token authority must be the fee payer');
  }
  if (keys[a[2]] !== profile.pool) {
    throw new Error('Whirlpool swap does not target the reviewed pool');
  }
  if (a[3] === undefined || a[4] === undefined || a[5] === undefined || a[6] === undefined) {
    throw new Error('Whirlpool swap instruction account layout is not canonical');
  }
  if (keys[a[4]] !== profile.vaultA || keys[a[6]] !== profile.vaultB) {
    throw new Error('Whirlpool swap vaults are not the reviewed pool vaults');
  }
  for (const tickIndex of a.slice(SWAP_TICK_ARRAY_BASE, oracleIndex)) {
    if (keys[tickIndex] === undefined) {
      throw new Error('Whirlpool swap instruction references an unknown tick array');
    }
  }

  const expectedAToB = directionAToB(profile, expected.direction);
  if (aToB !== expectedAToB) {
    throw new Error('Whirlpool swap direction does not match the declared review direction');
  }

  const pool = keys[a[2]];
  const tickArray0 = keys[a[SWAP_TICK_ARRAY_BASE]];
  const oracle = keys[a[oracleIndex]];
  const tokenOwnerAccountA = keys[a[3]];
  const tokenOwnerAccountB = keys[a[5]];
  if (
    pool === undefined ||
    tickArray0 === undefined ||
    oracle === undefined ||
    tokenOwnerAccountA === undefined ||
    tokenOwnerAccountB === undefined
  ) {
    throw new Error('Whirlpool swap instruction references an unknown account');
  }

  return {
    profileId: expected.profileId,
    direction: expected.direction,
    programId,
    account: transaction.feePayer,
    pool,
    amount,
    minOut,
    sqrtPriceLimitX64: '0',
    inputTokenAccount: expectedAToB ? tokenOwnerAccountA : tokenOwnerAccountB,
    inputVault: expectedAToB ? profile.vaultA : profile.vaultB,
    outputVault: expectedAToB ? profile.vaultB : profile.vaultA,
    outputTokenAccount: expectedAToB ? tokenOwnerAccountB : tokenOwnerAccountA,
    tickArray0,
    oracle,
    instructionDataHash: `0x${createHash('sha256').update(data).digest('hex')}`,
    messageHash: solanaLendingMessageHash(transaction),
  };
}

function decodeSwapArgs(data: Uint8Array): {
  amount: string;
  minOut: string;
  sqrtPriceLimitX64: string;
  amountSpecifiedIsInput: boolean;
  aToB: boolean;
} {
  const amount = littleEndianU64(data.slice(8, 16));
  const minOut = littleEndianU64(data.slice(16, 24));
  const sqrtPriceLimitX64 = littleEndianU64(data.slice(24, 40));
  if (amount <= 0n) throw new Error('Whirlpool swap amount must be greater than zero');
  if (minOut <= 0n) {
    throw new Error('Whirlpool swap requires a positive otherAmountThreshold minimum output');
  }
  if (sqrtPriceLimitX64 !== 0n) {
    throw new Error('Whirlpool swap sqrtPriceLimitX64 must be zero in the reviewed profile');
  }
  if (data[40] === undefined || data[41] === undefined) {
    throw new Error('Whirlpool swap instruction data is not canonical');
  }
  const amountSpecifiedIsInput = data[40] === 1;
  const aToB = data[41] === 1;
  if (!amountSpecifiedIsInput) {
    throw new Error('Whirlpool swap exact-output mode is outside the reviewed profile');
  }
  return {
    amount: amount.toString(),
    minOut: minOut.toString(),
    sqrtPriceLimitX64: sqrtPriceLimitX64.toString(),
    amountSpecifiedIsInput,
    aToB,
  };
}

/** Both u64 and u128 little-endian reads share this fold; the widths come from the slice. */
function littleEndianU64(bytes: Uint8Array): bigint {
  return bytes.reduceRight((total, byte) => (total << 8n) | BigInt(byte), 0n);
}

export type SolanaSwapTransaction = SolanaLendingTransaction;
