import { ed25519 } from '@noble/curves/ed25519';

import {
  solanaEvidenceSignerPublicKey,
  verifySolanaEvidence,
} from '@/lib/execution/solanaEvidence';

import {
  createSolanaSwapGuardDecision,
  solanaSwapGuardDecisionHash,
  SOLANA_SWAP_GUARD_VALID_FOR_SECONDS,
  verifySolanaSwapGuardDecision,
} from '../solanaSwapGuardAttestation';

import { AMOUNT, assessWith, makeSwapTransaction, MIN_OUT } from './solanaSwapFixtures';

const SEED = '11'.repeat(32);

describe('Solana Swap Guard decision attestation', () => {
  const previousSeed = process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
  beforeAll(() => {
    process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = SEED;
  });
  afterAll(() => {
    if (previousSeed === undefined) delete process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
    else process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = previousSeed;
  });

  it('signs a short-lived attestation for an ALLOW bound to the exact message', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const guard = await assessWith(transaction);
    expect(guard.verdict).toBe('ALLOW');
    const issuedAt = 1_800_000_000;
    const decision = createSolanaSwapGuardDecision(guard, transaction, {
      now: () => new Date(issuedAt * 1_000),
    });
    expect(decision.attestation).not.toBeNull();
    expect(decision.decisionHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(decision.attestation?.payload.decisionHash).toBe(decision.decisionHash);
    expect(decision.attestation?.payload.validUntil).toBe(
      issuedAt + SOLANA_SWAP_GUARD_VALID_FOR_SECONDS
    );
    expect(
      verifySolanaEvidence(decision.attestation, solanaEvidenceSignerPublicKey() as string)
    ).toBe(true);

    const verification = verifySolanaSwapGuardDecision(decision, {
      now: () => new Date(issuedAt * 1_000),
    });
    expect(verification).toMatchObject({
      valid: true,
      signatureValid: true,
      trusted: true,
      expired: false,
      reason: 'OK',
    });
  });

  it('creates no attestation for a BLOCK and reports MALFORMED for junk', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: 100n });
    const guard = await assessWith(transaction);
    expect(guard.verdict).toBe('BLOCK');
    const decision = createSolanaSwapGuardDecision(guard, transaction);
    expect(decision.attestation).toBeNull();
    expect(verifySolanaSwapGuardDecision({ schema: 'junk' }).reason).toBe('MALFORMED');
  });

  it('rejects an expired attestation', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const guard = await assessWith(transaction);
    const issuedAt = 1_800_000_000;
    const decision = createSolanaSwapGuardDecision(guard, transaction, {
      now: () => new Date(issuedAt * 1_000),
    });
    const verification = verifySolanaSwapGuardDecision(decision, {
      now: () => new Date((issuedAt + SOLANA_SWAP_GUARD_VALID_FOR_SECONDS + 1) * 1_000),
    });
    expect(verification).toMatchObject({ valid: false, expired: true, reason: 'EXPIRED' });
  });

  it('rejects tampering with the transaction, action, or decision hash', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const guard = await assessWith(transaction);
    const decision = createSolanaSwapGuardDecision(guard, transaction);
    const swapped = makeSwapTransaction({ amount: AMOUNT * 2n, minOut: MIN_OUT });
    const tampered = { ...decision, transaction: swapped };
    // The exact action is re-derived from the presented transaction first, so a
    // different message fails the action binding before the hash comparison.
    expect(verifySolanaSwapGuardDecision(tampered).reason).toBe('EXACT_ACTION_MISMATCH');

    const hashTampered = { ...decision, decisionHash: `0x${'ab'.repeat(32)}` };
    expect(verifySolanaSwapGuardDecision(hashTampered).reason).toBe('DECISION_HASH_MISMATCH');

    const actionTampered = {
      ...decision,
      action: { ...decision.action, amount: '2' },
    };
    expect(verifySolanaSwapGuardDecision(actionTampered).reason).toBe('EXACT_ACTION_MISMATCH');
  });

  it('rejects an attestation signed by a foreign key', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const guard = await assessWith(transaction);
    const decision = createSolanaSwapGuardDecision(guard, transaction);
    const foreignSeed = ed25519.utils.randomPrivateKey();
    expect(
      verifySolanaSwapGuardDecision(decision, {
        trustedPublicKey: Buffer.from(ed25519.getPublicKey(foreignSeed)).toString('hex'),
      }).reason
    ).toBe('UNTRUSTED_ATTESTER');
  });

  it('is deterministic for identical guard, transaction, and action', async () => {
    const transaction = makeSwapTransaction({ amount: AMOUNT, minOut: MIN_OUT });
    const guard = await assessWith(transaction);
    expect(solanaSwapGuardDecisionHash({ guard, transaction, action: guard.exactAction })).toBe(
      solanaSwapGuardDecisionHash({ guard, transaction, action: guard.exactAction })
    );
  });
});
