import type { SolanaLendingTransaction } from '@/lib/lending/solanaLendingAction';

import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  reviewedSolanaSwapProfile,
} from '../solanaOrcaWhirlpool';
import { decodeSolanaSwapExactCall, type SolanaSwapDecodedAction } from '../solanaSwapAction';

import {
  AMOUNT,
  assessWith,
  b58Encode,
  FEE_PAYER,
  makeDeps,
  makeSwapTransaction,
  MIN_OUT,
  ORACLE,
  TICK_ARRAY,
  USER_USDC_TOKEN_ACCOUNT,
  USER_USDT_TOKEN_ACCOUNT,
} from './solanaSwapFixtures';

const PROFILE = reviewedSolanaSwapProfile('solana-orca-whirlpool-usdc-usdt-1');

describe('decodeSolanaSwapExactCall', () => {
  it('decodes the canonical legacy swap and binds the exact identities', () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const action = decodeSolanaSwapExactCall(transaction, {
      profileId: 'solana-orca-whirlpool-usdc-usdt-1',
      direction: 'usdc-to-usdt',
    });
    const expected: Partial<SolanaSwapDecodedAction> = {
      profileId: 'solana-orca-whirlpool-usdc-usdt-1',
      direction: 'usdc-to-usdt',
      programId: ORCA_WHIRLPOOL_PROGRAM_ID,
      account: FEE_PAYER,
      pool: PROFILE.pool,
      amount: '1000000',
      minOut: '1001000',
      sqrtPriceLimitX64: '0',
      inputTokenAccount: USER_USDC_TOKEN_ACCOUNT,
      inputVault: PROFILE.vaultA,
      outputVault: PROFILE.vaultB,
      outputTokenAccount: USER_USDT_TOKEN_ACCOUNT,
      tickArray0: TICK_ARRAY,
      oracle: ORACLE,
    };
    expect(action).toMatchObject(expected);
    expect(action.instructionDataHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(action.messageHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('accepts the 11-account layout with three tick arrays', () => {
    const transaction = makeSwapTransaction({
      amount: AMOUNT,
      minOut: MIN_OUT,
      extraTickArrays: 2,
    });
    const action = decodeSolanaSwapExactCall(transaction, {
      profileId: 'solana-orca-whirlpool-usdc-usdt-1',
      direction: 'usdc-to-usdt',
    });
    expect(action.tickArray0).toBe(TICK_ARRAY);
  });

  it('resolves the reverse direction from the aToB flag', () => {
    const transaction = makeSwapTransaction({
      amount: AMOUNT,
      minOut: MIN_OUT,
      direction: 'usdt-to-usdc',
    });
    const action = decodeSolanaSwapExactCall(transaction, {
      profileId: 'solana-orca-whirlpool-usdc-usdt-1',
      direction: 'usdt-to-usdc',
    });
    expect(action.inputTokenAccount).toBe(USER_USDT_TOKEN_ACCOUNT);
    expect(action.outputTokenAccount).toBe(USER_USDC_TOKEN_ACCOUNT);
    expect(action.inputVault).toBe(PROFILE.vaultB);
  });

  const rejectionCases: Array<[string, SolanaLendingTransaction]> = [
    [
      'a different program',
      makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT, programId: SPL_TOKEN_PROGRAM_ID }),
    ],
    [
      'an unreviewed pool',
      makeSwapTransaction({
        amount: AMOUNT,
        minOut: MIN_OUT,
        pool: 'BZtgQEyS6eXUXicYPHecYQ7PybqodXQMvkjUbP4R8mUU',
      }),
    ],
    [
      'wrong vaults',
      makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT, vaultA: PROFILE.vaultB }),
    ],
    ['a zero minimum output', makeSwapTransaction({ amount: AMOUNT, minOut: 0n })],
    ['a zero input amount', makeSwapTransaction({ amount: 0n, minOut: MIN_OUT })],
    [
      'a nonzero sqrt price limit',
      makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT, sqrtPriceLimitX64: 5n }),
    ],
    [
      'exact-output mode',
      makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT, amountSpecifiedIsInput: false }),
    ],
    [
      'a direction mismatch',
      makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT, direction: 'usdt-to-usdc' }),
    ],
  ];
  for (const [label, transaction] of rejectionCases) {
    it(`rejects ${label}`, () => {
      expect(() =>
        decodeSolanaSwapExactCall(transaction, {
          profileId: 'solana-orca-whirlpool-usdc-usdt-1',
          direction: 'usdc-to-usdt',
        })
      ).toThrow();
    });
  }

  it('rejects a swapV2-style data payload', () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    transaction.instructions[0].data = b58Encode(new Uint8Array(43));
    expect(() =>
      decodeSolanaSwapExactCall(transaction, {
        profileId: 'solana-orca-whirlpool-usdc-usdt-1',
        direction: 'usdc-to-usdt',
      })
    ).toThrow('not canonical');
  });

  it('rejects a truncated or overlong swap payload', () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    transaction.instructions[0].data = b58Encode(new Uint8Array(32));
    expect(() =>
      decodeSolanaSwapExactCall(transaction, {
        profileId: 'solana-orca-whirlpool-usdc-usdt-1',
        direction: 'usdc-to-usdt',
      })
    ).toThrow('not canonical');
  });

  it('rejects more than one instruction and multi-signature messages', () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    transaction.instructions.push(transaction.instructions[0]);
    expect(() =>
      decodeSolanaSwapExactCall(transaction, {
        profileId: 'solana-orca-whirlpool-usdc-usdt-1',
        direction: 'usdc-to-usdt',
      })
    ).toThrow('exactly one protocol instruction');
    transaction.instructions.pop();
    transaction.header.numRequiredSignatures = 2;
    expect(() =>
      decodeSolanaSwapExactCall(transaction, {
        profileId: 'solana-orca-whirlpool-usdc-usdt-1',
        direction: 'usdc-to-usdt',
      })
    ).toThrow('exactly one fee-payer signature');
  });

  it('rejects fewer than 9 or more than 11 accounts', () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    transaction.instructions[0].accountIndexes = transaction.instructions[0].accountIndexes.slice(
      0,
      8
    );
    expect(() =>
      decodeSolanaSwapExactCall(transaction, {
        profileId: 'solana-orca-whirlpool-usdc-usdt-1',
        direction: 'usdc-to-usdt',
      })
    ).toThrow('not canonical');
    const wide = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT, extraTickArrays: 3 });
    expect(() =>
      decodeSolanaSwapExactCall(wide, {
        profileId: 'solana-orca-whirlpool-usdc-usdt-1',
        direction: 'usdc-to-usdt',
      })
    ).toThrow('not canonical');
  });

  it('keeps the whole transaction blocked when the decoded economics violate the policy', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: 900_000n });
    const result = await assessWith(transaction);
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toContain('MIN_OUT_INCONSISTENT_WITH_DECLARED_PRICES');
    // The instruction still decodes — the economics layer is what blocks it,
    // so no live account reads or simulation are attempted.
    expect(result.exactAction?.minOut).toBe('900000');
    expect(result.protocolChecks.status).toBe('UNAVAILABLE');
    expect(result.simulation).toBeNull();
    expect(makeDeps(transaction).simulate).toBeDefined();
  });
});
