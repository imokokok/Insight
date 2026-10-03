/**
 * @fileoverview Oracle Test Attestation — a signed, independently verifiable
 * record of an oracle scenario run.
 *
 * A test harness that only prints results produces claims nobody can check.
 * This module signs the OUTCOME of a deterministic scenario run with the SAME
 * attester account and EIP-712 machinery as the pre-trade and Oracle Watch
 * lines, so a protocol (or auditor) holding the receipt can verify:
 *   - exactly WHICH scenario ran (canonical scenario hash, byte-stable),
 *   - what the detection policy did (verdict, per-step counts, reason codes),
 *   - that the receipt comes from Insight's published attester.
 *
 * The run itself is deterministic (same scenario bytes → same result), so the
 * attestation's fields are reproducible by anyone re-running the scenario.
 * What the signature adds is authorship and integrity: Insight asserts THIS
 * verdict for THIS scenario at THIS time.
 *
 * Design rules inherited from the existing attestation lines:
 *   - A missing attester key means "attestation unavailable", never a
 *     different verdict. Signing is additive to the run result.
 *   - Reason codes are bound by hash so the verdict stays explainable.
 *   - Field order is FROZEN for schemaVersion 1; any change is a schema bump.
 */

import { getAttesterAccount, type AttesterAccount } from '@/lib/attestations/attesterAccount';
import { computeReasonCodesHash } from '@/lib/attestations/reasonCodesHash';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { HARNESS_VERSION } from './engine';
import { canonicalJson, type OracleScenario } from './schema';

import type { ScenarioRunResult } from './engine';

const logger = createLogger('OracleTestAttestation');

export const TEST_SCHEMA_VERSION = 1;
/** How long a test attestation stays in its validity window. A run is a
 *  statement about a moment; the engine is deterministic, but policies and
 *  fixtures evolve, so receipts age out like the other lines. */
export const TEST_VALID_FOR_SECONDS = 3600;

/** EIP-712 domain. Distinct `name` so a receipt can never be replayed on the
 *  pre-trade / watch surfaces (their domains differ by name). */
export const TEST_DOMAIN = {
  name: 'Insight Oracle Test',
  version: '1',
  chainId: 1,
} as const;

export const TEST_PRIMARY_TYPE = 'OracleScenarioRun';

/**
 * v1 type layout — FROZEN. Field order is fixed; reordering changes every UID
 * and would invalidate receipts already handed out.
 */
export const TEST_TYPES = {
  OracleScenarioRun: [
    { name: 'scenarioId', type: 'string' },
    { name: 'scenarioKind', type: 'string' },
    { name: 'verdict', type: 'string' },
    { name: 'harnessVersion', type: 'string' },
    { name: 'stepCount', type: 'uint256' },
    { name: 'caughtStepCount', type: 'uint256' },
    { name: 'falsePositiveCount', type: 'uint256' },
    { name: 'detectionRate', type: 'uint256' },
    { name: 'scenarioHash', type: 'bytes32' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'ranAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/** Signed fields as JSON-serializable values (the wire format). */
export interface AttestationDataTest {
  scenarioId: string;
  scenarioKind: string;
  verdict: string;
  harnessVersion: string;
  stepCount: number;
  caughtStepCount: number;
  falsePositiveCount: number;
  /** detectionRate scaled by 1e4 (basis points of the attack steps caught). */
  detectionRate: number;
  scenarioHash: string;
  reasonCodesHash: string;
  ranAt: number;
  validUntil: number;
  schemaVersion: 1;
}

/** keccak of the canonical JSON bytes of the scenario — the byte-stable
 *  identity of WHAT was executed. */
export async function computeScenarioHash(scenario: OracleScenario): Promise<`0x${string}`> {
  const { keccak256, encodeAbiParameters } = await import('viem');
  return keccak256(
    encodeAbiParameters([{ name: 'scenario', type: 'string' }], [canonicalJson(scenario)])
  );
}

/** Build the signed message from a run result + the scenario that produced it. */
export async function buildTestMessage(
  result: ScenarioRunResult,
  scenario: OracleScenario
): Promise<AttestationDataTest> {
  // ranAt stays the deterministic scenario end anchor (reproducible by anyone
  // re-running the scenario); the validity window is anchored to SIGNING time,
  // because fixtures and policies evolve even though runs replay identically.
  const ranAt = Math.floor(new Date(result.ranAt).getTime() / 1000);
  const signedAtSeconds = nowInSeconds();
  return {
    scenarioId: result.scenarioId,
    scenarioKind: result.kind,
    verdict: result.verdict,
    harnessVersion: result.harnessVersion,
    stepCount: result.stepCount,
    caughtStepCount: result.caughtStepCount,
    falsePositiveCount: result.falsePositiveCount,
    detectionRate: Math.round(result.detectionRate * 1e4),
    scenarioHash: await computeScenarioHash(scenario),
    reasonCodesHash: computeReasonCodesHash(result.reasonCodes),
    ranAt,
    validUntil: signedAtSeconds + TEST_VALID_FOR_SECONDS,
    schemaVersion: 1,
  };
}

export interface TestTypedDataArgs {
  domain: typeof TEST_DOMAIN;
  types: Record<string, ReadonlyArray<{ readonly name: string; readonly type: string }>>;
  primaryType: typeof TEST_PRIMARY_TYPE;
  message: Record<string, unknown>;
}

/** EIP-712 typed-data args — shared by sign and verify. Returned with a
 *  concrete message shape so viem's typed hashing infers parameter types. */
export function testTypedDataArgs(message: AttestationDataTest) {
  return {
    domain: TEST_DOMAIN,
    types: TEST_TYPES,
    primaryType: TEST_PRIMARY_TYPE,
    message: {
      scenarioId: message.scenarioId,
      scenarioKind: message.scenarioKind,
      verdict: message.verdict,
      harnessVersion: message.harnessVersion,
      stepCount: BigInt(message.stepCount),
      caughtStepCount: BigInt(message.caughtStepCount),
      falsePositiveCount: BigInt(message.falsePositiveCount),
      detectionRate: BigInt(message.detectionRate),
      scenarioHash: message.scenarioHash as `0x${string}`,
      reasonCodesHash: message.reasonCodesHash as `0x${string}`,
      ranAt: BigInt(message.ranAt),
      validUntil: BigInt(message.validUntil),
      schemaVersion: BigInt(message.schemaVersion),
    },
  } as const;
}

export interface OracleTestAttestation {
  uid: string;
  schemaVersion: 1;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  signature: string;
  verifyUrl: string;
  data: AttestationDataTest;
  /** Informational only — verification always re-derives types from the
   *  frozen schema constants, never from this block. */
  eip712: {
    domain: typeof TEST_DOMAIN;
    types: typeof TEST_TYPES;
    primaryType: typeof TEST_PRIMARY_TYPE;
  };
}

function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/testing/attestations/verify`;
}

const ATTESTER_LABEL = 'Insight Oracle Test attester';

/**
 * Sign a scenario run. Returns null when no attester key is configured — the
 * run result itself remains valid and unchanged; the attestation is additive.
 */
export async function signTestAttestation(
  result: ScenarioRunResult,
  scenario: OracleScenario,
  account?: AttesterAccount | null
): Promise<OracleTestAttestation | null> {
  const signer = account ?? (await getAttesterAccount());
  if (!signer) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = await buildTestMessage(result, scenario);
    const args = testTypedDataArgs(message);

    const signature = await signer.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: 1,
      attester: signer.address,
      attesterLabel: ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: TEST_VALID_FOR_SECONDS,
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: TEST_DOMAIN,
        types: TEST_TYPES,
        primaryType: TEST_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign oracle test attestation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface TestVerificationResult {
  valid: boolean;
  attester: string;
  uid: string;
  expired: boolean;
  reason: string;
}

/** Verify a test attestation: recompute the UID, recover the signer, check
 *  the window. Anyone can call this against a receipt they were handed. */
export async function verifyTestAttestation(
  attestation: OracleTestAttestation
): Promise<TestVerificationResult> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = attestation.data;
    const args = testTypedDataArgs(message);

    const expectedUid = hashTypedData(args);
    if (expectedUid !== attestation.uid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        expired: false,
        reason: 'uid_mismatch: data was modified after signing',
      };
    }

    const signatureValid = await verifyTypedData({
      ...args,
      address: attestation.attester as `0x${string}`,
      signature: attestation.signature as `0x${string}`,
    });

    const expired = message.validUntil <= nowInSeconds();

    if (!signatureValid) {
      return {
        valid: false,
        attester: attestation.attester,
        uid: attestation.uid,
        expired,
        reason: 'signature_invalid: not signed by the claimed attester',
      };
    }

    return {
      valid: !expired,
      attester: attestation.attester,
      uid: attestation.uid,
      expired,
      reason: expired ? 'attestation_expired' : 'verified',
    };
  } catch (error) {
    return {
      valid: false,
      attester: attestation.attester ?? '',
      uid: attestation.uid ?? '',
      expired: false,
      reason: `verification_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Harness metadata surfaced by the API for discoverability. */
export const HARNESS_META = {
  harnessVersion: HARNESS_VERSION,
  schemaVersion: TEST_SCHEMA_VERSION,
  domain: TEST_DOMAIN,
  types: TEST_TYPES,
  primaryType: TEST_PRIMARY_TYPE,
} as const;
