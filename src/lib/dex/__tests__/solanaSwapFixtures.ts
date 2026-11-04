/** Shared deterministic fixtures for the Solana swap guard test suite. */

import type { SolanaLendingTransaction } from '@/lib/lending/solanaLendingAction';
import { solanaLendingMessageHash } from '@/lib/lending/solanaLendingAction';

import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  reviewedSolanaSwapProfile,
  SPL_TOKEN_PROGRAM_ID,
  SOLANA_USDC_MINT,
  SOLANA_USDT_MINT,
  type SolanaSwapGuardDirection,
} from '../solanaOrcaWhirlpool';
import { assessSolanaSwapGuard } from '../solanaSwapGuard';

import type { SolanaSwapGuardDependencies, SolanaSwapGuardInput } from '../solanaSwapGuard';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const SWAP_DISCRIMINATOR = Uint8Array.from([248, 198, 158, 145, 225, 117, 135, 200]);

export function b58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = '';
  for (const digit of digits) out = B58[digit] + out;
  for (const byte of bytes) {
    if (byte === 0) out = '1' + out;
    else break;
  }
  return out;
}

export function b58Decode(value: string): Uint8Array {
  let integer = 0n;
  for (const character of value) integer = integer * 58n + BigInt(B58.indexOf(character));
  const bytes: number[] = [];
  while (integer > 0n) {
    bytes.push(Number(integer & 0xffn));
    integer >>= 8n;
  }
  bytes.reverse();
  let zeroes = 0;
  while (value[zeroes] === '1') zeroes += 1;
  return Uint8Array.from([...new Array(zeroes).fill(0), ...bytes]);
}

export function syntheticKey(seed: number): string {
  return b58Encode(Uint8Array.from({ length: 32 }, (_, index) => (seed + index) % 251));
}

export const FEE_PAYER = syntheticKey(1);
export const TICK_ARRAY = syntheticKey(21);
export const ORACLE = syntheticKey(22);
export const USER_USDC_TOKEN_ACCOUNT = syntheticKey(31);
export const USER_USDT_TOKEN_ACCOUNT = syntheticKey(32);
export const RECENT_BLOCKHASH = syntheticKey(41);

const PROFILE = reviewedSolanaSwapProfile('solana-orca-whirlpool-usdc-usdt-1');

export function littleEndian(value: bigint | number, width: number): Uint8Array {
  let current = BigInt(value);
  const bytes = new Uint8Array(width);
  for (let index = 0; index < width; index += 1) {
    bytes[index] = Number(current & 0xffn);
    current >>= 8n;
  }
  return bytes;
}

export type SwapArgs = {
  amount: bigint;
  minOut: bigint;
  sqrtPriceLimitX64?: bigint;
  amountSpecifiedIsInput?: boolean;
  aToB?: boolean;
};

export function makeSwapData(args: SwapArgs): string {
  const data = new Uint8Array(42);
  data.set(SWAP_DISCRIMINATOR, 0);
  data.set(littleEndian(args.amount, 8), 8);
  data.set(littleEndian(args.minOut, 8), 16);
  data.set(littleEndian(args.sqrtPriceLimitX64 ?? 0n, 16), 24);
  data[40] = (args.amountSpecifiedIsInput ?? true) ? 1 : 0;
  data[41] = (args.aToB ?? true) ? 1 : 0;
  return b58Encode(data);
}

/** Canonical legacy swap: 9 accounts (1 tick array) unless extraTickArrays > 0. */
export function makeSwapTransaction(options: {
  amount: bigint;
  minOut: bigint;
  direction?: SolanaSwapGuardDirection;
  extraTickArrays?: number;
  sqrtPriceLimitX64?: bigint;
  amountSpecifiedIsInput?: boolean;
  programId?: string;
  pool?: string;
  vaultA?: string;
  vaultB?: string;
}): SolanaLendingTransaction {
  const direction = options.direction ?? 'usdc-to-usdt';
  const aToB = direction === 'usdc-to-usdt';
  const tickArrays = [TICK_ARRAY];
  for (let index = 0; index < (options.extraTickArrays ?? 0); index += 1) {
    tickArrays.push(syntheticKey(50 + index));
  }
  const accountKeys = [
    FEE_PAYER,
    SPL_TOKEN_PROGRAM_ID,
    options.pool ?? PROFILE.pool,
    USER_USDC_TOKEN_ACCOUNT,
    options.vaultA ?? PROFILE.vaultA,
    USER_USDT_TOKEN_ACCOUNT,
    options.vaultB ?? PROFILE.vaultB,
    ...tickArrays,
    ORACLE,
    options.programId ?? ORCA_WHIRLPOOL_PROGRAM_ID,
  ];
  const accountIndexes = [
    1,
    0,
    2,
    3,
    4,
    5,
    6,
    ...tickArrays.map((_, index) => 7 + index),
    7 + tickArrays.length,
  ];
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: FEE_PAYER,
    recentBlockhash: RECENT_BLOCKHASH,
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 3,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [
      {
        programIdIndex: accountKeys.length - 1,
        accountIndexes,
        data: makeSwapData({
          amount: options.amount,
          minOut: options.minOut,
          sqrtPriceLimitX64: options.sqrtPriceLimitX64,
          amountSpecifiedIsInput: options.amountSpecifiedIsInput,
          aToB,
        }),
      },
    ],
  };
}

/** sqrtPriceX64 for a destination-per-source price with equal 6-decimal mints. */
export function sqrtPriceX64ForPrice(price: number): bigint {
  return BigInt(Math.round(Math.sqrt(price) * 2 ** 64));
}

export function makePoolData(options: {
  price?: number;
  mintA?: string;
  mintB?: string;
  vaultA?: string;
  vaultB?: string;
  config?: string;
  tickSpacing?: number;
  feeRate?: number;
}): Buffer {
  const data = Buffer.alloc(400);
  const writeKey = (offset: number, value: string) => data.set(b58Decode(value), offset);
  writeKey(8, options.config ?? PROFILE.whirlpoolsConfig);
  data.writeUInt16LE(options.tickSpacing ?? PROFILE.tickSpacing, 41);
  data.writeUInt16LE(options.feeRate ?? PROFILE.feeRate, 45);
  data.writeUInt16LE(PROFILE.protocolFeeRate, 47);
  data.set(littleEndian(sqrtPriceX64ForPrice(options.price ?? 1.0013), 16), 65);
  writeKey(101, options.mintA ?? SOLANA_USDC_MINT);
  writeKey(133, options.vaultA ?? PROFILE.vaultA);
  writeKey(181, options.mintB ?? SOLANA_USDT_MINT);
  writeKey(213, options.vaultB ?? PROFILE.vaultB);
  return data;
}

export const ASSESS_INPUT: SolanaSwapGuardInput = {
  profileId: 'solana-orca-whirlpool-usdc-usdt-1',
  direction: 'usdc-to-usdt',
  sourceDecisionPriceUsd: 1,
  destinationDecisionPriceUsd: 0.9987,
  policy: { maxSlippageBps: 50, maxReferenceDeviationBps: 100 },
};

export function makeOracleResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    verdict: 'ALLOW',
    maxDeviationPct: 0.05,
    staleDataRisk: false,
    participantCount: 6,
    consensusPrice: overrides.consensusPrice ?? 1,
    action: 'swap',
    attestation: { uid: 'uid-1', attester: 'attester-1', issuedAt: 0 },
    ...overrides,
  };
}

export function makeDeps(
  transaction: SolanaLendingTransaction,
  overrides: Partial<SolanaSwapGuardDependencies> & { poolPrice?: number } = {}
): SolanaSwapGuardDependencies {
  const price = overrides.poolPrice ?? 1.0013;
  const readMainnetAccount = jest.fn(async (address: string) => {
    if (address === ORCA_WHIRLPOOL_PROGRAM_ID) {
      return {
        owner: 'BPFLoaderUpgradeab1e11111111111111111111111',
        executable: true,
        data: Buffer.alloc(16),
      };
    }
    if (address === PROFILE.pool) {
      return { owner: ORCA_WHIRLPOOL_PROGRAM_ID, executable: false, data: makePoolData({ price }) };
    }
    if (address === TICK_ARRAY || address === ORACLE) {
      return { owner: ORCA_WHIRLPOOL_PROGRAM_ID, executable: false, data: Buffer.alloc(64) };
    }
    throw new Error(`unexpected account read: ${address}`);
  });
  const readSplTokenAccount = jest.fn(async (address: string) => {
    if (address === PROFILE.vaultA) return { owner: PROFILE.pool, mint: SOLANA_USDC_MINT };
    if (address === PROFILE.vaultB) return { owner: PROFILE.pool, mint: SOLANA_USDT_MINT };
    if (address === USER_USDC_TOKEN_ACCOUNT) return { owner: FEE_PAYER, mint: SOLANA_USDC_MINT };
    if (address === USER_USDT_TOKEN_ACCOUNT) return { owner: FEE_PAYER, mint: SOLANA_USDT_MINT };
    throw new Error(`unexpected token account read: ${address}`);
  });
  const simulate = jest.fn(async () => ({
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
    messageHash: solanaLendingMessageHash(transaction),
    simulationSlot: 281_000_000,
    simulatedAt: 1_800_000_000,
    status: 'SIMULATED' as const,
    unitsConsumed: 42_000,
    feeLamports: '5000',
  }));
  const checkOracle = jest.fn(async (input: { asset: string }) =>
    makeOracleResult({
      consensusPrice: input.asset === 'USDC' ? 1 : 0.9987,
    })
  );
  const {
    poolPrice: _poolPrice,
    readMainnetAccount: readMainnetAccountOverride,
    readSplTokenAccount: readSplTokenAccountOverride,
    simulate: simulateOverride,
    checkOracle: checkOracleOverride,
    ...rest
  } = overrides;
  return {
    readMainnetAccount: (readMainnetAccountOverride as never) ?? readMainnetAccount,
    readSplTokenAccount: (readSplTokenAccountOverride as never) ?? readSplTokenAccount,
    simulate: (simulateOverride as never) ?? simulate,
    checkOracle: (checkOracleOverride as never) ?? checkOracle,
    ...rest,
  };
}

export async function assessWith(
  transaction: SolanaLendingTransaction,
  input: SolanaSwapGuardInput = ASSESS_INPUT,
  dependencies?: SolanaSwapGuardDependencies
) {
  return assessSolanaSwapGuard(input, transaction, dependencies ?? makeDeps(transaction));
}

export const AMOUNT = 1_000_000n;
export const MIN_OUT = 1_001_000n;
