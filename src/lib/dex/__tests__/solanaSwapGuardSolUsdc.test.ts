/** Exact-transaction Solana Swap Guard tests for the SOL/USDC Whirlpool lane. */

import type { SolanaLendingTransaction } from '@/lib/lending/solanaLendingAction';
import { solanaLendingMessageHash } from '@/lib/lending/solanaLendingAction';

import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  reviewedSolanaSwapProfile,
  SOLANA_USDC_MINT,
  SOLANA_WSOL_MINT,
  SPL_TOKEN_PROGRAM_ID,
  type SolanaSwapGuardDirection,
} from '../solanaOrcaWhirlpool';
import {
  assessSolanaSwapGuard,
  type SolanaSwapGuardDependencies,
  type SolanaSwapGuardInput,
} from '../solanaSwapGuard';

import {
  b58Decode,
  b58Encode,
  littleEndian,
  SWAP_DISCRIMINATOR,
  syntheticKey,
  TICK_ARRAY,
  ORACLE,
  FEE_PAYER,
  RECENT_BLOCKHASH,
  makeOracleResult,
  type SwapArgs,
} from './solanaSwapFixtures';

const PROFILE = reviewedSolanaSwapProfile('solana-orca-whirlpool-sol-usdc-1');
const USER_SOL_TOKEN_ACCOUNT = syntheticKey(33);
const USER_USDC_TOKEN_ACCOUNT = syntheticKey(31);

function makeSolSwapData(args: SwapArgs): string {
  const data = new Uint8Array(42);
  data.set(SWAP_DISCRIMINATOR, 0);
  data.set(littleEndian(args.amount, 8), 8);
  data.set(littleEndian(args.minOut, 8), 16);
  data.set(littleEndian(args.sqrtPriceLimitX64 ?? 0n, 16), 24);
  data[40] = (args.amountSpecifiedIsInput ?? true) ? 1 : 0;
  data[41] = (args.aToB ?? true) ? 1 : 0;
  return b58Encode(data);
}

/** aToB: true sells tokenA (SOL); false sells tokenB (USDC). */
function makeSolSwapTransaction(options: {
  amount: bigint;
  minOut: bigint;
  aToB: boolean;
}): SolanaLendingTransaction {
  const accountKeys = [
    FEE_PAYER,
    SPL_TOKEN_PROGRAM_ID,
    PROFILE.pool,
    USER_SOL_TOKEN_ACCOUNT,
    PROFILE.vaultA,
    USER_USDC_TOKEN_ACCOUNT,
    PROFILE.vaultB,
    TICK_ARRAY,
    ORACLE,
    ORCA_WHIRLPOOL_PROGRAM_ID,
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
        accountIndexes: [1, 0, 2, 3, 4, 5, 6, 7, 8],
        data: makeSolSwapData({
          amount: options.amount,
          minOut: options.minOut,
          aToB: options.aToB,
        }),
      },
    ],
  };
}

/**
 * Pool bytes with the raw tokenB-per-tokenA price baked in. The live SOL/USDC
 * pool carries 9/6 decimals, so a human price of ~93 USDC per SOL is a raw
 * price of 0.09307 (verified live 2026-11-04: sqrtPriceX64 5629940631665245047).
 */
function makeSolPoolData(rawPrice: number): Buffer {
  const data = Buffer.alloc(400);
  const writeKey = (offset: number, value: string) => data.set(b58Decode(value), offset);
  writeKey(8, PROFILE.whirlpoolsConfig);
  data.writeUInt16LE(PROFILE.tickSpacing, 41);
  data.writeUInt16LE(PROFILE.feeRate, 45);
  data.writeUInt16LE(PROFILE.protocolFeeRate, 47);
  data.set(littleEndian(BigInt(Math.round(Math.sqrt(rawPrice) * 2 ** 64)), 16), 65);
  writeKey(101, SOLANA_WSOL_MINT);
  writeKey(133, PROFILE.vaultA);
  writeKey(181, SOLANA_USDC_MINT);
  writeKey(213, PROFILE.vaultB);
  return data;
}

const RAW_PRICE = 0.09307; // human pool price ≈ 93.07 USDC per SOL

function makeSolInput(
  direction: SolanaSwapGuardDirection,
  overrides: Partial<SolanaSwapGuardInput> = {}
): SolanaSwapGuardInput {
  return {
    profileId: 'solana-orca-whirlpool-sol-usdc-1',
    direction,
    sourceDecisionPriceUsd: direction === 'sol-to-usdc' ? 93 : 1,
    destinationDecisionPriceUsd: direction === 'sol-to-usdc' ? 1 : 93,
    policy: { maxSlippageBps: 50, maxReferenceDeviationBps: 100 },
    ...overrides,
  };
}

function makeSolDeps(
  transaction: SolanaLendingTransaction,
  direction: SolanaSwapGuardDirection
): SolanaSwapGuardDependencies {
  const readMainnetAccount = jest.fn(async (address: string) => {
    if (address === ORCA_WHIRLPOOL_PROGRAM_ID) {
      return {
        owner: 'BPFLoaderUpgradeab1e11111111111111111111111',
        executable: true,
        data: Buffer.alloc(16),
      };
    }
    if (address === PROFILE.pool) {
      return {
        owner: ORCA_WHIRLPOOL_PROGRAM_ID,
        executable: false,
        data: makeSolPoolData(RAW_PRICE),
      };
    }
    if (address === TICK_ARRAY || address === ORACLE) {
      return { owner: ORCA_WHIRLPOOL_PROGRAM_ID, executable: false, data: Buffer.alloc(64) };
    }
    throw new Error(`unexpected account read: ${address}`);
  });
  const readSplTokenAccount = jest.fn(async (address: string) => {
    if (address === PROFILE.vaultA) return { owner: PROFILE.pool, mint: SOLANA_WSOL_MINT };
    if (address === PROFILE.vaultB) return { owner: PROFILE.pool, mint: SOLANA_USDC_MINT };
    if (address === USER_SOL_TOKEN_ACCOUNT) return { owner: FEE_PAYER, mint: SOLANA_WSOL_MINT };
    if (address === USER_USDC_TOKEN_ACCOUNT) return { owner: FEE_PAYER, mint: SOLANA_USDC_MINT };
    throw new Error(`unexpected token account read: ${address}`);
  });
  return {
    readMainnetAccount,
    readSplTokenAccount,
    simulate: jest.fn(async () => ({
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
      messageHash: solanaLendingMessageHash(transaction),
      simulationSlot: 281_000_000,
      simulatedAt: 1_800_000_000,
      status: 'SIMULATED' as const,
      unitsConsumed: 42_000,
      feeLamports: '5000',
    })),
    checkOracle: jest.fn(async (input: { asset: string }) =>
      makeOracleResult({
        consensusPrice: input.asset === 'SOL' ? 93 : 1,
      })
    ),
  } as unknown as SolanaSwapGuardDependencies & { direction?: SolanaSwapGuardDirection };
}

describe('SOL/USDC swap guard lane', () => {
  it('assesses an exact SOL→USDC swap end to end', async () => {
    // 0.1 SOL (1e8 raw, 9 decimals); minOut 9_295_000 raw USDC ≈ 9.295 USDC.
    const tx = makeSolSwapTransaction({ amount: 100_000_000n, minOut: 9_295_000n, aToB: true });
    const result = await assessSolanaSwapGuard(
      makeSolInput('sol-to-usdc'),
      tx,
      makeSolDeps(tx, 'sol-to-usdc')
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.profileId).toBe('solana-orca-whirlpool-sol-usdc-1');
    expect(result.market.sourceAsset).toBe('SOL');
    expect(result.market.destinationAsset).toBe('USDC');
    expect(result.exactAction?.direction).toBe('sol-to-usdc');
    // poolPrice is decimal-adjusted to human USDC-per-SOL (~93.07), not raw 0.093.
    expect(result.protocolChecks.poolState?.poolPrice).not.toBeNull();
    expect(result.protocolChecks.poolState?.poolPrice as number).toBeGreaterThan(90);
    // tradeAmountUsd = 0.1 SOL × 93 = 9.3.
    expect(result.market.exactSwap.impliedMinDestinationPerSource).toBeCloseTo(92.95, 5);
  });

  it('assesses an exact USDC→SOL swap with the inverted pool price', async () => {
    // 1 USDC (1e6 raw, 6 decimals); minOut 10_700_000 raw SOL ≈ 0.0107 SOL.
    const tx = makeSolSwapTransaction({ amount: 1_000_000n, minOut: 10_700_000n, aToB: false });
    const result = await assessSolanaSwapGuard(
      makeSolInput('usdc-to-sol'),
      tx,
      makeSolDeps(tx, 'usdc-to-sol')
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.market.sourceAsset).toBe('USDC');
    expect(result.market.destinationAsset).toBe('SOL');
    // poolPrice = 1 / 93.07 (human SOL per USDC), inverted from the raw ratio.
    expect(result.protocolChecks.poolState?.poolPrice as number).toBeLessThan(0.011);
  });

  it('rejects an aToB flag that contradicts the declared direction', async () => {
    const tx = makeSolSwapTransaction({ amount: 100_000_000n, minOut: 9_295_000n, aToB: false });
    const result = await assessSolanaSwapGuard(
      makeSolInput('sol-to-usdc'),
      tx,
      makeSolDeps(tx, 'sol-to-usdc')
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/reviewed Whirlpool swap profile/);
  });

  it('rejects directions the reviewed profile does not trade', async () => {
    const tx = makeSolSwapTransaction({ amount: 100_000_000n, minOut: 9_295_000n, aToB: true });
    await expect(
      assessSolanaSwapGuard(makeSolInput('usdc-to-usdt'), tx, makeSolDeps(tx, 'usdc-to-usdt'))
    ).rejects.toThrow(/does not trade this direction/);
  });
});
