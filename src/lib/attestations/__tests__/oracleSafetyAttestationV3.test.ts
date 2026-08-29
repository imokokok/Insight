/**
 * Unit tests for the v3 EIP-712 oracle safety attestation (27 fields = v2's 26
 * + the signed independence threshold).
 *
 * v3 exists because v2 signs `sourceGroupCount` without signing the threshold
 * it is compared against, so a third party cannot tell whether the
 * independence gate passed. These tests pin the property v3 is supposed to
 * buy, not just the mechanics: **the threshold is inside the signed bytes, and
 * tampering with it invalidates the signature.**
 *
 * Also mirrors the v1/v2 test contract (graceful disable, sign→verify round
 * trip, tamper rejection, forged-signer rejection).
 */

import {
  buildMessage,
  V2_REQUIRED_NON_DERIVED_GROUPS,
  V2_TYPES,
} from '../oracleSafetyAttestationV2';
import {
  V3_REQUIRED_SOURCE_GROUP_COUNT,
  V3_TYPES,
  buildMessageV3,
} from '../oracleSafetyAttestationV3';

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

describe('oracleSafetyAttestationV3', () => {
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
    const mod = await import('../oracleSafetyAttestationV3');
    const att = await mod.signAttestationV3(baseInput());
    expect(att).toBeNull();
  });

  it('signs an attestation that verifies as valid (round trip)', async () => {
    const mod = await import('../oracleSafetyAttestationV3');
    const att = await mod.signAttestationV3(baseInput());
    expect(att).not.toBeNull();
    expect(att!.attester).toBe(TEST_ATTESTER);
    expect(att!.schemaVersion).toBe(3);

    const result = await mod.verifyAttestationV3(att!);
    expect(result.valid).toBe(true);
    expect(result.attester).toBe(TEST_ATTESTER);
    expect(result.expired).toBe(false);
  });

  it('rejects a tampered verdict (signature no longer matches)', async () => {
    const mod = await import('../oracleSafetyAttestationV3');
    const att = await mod.signAttestationV3(baseInput());
    const tampered = { ...att!, data: { ...att!.data, verdict: 'BLOCK' } };
    const result = await mod.verifyAttestationV3(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('rejects a forged signature from a different address', async () => {
    const mod = await import('../oracleSafetyAttestationV3');
    const att = await mod.signAttestationV3(baseInput());
    const forged = {
      ...att!,
      attester: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // anvil account 1
    };
    const result = await mod.verifyAttestationV3(forged);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('signature_invalid');
  });

  // ---- the reason v3 exists ----

  it('signs the independence threshold next to the count it is compared against', async () => {
    const msg = await buildMessageV3(baseInput());
    expect(msg.sourceGroupCount).toBe(2);
    expect(msg.requiredSourceGroupCount).toBe(V3_REQUIRED_SOURCE_GROUP_COUNT);
    expect(msg.independenceStatus).toBe('ASSESSED');
  });

  it('keeps the signed threshold equal to the gate constant the engine enforces', () => {
    // v3 must not drift from the independence gate the service actually runs.
    // The whole point of the field is that it MATCHES the decision.
    expect(V3_REQUIRED_SOURCE_GROUP_COUNT).toBe(V2_REQUIRED_NON_DERIVED_GROUPS);
  });

  it('rejects an attestation whose independence threshold was altered', async () => {
    // This is the failure v2 could not catch: v2 has no threshold field to
    // tamper with, so "2 against a requirement of 2" was pure assertion. Here,
    // rewriting the requirement to 1 (or 3) must break the signature.
    const mod = await import('../oracleSafetyAttestationV3');
    const att = await mod.signAttestationV3(baseInput());
    const tampered = {
      ...att!,
      data: { ...att!.data, requiredSourceGroupCount: 1 },
    };
    const result = await mod.verifyAttestationV3(tampered);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/uid_mismatch|signature_invalid/);
  });

  it('lets a holder recompute the gate from the signed bytes alone', async () => {
    // Simulates a third party with no access to the Insight codebase: read the
    // two signed numbers and reproduce independenceStatus.
    const msg = await buildMessageV3(
      baseInput({
        // chainlink + api3 + switchboard → 3 distinct non-derived groups
        providerObservations: [
          {
            provider: 'chainlink',
            feedId: 'a',
            value: 300005000000n,
            timestamp: 1700000000n,
            dataAgeSeconds: 2n,
            included: true,
            exclusionReason: '',
          },
          {
            provider: 'api3',
            feedId: 'b',
            value: 299990000000n,
            timestamp: 1700000001n,
            dataAgeSeconds: 1n,
            included: true,
            exclusionReason: '',
          },
          {
            provider: 'switchboard',
            feedId: 'c',
            value: 300010000000n,
            timestamp: 1700000002n,
            dataAgeSeconds: 3n,
            included: true,
            exclusionReason: '',
          },
        ],
      })
    );

    // Third-party logic, using only signed fields:
    const expectedStatus =
      msg.sourceGroupCount >= msg.requiredSourceGroupCount
        ? 'ASSESSED'
        : 'INSUFFICIENT_INDEPENDENCE';
    expect(expectedStatus).toBe(msg.independenceStatus);
    expect(msg.independenceStatus).toBe('ASSESSED');
  });

  // ---- layout ----

  it('keeps v2’s 26 fields as an unchanged prefix and appends one field', () => {
    const v2Names = V2_TYPES.OracleSafetyCheck.map((f) => `${f.name}:${f.type}`);
    const v3Names = V3_TYPES.OracleSafetyCheck.map((f) => `${f.name}:${f.type}`);

    expect(v3Names).toHaveLength(27);
    expect(v3Names.slice(0, 26)).toEqual(v2Names);
    expect(v3Names[26]).toBe('requiredSourceGroupCount:uint256');
  });

  it('carries the same evidence as v2 — only schemaVersion and the threshold differ', async () => {
    const input = baseInput();
    const v2 = await buildMessage(input);
    const v3 = await buildMessageV3(input);

    expect(v3.schemaVersion).toBe(3);
    expect({ ...v3, requiredSourceGroupCount: undefined, schemaVersion: 2 }).toEqual({
      ...v2,
      requiredSourceGroupCount: undefined,
    });
  });
});
