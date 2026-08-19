/**
 * Unit tests for the OracleSafetyRecheck EIP-712 type (28 fields = v2's 26 +
 * originalUid + originalRequestHash).
 *
 * Mirrors the v2 test contract (graceful-disable, sign→verify round trip, JSON
 * wire round trip, tamper rejection) and adds recheck-specific coverage:
 *   - the 28-field type is distinct from v2's 26-field type (a v2 verifier
 *     must NOT accept a recheck — it would ignore the reference fields)
 *   - the requestHash binding invariant (recheck.data.requestHash ===
 *     originalRequestHash when the re-run uses the same trade params)
 *   - a stable UID test vector for reproducibility by both Insight + ThoughtPrint
 */

import { computeRequestHash } from '../canonicalRequestHash';
import { buildMessage } from '../oracleSafetyAttestationV2';

import type { AttestationInputV2 } from '../oracleSafetyAttestationV2';

// Anvil account 0 — well-known throwaway key, used only for tests.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ATTESTER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
// Pinned "now" so UIDs are deterministic AND verify's expiry check sees a
// non-expired window (validUntil = checkedAt + 600s ≥ now).
const NOW_MS = 1700000000000;

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Fixed original references for the test vector.
const ORIGINAL_UID = '0x6822cdca18d73ed65d0913506bd14db3b183692140924110d06acca703797c4b';
const ORIGINAL_REQUEST_HASH = computeRequestHash({
  subjectChainId: 1,
  sourceAssetId: ETH_NATIVE,
  destinationAssetId: USDC_ETH,
  action: 'swap',
  tradeAmountUsd: 50000,
});

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
    contributingFactors: [{ rule: 'max_provider_deviation_pct' }],
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
    ],
    checkedAtMs: NOW_MS, // pinned for deterministic UIDs
    ...overrides,
  };
}

describe('OracleSafetyRecheck', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('returns null when no attester key is configured (graceful disable)', async () => {
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
    const { signRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(att).toBeNull();
  });

  it('signs a recheck that verifies as valid (sign→verify round trip)', async () => {
    const { signRecheck, verifyRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(att).not.toBeNull();
    expect(att!.type).toBe('OracleSafetyRecheck');
    expect(att!.eip712.primaryType).toBe('OracleSafetyRecheck');
    expect(att!.schemaVersion).toBe(2);

    const result = await verifyRecheck(att!);
    expect(result.valid).toBe(true);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.uid).toBe(att!.uid);
    expect(result.expired).toBe(false);
  });

  it('carries the original references in the signed data', async () => {
    const { signRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(att!.data.originalUid).toBe(ORIGINAL_UID);
    expect(att!.data.originalRequestHash).toBe(ORIGINAL_REQUEST_HASH);
  });

  it('binds the same trade: recheck.data.requestHash === originalRequestHash', async () => {
    // The recheck re-runs with the SAME trade params as the original, so its own
    // requestHash (one of the 26 v2 fields) equals originalRequestHash. This is
    // the binding verifiers assert to confirm same-trade continuity.
    const { signRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(att!.data.requestHash).toBe(ORIGINAL_REQUEST_HASH);
    expect(att!.data.requestHash).toBe(att!.data.originalRequestHash);
  });

  it('survives a JSON wire round trip and still verifies', async () => {
    // The recheck travels through API responses + the verify body as JSON.
    // bigint can't be JSON-serialized; the v2 data stores numbers, so the
    // recheck (which extends v2 data) is JSON-safe. This proves the round trip.
    const { signRecheck, verifyRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    // JSON.stringify throws on bigint — if any field were still bigint this
    // would throw and fail the test.
    const wire = JSON.parse(JSON.stringify(att));
    expect(wire.data.originalUid).toBe(ORIGINAL_UID);

    const result = await verifyRecheck(wire);
    expect(result.valid).toBe(true);
    expect(result.uid).toBe(att!.uid);
  });

  it('rejects a tampered recheck (originalUid modified after signing)', async () => {
    const { signRecheck, verifyRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    const tampered = {
      ...att!,
      data: { ...att!.data, originalUid: '0xdeadbeef' },
    };

    const result = await verifyRecheck(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('rejects a forged signature (wrong attester)', async () => {
    const { signRecheck, verifyRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    // Claim a different attester — signature recovery against the wrong address
    // must fail.
    const forged = { ...att!, attester: '0x0000000000000000000000000000000000000001' };

    const result = await verifyRecheck(forged);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_invalid');
  });

  it('rejects a recheck whose own requestHash != originalRequestHash (binding invariant)', async () => {
    // A genuinely-signed recheck (valid uid + signature) that violates the
    // same-trade binding contract must still fail verification — verifiers rely
    // on the binding to confirm "this recheck re-verifies the ORIGINAL trade",
    // and signature recovery alone does NOT prove that.
    const { signRecheck, verifyRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const wrongOriginalHash = ('0x' + 'f'.repeat(64)) as `0x${string}`;
    expect(v2Data.requestHash).not.toBe(wrongOriginalHash);

    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: wrongOriginalHash,
    });
    expect(att).not.toBeNull();

    const result = await verifyRecheck(att!);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/recheck_binding_mismatch/);
  });

  it('uses a 28-field type distinct from v2 (a recheck is NOT a plain v2 attestation)', async () => {
    // The recheck's RECHECK_TYPES has 28 fields (v2's 26 + originalUid +
    // originalRequestHash). A v2 verifier using the 26-field type would compute
    // a different UID (it ignores the 2 reference fields), so it must NOT accept
    // a recheck. This test asserts the type layouts differ in field count.
    const v2Mod = await import('../oracleSafetyAttestationV2');
    const recheckMod = await import('../oracleSafetyRecheck');
    const v2FieldCount = v2Mod.V2_TYPES.OracleSafetyCheck.length;
    const recheckFieldCount = recheckMod.RECHECK_TYPES.OracleSafetyRecheck.length;
    expect(recheckFieldCount).toBe(v2FieldCount + 2);
    expect(recheckMod.RECHECK_TYPES.OracleSafetyRecheck[v2FieldCount].name).toBe('originalUid');
    expect(recheckMod.RECHECK_TYPES.OracleSafetyRecheck[v2FieldCount + 1].name).toBe(
      'originalRequestHash'
    );
    // The recheck reuses the v2 domain (same separator) but a distinct primaryType.
    expect(recheckMod.RECHECK_DOMAIN).toBe(v2Mod.V2_DOMAIN);
    expect(recheckMod.RECHECK_PRIMARY_TYPE).toBe('OracleSafetyRecheck');
    expect(v2Mod.V2_PRIMARY_TYPE).toBe('OracleSafetyCheck');
  });

  it('publishes a stable UID test vector for fixed inputs', async () => {
    // Reproducibility contract: fixed v2 data + originalUid + originalRequestHash
    // → this exact UID. Both Insight and ThoughtPrint derive the same digest via
    // the published recheck domain + 28-field type layout.
    const mod = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await mod.signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    expect(att!.uid).toBe('0x68e48c6107146b0db117774fe1f508392fff11709d07dda7cfee1e97258528f4');
  });

  it('marks an expired recheck as expired (signature still valid)', async () => {
    const { signRecheck, verifyRecheck } = await import('../oracleSafetyRecheck');
    const v2Data = await buildMessage(baseInput());
    const att = await signRecheck({
      v2Data,
      originalUid: ORIGINAL_UID,
      originalRequestHash: ORIGINAL_REQUEST_HASH,
    });
    // Advance now past validUntil (checkedAt + 600s + 1s).
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS + (600 + 1) * 1000);

    const result = await verifyRecheck(att!);
    expect(result.expired).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });
});
