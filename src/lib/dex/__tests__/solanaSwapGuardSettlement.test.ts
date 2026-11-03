import type { SolanaExecutionFacts } from '@/lib/execution/solanaExecutionCollector';

import { createSolanaSwapGuardDecision } from '../solanaSwapGuardAttestation';
import {
  settleSolanaSwapGuard,
  verifySolanaSwapGuardSettlement,
  type SolanaSwapGuardSettlementDependencies,
} from '../solanaSwapGuardSettlement';

import { AMOUNT, assessWith, FEE_PAYER, makeSwapTransaction, MIN_OUT } from './solanaSwapFixtures';

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
});
