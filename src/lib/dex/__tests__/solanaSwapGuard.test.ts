import { ORCA_WHIRLPOOL_PROGRAM_ID, reviewedSolanaSwapProfile } from '../solanaOrcaWhirlpool';
import { assessSolanaSwapGuard } from '../solanaSwapGuard';

import {
  AMOUNT,
  ASSESS_INPUT,
  assessWith,
  FEE_PAYER,
  makeDeps,
  makeOracleResult,
  makePoolData,
  makeSwapTransaction,
  MIN_OUT,
  ORACLE,
  TICK_ARRAY,
  USER_USDC_TOKEN_ACCOUNT,
} from './solanaSwapFixtures';

import type { SolanaSwapGuardDependencies } from '../solanaSwapGuard';

const PROFILE = reviewedSolanaSwapProfile('solana-orca-whirlpool-usdc-usdt-1');

describe('assessSolanaSwapGuard', () => {
  it('returns an ALLOW with live pool state and a verified account set on the happy path', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const result = await assessWith(transaction);
    expect(result.verdict).toBe('ALLOW');
    expect(result.schema).toBe('insight.solana-swap-guard.v1');
    expect(result.chainId).toBe(0);
    expect(result.exactAction?.amount).toBe('1000000');
    expect(result.market.exactSwap.amountInRaw).toBe('1000000');
    expect(result.market.exactSwap.impliedMinDestinationPerSource).toBeCloseTo(1.001, 9);
    expect(result.protocolChecks.status).toBe('VERIFIED');
    expect(result.protocolChecks.poolState?.poolPrice).toBeCloseTo(1.0013, 6);
    expect(result.protocolChecks.poolState?.sqrtPriceX64).toBeTruthy();
    const roles = result.protocolChecks.accounts.map((account) => account.role);
    expect(roles).toEqual(
      expect.arrayContaining([
        'program',
        'pool',
        'vault',
        'tick-array',
        'oracle',
        'user-token-account',
      ])
    );
    expect(result.simulation?.status).toBe('SIMULATED');
    expect(result.oracleChecks.source.verdict).toBe('ALLOW');
    expect(result.oracleChecks.destination.verdict).toBe('ALLOW');
    expect(result.reasons).toEqual([
      'Exact swap instruction, program-owned accounts, live pool price within reference tolerance, both oracle checks, and live protocol simulation passed.',
    ]);
  });

  it('blocks when the live pool state no longer matches the reviewed identities', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const dependencies = makeDeps(transaction);
    const previous = dependencies.readMainnetAccount!;
    dependencies.readMainnetAccount = async (address) => {
      const account = await previous(address);
      if (address === PROFILE.pool) {
        return {
          ...account,
          data: makePoolData({ vaultA: PROFILE.vaultB }),
        };
      }
      return account;
    };
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('could not be verified live');
  });

  it('blocks when the pool price drifts beyond the reference deviation policy', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const result = await assessWith(
      transaction,
      ASSESS_INPUT,
      makeDeps(transaction, { poolPrice: 1.05 })
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'POOL_PRICE_DEVIATION_EXCEEDED',
        'MIN_OUT_BELOW_POOL_PRICE_TOLERANCE',
      ])
    );
  });

  it('blocks when the input token account is not owned by the fee payer', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const dependencies = makeDeps(transaction);
    const previous = dependencies.readSplTokenAccount!;
    dependencies.readSplTokenAccount = async (address) => {
      const account = await previous(address);
      if (address === USER_USDC_TOKEN_ACCOUNT) return { ...account, owner: ORACLE };
      return account;
    };
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('Input token account owner or mint');
  });

  it('blocks when the destination oracle is dangerous', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const dependencies = makeDeps(transaction);
    const previous = dependencies.checkOracle!;
    dependencies.checkOracle = async (input) =>
      input.asset === 'USDT' ? makeOracleResult({ verdict: 'BLOCK' }) : previous(input);
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('DANGER or BLOCK');
  });

  it('caps at CAUTION when only an oracle review warning is present', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const dependencies = makeDeps(transaction);
    const previous = dependencies.checkOracle!;
    dependencies.checkOracle = async (input) =>
      input.asset === 'USDT' ? makeOracleResult({ verdict: 'CAUTION' }) : previous(input);
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('CAUTION');
    expect(result.simulation?.status).toBe('SIMULATED');
  });

  it('blocks when a declared decision price deviates from oracle consensus', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const result = await assessWith(transaction, {
      ...ASSESS_INPUT,
      sourceDecisionPriceUsd: 1.05,
      // Widen the caller's own slippage policy so the failure isolates the
      // oracle-consensus deviation instead of the declared-price economics.
      policy: { maxSlippageBps: 1_000, maxReferenceDeviationBps: 100 },
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('SOURCE_DECISION_PRICE_DEVIATION_EXCEEDED');
  });

  it('blocks when the simulation fails or hashes mismatch', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const failing: SolanaSwapGuardDependencies = {
      ...makeDeps(transaction),
      simulate: async () => ({
        network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
        messageHash: '0x' + 'ab'.repeat(32),
        simulationSlot: 1,
        simulatedAt: 1,
        status: 'FAILED' as const,
        unitsConsumed: null,
        feeLamports: null,
      }),
    };
    const failed = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, failing);
    expect(failed.verdict).toBe('BLOCK');
    expect(failed.reasons.join(' ')).toContain('failed protocol simulation');

    const mismatched: SolanaSwapGuardDependencies = {
      ...makeDeps(transaction),
      simulate: async () => ({
        network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
        messageHash: '0x' + 'cd'.repeat(32),
        simulationSlot: 1,
        simulatedAt: 1,
        status: 'SIMULATED' as const,
        unitsConsumed: null,
        feeLamports: null,
      }),
    };
    const mismatch = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, mismatched);
    expect(mismatch.verdict).toBe('BLOCK');
    expect(mismatch.reasons.join(' ')).toContain('not for the exact reviewed message');
  });

  it('blocks outside-of-profile transactions without touching any RPC or oracle', async () => {
    const transaction = makeSwapTransaction({
      amount: AMOUNT,
      minOut: MIN_OUT,
      programId: FEE_PAYER,
    });
    const dependencies = makeDeps(transaction);
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('BLOCK');
    expect(result.exactAction).toBeNull();
    expect(result.protocolChecks.status).toBe('INVALID');
    expect(dependencies.checkOracle).not.toHaveBeenCalled();
    expect(dependencies.readMainnetAccount).not.toHaveBeenCalled();
    expect(dependencies.simulate).not.toHaveBeenCalled();
  });

  it('blocks closed when a live account read fails', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const dependencies = makeDeps(transaction);
    const previous = dependencies.readMainnetAccount!;
    dependencies.readMainnetAccount = async (address) => {
      if (address === TICK_ARRAY) throw new Error('RPC down');
      return previous(address);
    };
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('RPC down');
    expect(result.protocolChecks.poolState).toBeNull();
  });

  it('never lets a live-program substitution pass', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const dependencies = makeDeps(transaction);
    const previous = dependencies.readMainnetAccount!;
    dependencies.readMainnetAccount = async (address) => {
      const account = await previous(address);
      if (address === ORCA_WHIRLPOOL_PROGRAM_ID) return { ...account, executable: false };
      return account;
    };
    const result = await assessSolanaSwapGuard(ASSESS_INPUT, transaction, dependencies);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('not executable');
  });
});
