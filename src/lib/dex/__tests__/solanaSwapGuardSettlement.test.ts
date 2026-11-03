import { ed25519 } from '@noble/curves/ed25519';

import type { SolanaExecutionFacts } from '@/lib/execution/solanaExecutionCollector';
import { encodeUnsignedSolanaLendingMessage } from '@/lib/lending/solanaLendingAction';

import {
  reviewedSolanaSwapProfile,
  SOLANA_USDC_MINT,
  SOLANA_USDT_MINT,
} from '../solanaOrcaWhirlpool';
import { createSolanaSwapGuardDecision } from '../solanaSwapGuardAttestation';
import {
  settleSolanaSwapGuard,
  verifyExecutedMessageBinding,
  verifySolanaSwapGuardSettlement,
  type SolanaSwapGuardSettlementDependencies,
} from '../solanaSwapGuardSettlement';

import {
  AMOUNT,
  assessWith,
  b58Encode,
  FEE_PAYER,
  makeSwapTransaction,
  makeDeps,
  MIN_OUT,
  ASSESS_INPUT,
  USER_USDC_TOKEN_ACCOUNT,
  USER_USDT_TOKEN_ACCOUNT,
} from './solanaSwapFixtures';

const SEED = '13'.repeat(32);
const SIGNATURE = '5'.repeat(87);
const NOW = 1_800_000_000;

function facts(overrides: Partial<SolanaExecutionFacts> = {}): SolanaExecutionFacts {
  return {
    schema: 'insight.solana-execution-facts.v1',
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    signature: SIGNATURE,
    status: 'CONFIRMED',
    slot: 281_500_000,
    executedAt: NOW - 30,
    observedAt: NOW - 10,
    taker: FEE_PAYER,
    sourceAssetId:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    destinationAssetId:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spl:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    sourceAmount: '1',
    sourceAmountRaw: '1000000',
    sourceDecimals: 6,
    destinationAmount: '1.002',
    destinationAmountRaw: '1002000',
    destinationDecimals: 6,
    sourceTokenProgramId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    destinationTokenProgramId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    nativeLamportDelta: null,
    executedPrice: '1.002',
    feeLamports: '5000',
    fillScope: 'NET_WALLET_OWNED_SPL_BALANCE_DELTA',
    unavailableReason: null,
    ...overrides,
  };
}

async function signedDecision() {
  const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
  const guard = await assessWith(transaction);
  return createSolanaSwapGuardDecision(guard, transaction, {
    now: () => new Date(NOW * 1_000),
  });
}

function settleDependencies(
  factsResult: SolanaExecutionFacts,
  overrides: Partial<SolanaSwapGuardSettlementDependencies> = {}
): SolanaSwapGuardSettlementDependencies {
  return {
    collectFacts: jest.fn(async () => ({ ok: true, facts: factsResult })),
    // Fixture signatures are synthetic base58 strings, not real Ed25519
    // signatures; the real cryptographic binding is exercised in its own test.
    verifyMessageBinding: jest.fn(() => true),
    now: () => NOW,
    ...overrides,
  };
}

describe('settleSolanaSwapGuard', () => {
  const previousSeed = process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
  beforeAll(() => {
    process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = SEED;
  });
  afterAll(() => {
    if (previousSeed === undefined) delete process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
    else process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = previousSeed;
  });

  it('signs a SETTLED receipt when the chain deltas meet the reviewed amounts', async () => {
    const decision = await signedDecision();
    const dependencies = settleDependencies(facts());
    const result = await settleSolanaSwapGuard({ decision, signature: SIGNATURE }, dependencies);
    expect(result.ok).toBe(true);
    expect(result.settlement?.payload).toMatchObject({
      status: 'SETTLED',
      reconciliation: 'AMOUNTS_AND_MIN_OUT_RECONCILED',
      amountInRaw: '1000000',
      minOutRaw: '1001000',
      sourceAmountRaw: '1000000',
      destinationAmountRaw: '1002000',
      schemaVersion: 1,
    });
    expect(dependencies.collectFacts).toHaveBeenCalledWith(
      expect.objectContaining({ signature: SIGNATURE, taker: decision.action?.account })
    );
  });

  it('reports REVERTED and UNRECONCILED closures with explicit codes', async () => {
    const decision = await signedDecision();
    const reverted = await settleSolanaSwapGuard(
      { decision, signature: SIGNATURE },
      settleDependencies(
        facts({ status: 'REVERTED', sourceAmountRaw: null, destinationAmountRaw: null })
      )
    );
    expect(reverted.settlement?.payload).toMatchObject({
      status: 'REVERTED',
      reconciliation: 'EXECUTION_REVERTED',
    });

    const mismatch = await settleSolanaSwapGuard(
      { decision, signature: SIGNATURE },
      settleDependencies(facts({ sourceAmountRaw: '999999' }))
    );
    expect(mismatch.settlement?.payload).toMatchObject({
      status: 'UNRECONCILED',
      reconciliation: 'SOURCE_AMOUNT_MISMATCH',
    });

    const violated = await settleSolanaSwapGuard(
      { decision, signature: SIGNATURE },
      settleDependencies(facts({ destinationAmountRaw: '1000' }))
    );
    expect(violated.settlement?.payload).toMatchObject({
      status: 'UNRECONCILED',
      reconciliation: 'MIN_OUT_VIOLATED',
    });

    const unavailable = await settleSolanaSwapGuard(
      { decision, signature: SIGNATURE },
      settleDependencies(
        facts({
          destinationAmountRaw: null,
          destinationAmount: null,
          unavailableReason: 'DESTINATION_DELTA_UNAVAILABLE',
        })
      )
    );
    expect(unavailable.settlement?.payload).toMatchObject({
      status: 'UNRECONCILED',
      reconciliation: 'DESTINATION_DELTA_UNAVAILABLE',
    });
  });

  it('rejects malformed signatures and unverifiable decisions', async () => {
    const decision = await signedDecision();
    expect(
      (
        await settleSolanaSwapGuard(
          { decision, signature: 'not-a-signature' },
          settleDependencies(facts())
        )
      ).code
    ).toBe('INVALID_SIGNATURE');
    expect(
      (
        await settleSolanaSwapGuard(
          { decision: { schema: 'junk' }, signature: SIGNATURE },
          settleDependencies(facts())
        )
      ).code
    ).toBe('DECISION_INVALID');
    const collectionFailure = settleDependencies(facts(), {
      collectFacts: jest.fn(async () => ({
        ok: false as const,
        code: 'NOT_FOUND' as const,
        message: 'signature not found',
      })),
    });
    expect(
      (await settleSolanaSwapGuard({ decision, signature: SIGNATURE }, collectionFailure)).code
    ).toBe('NOT_FOUND');
  });

  it('verifies its own signed settlement and rejects tampering', async () => {
    const decision = await signedDecision();
    const result = await settleSolanaSwapGuard(
      { decision, signature: SIGNATURE },
      settleDependencies(facts())
    );
    const settlement = result.settlement!;
    expect(verifySolanaSwapGuardSettlement(settlement).valid).toBe(true);
    const tampered = {
      ...settlement,
      payload: { ...settlement.payload, status: 'SETTLED', destinationAmountRaw: '999999999' },
    };
    expect(verifySolanaSwapGuardSettlement(tampered).valid).toBe(false);
    expect(verifySolanaSwapGuardSettlement(tampered).reason).toBe('INVALID_SIGNATURE');
    expect(verifySolanaSwapGuardSettlement(null).reason).toBe('UNTRUSTED_ATTESTER');
  });

  it('rejects an on-chain signature that does not bind the attested message', async () => {
    const decision = await signedDecision();
    const dependencies = settleDependencies(facts());
    // Only collectFacts and now are stubbed, so the real (default) Ed25519
    // message binding runs and the synthetic fixture signature must fail it.
    const result = await settleSolanaSwapGuard(
      { decision, signature: SIGNATURE },
      { collectFacts: dependencies.collectFacts, now: dependencies.now }
    );
    expect(result).toMatchObject({ ok: false, code: 'EXECUTED_MESSAGE_MISMATCH' });
    expect(dependencies.collectFacts).not.toHaveBeenCalled();
  });

  it('closes a real Ed25519-bound execution to SETTLED end to end', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const publicKey = ed25519.getPublicKey(seed);
    const taker = b58Encode(publicKey);
    const profile = reviewedSolanaSwapProfile('solana-orca-whirlpool-usdc-usdt-1');
    const base = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const transaction = {
      ...base,
      feePayer: taker,
      accountKeys: [taker, ...base.accountKeys.slice(1)],
    };
    const readSplTokenAccount = jest.fn(async (address: string) => {
      if (address === profile.vaultA) return { owner: profile.pool, mint: SOLANA_USDC_MINT };
      if (address === profile.vaultB) return { owner: profile.pool, mint: SOLANA_USDT_MINT };
      if (address === USER_USDC_TOKEN_ACCOUNT) return { owner: taker, mint: SOLANA_USDC_MINT };
      if (address === USER_USDT_TOKEN_ACCOUNT) return { owner: taker, mint: SOLANA_USDT_MINT };
      throw new Error(`unexpected token account read: ${address}`);
    });
    const guard = await assessWith(
      transaction,
      ASSESS_INPUT,
      makeDeps(transaction, { readSplTokenAccount: readSplTokenAccount as never })
    );
    const decision = createSolanaSwapGuardDecision(guard, transaction, {
      now: () => new Date(NOW * 1_000),
    });
    expect(decision.attestation).not.toBeNull();
    const signature = b58Encode(
      ed25519.sign(encodeUnsignedSolanaLendingMessage(transaction), seed)
    );
    expect(verifyExecutedMessageBinding({ signature, transaction })).toBe(true);
    const stubbed = settleDependencies(facts({ signature, taker }), {});
    const result = await settleSolanaSwapGuard(
      { decision, signature },
      { collectFacts: stubbed.collectFacts, now: stubbed.now }
    );
    expect(result.ok).toBe(true);
    expect(result.settlement?.payload).toMatchObject({
      status: 'SETTLED',
      reconciliation: 'AMOUNTS_AND_MIN_OUT_RECONCILED',
      taker,
      signature,
    });
  });

  it('binds nothing when the signature verifies over a different message', async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const publicKey = ed25519.getPublicKey(seed);
    const taker = b58Encode(publicKey);
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const withTaker = {
      ...transaction,
      feePayer: taker,
      accountKeys: [taker, ...transaction.accountKeys.slice(1)],
    };
    const signature = b58Encode(ed25519.sign(encodeUnsignedSolanaLendingMessage(withTaker), seed));
    expect(verifyExecutedMessageBinding({ signature, transaction: withTaker })).toBe(true);
    // The same key over a different message (the original fixture message) fails.
    expect(verifyExecutedMessageBinding({ signature, transaction })).toBe(false);
    // A tampered amount changes the message bytes and breaks the binding.
    const tampered = makeSwapTransaction({ amount: AMOUNT + 1n, minOut: MIN_OUT });
    const tamperedWithTaker = {
      ...tampered,
      feePayer: taker,
      accountKeys: [taker, ...tampered.accountKeys.slice(1)],
    };
    expect(verifyExecutedMessageBinding({ signature, transaction: tamperedWithTaker })).toBe(false);
  });
});
