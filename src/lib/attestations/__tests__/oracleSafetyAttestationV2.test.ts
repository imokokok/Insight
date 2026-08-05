/**
 * Unit tests for the v2 EIP-712 oracle safety attestation.
 *
 * Mirrors the v1 test contract (graceful-disable, sign→verify round trip,
 * tamper-rejection, forged-signature rejection, attester-address publication)
 * and adds v2-specific coverage: quorum→coverageStatus derivation, hash-field
 * binding, and a stable UID test vector.
 */

import { computeRequestHash } from '../canonicalRequestHash';
import {
  buildMessage,
  V2_REQUIRED_PARTICIPANT_COUNT,
  V2_VALID_FOR_SECONDS,
} from '../oracleSafetyAttestationV2';
import { computeProviderObservationsHash } from '../providerObservationsHash';
import { reasonCodesFromContributingFactors } from '../reasonCodesHash';

import type { AttestationInputV2 } from '../oracleSafetyAttestationV2';

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
// Pinned "now" so UIDs are deterministic AND verify's expiry check sees a
// non-expired window (validUntil = checkedAt + 600s ≥ now).
const NOW_MS = 1700000000000;

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

function baseInput(overrides: Partial<AttestationInputV2> = {}): AttestationInputV2 {
  return {
    verdict: 'PASS',
    sourceAssetId: ETH_NATIVE,
    destinationAssetId: USDC_ETH,
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 50000,
    consensusPrice: 3000.05,
    maxDeviationPct: 1.5,
    manipulationRiskScore: 0.12,
    participantCount: 4,
    crossProviderAgreement: 0.985,
    maxStablecoinDepegPct: 0,
    maxDataAgeSeconds: 12,
    recommendedMaxPositionUsd: 250000,
    contributingFactors: [
      { rule: 'max_provider_deviation_pct' },
      { rule: 'cross_provider_agreement' },
    ],
    providerObservations: [
      {
        provider: 'chainlink',
        feedId: '0x...',
        value: 300005000000n,
        timestamp: 1700000000n,
        dataAgeSeconds: 2n,
        included: true,
        exclusionReason: '',
      },
      {
        provider: 'api3',
        feedId: 'ETH/USD',
        value: 299990000000n,
        timestamp: 1700000001n,
        dataAgeSeconds: 1n,
        included: true,
        exclusionReason: '',
      },
    ],
    checkedAtMs: NOW_MS, // pinned for deterministic UIDs
    ...overrides,
  };
}

describe('oracleSafetyAttestationV2', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    // Make verify's "now" === the pinned check time so attestations are never
    // expired in-test (validUntil = checkedAt + 600s).
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('returns null when no attester key is configured (graceful disable)', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    const mod = await import('../oracleSafetyAttestationV2');
    const att = await mod.signAttestationV2(baseInput());
    expect(att).toBeNull();
  });

  it('signs an attestation that verifies as valid (round trip)', async () => {
    const mod = await import('../oracleSafetyAttestationV2');
    const att = await mod.signAttestationV2(baseInput());
    expect(att).not.toBeNull();
    expect(att!.attester).toBe(TEST_ATTESTER);
    expect(att!.schemaVersion).toBe(2);

    const result = await mod.verifyAttestationV2(att!);
    expect(result.valid).toBe(true);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.expired).toBe(false);
  });

  it('rejects a tampered verdict (signature no longer matches)', async () => {
    const mod = await import('../oracleSafetyAttestationV2');
    const att = await mod.signAttestationV2(baseInput());
    const tampered = {
      ...att!,
      data: { ...att!.data, verdict: 'BLOCK' },
    };
    const result = await mod.verifyAttestationV2(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('rejects a forged signature from a different address', async () => {
    const mod = await import('../oracleSafetyAttestationV2');
    const att = await mod.signAttestationV2(baseInput());
    // Same UID + signature, but claim a different attester.
    const forged = {
      ...att!,
      attester: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // anvil account 1
    };
    const result = await mod.verifyAttestationV2(forged);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_invalid');
  });

  it('publishes a stable attester address', async () => {
    const mod = await import('../oracleSafetyAttestationV2');
    const att = await mod.signAttestationV2(baseInput());
    expect(att!.attester).toBe(TEST_ATTESTER);
  });

  // ---- v2-specific ----

  it('derives coverageStatus from the quorum gate', async () => {
    // PASS with 4 providers (≥3) → SUFFICIENT coverage.
    const sufficient = await buildMessage(baseInput({ participantCount: 4 }));
    expect(sufficient.coverageStatus).toBe('SUFFICIENT');
    expect(sufficient.requiredParticipantCount).toBe(BigInt(V2_REQUIRED_PARTICIPANT_COUNT));

    // Below the quorum floor → INSUFFICIENT coverage (the verdict escalation to
    // BLOCK happens in the rule engine; here we only assert the status field).
    const insufficient = await buildMessage(baseInput({ participantCount: 2 }));
    expect(insufficient.coverageStatus).toBe('INSUFFICIENT');
  });

  it('pins independenceStatus=UNASSESSED + sourceGroupCount=0 (v2.0)', async () => {
    const msg = await buildMessage(baseInput());
    expect(msg.independenceStatus).toBe('UNASSESSED');
    expect(msg.sourceGroupCount).toBe(0n);
    expect(msg.evaluationScope).toBe('SOURCE_ASSET_ONLY');
    expect(msg.schemaVersion).toBe(2n);
  });

  it('binds requestHash / reasonCodesHash / providerObservationsHash to the inputs', async () => {
    const input = baseInput();
    const msg = await buildMessage(input);

    expect(msg.requestHash).toBe(
      computeRequestHash({
        subjectChainId: input.subjectChainId,
        sourceAssetId: input.sourceAssetId,
        destinationAssetId: input.destinationAssetId,
        action: input.action,
        tradeAmountUsd: input.tradeAmountUsd,
      })
    );
    expect(msg.reasonCodesHash).toBe(
      // re-exported helpers must agree with the message's hash
      (await import('../reasonCodesHash')).computeReasonCodesHash(
        reasonCodesFromContributingFactors(input.contributingFactors)
      )
    );
    expect(msg.providerObservationsHash).toBe(
      computeProviderObservationsHash(input.providerObservations)
    );
  });

  it('evaluatedAssetIdsHash covers only the source leg (SOURCE_ASSET_ONLY)', async () => {
    const { encodeAbiParameters, keccak256 } = await import('viem');
    const input = baseInput();
    const msg = await buildMessage(input);
    const expected = keccak256(
      encodeAbiParameters([{ type: 'string[]', name: 'assetIds' }], [[input.sourceAssetId]])
    );
    expect(msg.evaluatedAssetIdsHash).toBe(expected);
    // destination is BOUND (in sourceAssetId/destinationAssetId/requestHash)
    // but NOT in the evaluated set.
  });

  it('sets validUntil = checkedAt + validForSeconds', async () => {
    const msg = await buildMessage(baseInput());
    expect(msg.checkedAt).toBe(1700000000n);
    expect(msg.validUntil).toBe(1700000000n + BigInt(V2_VALID_FOR_SECONDS));
  });

  it('is deterministic: identical inputs produce identical UIDs', async () => {
    const mod = await import('../oracleSafetyAttestationV2');
    const a = await mod.signAttestationV2(baseInput());
    const b = await mod.signAttestationV2(baseInput());
    expect(a!.uid).toBe(b!.uid);
    expect(a!.data.requestHash).toBe(b!.data.requestHash);
  });

  it('publishes a stable UID test vector for fixed inputs', async () => {
    // Reproducibility contract: fixed inputs (incl. pinned checkedAt) → this
    // exact UID. Both Insight and ThoughtPrint derive the same digest via the
    // published v2 domain + 26-field type layout.
    const mod = await import('../oracleSafetyAttestationV2');
    const att = await mod.signAttestationV2(baseInput());
    expect(att!.uid).toBe('0x6822cdca18d73ed65d0913506bd14db3b183692140924110d06acca703797c4b');
  });
});
