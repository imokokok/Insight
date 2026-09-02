/**
 * Local, dependency-light verification of Insight oracle-safety receipts.
 *
 * This module is the whole point of the package: given a receipt JSON, decide
 * whether it is genuine WITHOUT calling Insight. No network, no API key, no
 * telemetry, no environment reads. If you can run this file you can verify a
 * receipt, today or in ten years, whether or not Insight still exists.
 *
 * What "genuine" means, in order:
 *   1. the EIP-712 hash recomputed from the SCHEMA CONSTANTS matches the `uid`
 *      the receipt claims (catches a tampered payload);
 *   2. the signature recovers to `attester` (catches a forged receipt);
 *   3. recheck-only: `requestHash === originalRequestHash` (catches a genuine
 *      signature over a recheck that does not actually reference its original);
 *   4. the receipt is not past its deadline.
 *
 * Order matters and differs between v1 and v2/v3 — see the per-version notes.
 * Those orderings are reproduced from Insight's production verifier, not
 * improved on: an independent verifier that "fixes" production's semantics
 * stops being a check on production.
 */

import { hashTypedData, verifyTypedData } from 'viem';

import { resolveKeyStatus } from './keyRegistry';
import {
  RECHECK_DOMAIN,
  RECHECK_PRIMARY_TYPE,
  RECHECK_TYPE,
  RECHECK_TYPES,
  RECHECK_V3_DOMAIN,
  RECHECK_V3_PRIMARY_TYPE,
  RECHECK_V3_TYPES,
  V1_DOMAIN,
  V1_PRIMARY_TYPE,
  V1_TYPES,
  V2_DOMAIN,
  V2_PRIMARY_TYPE,
  V2_TYPES,
  V3_DOMAIN,
  V3_PRIMARY_TYPE,
  V3_TYPES,
  toRecheckMessage,
  toRecheckV3Message,
  toV1Message,
  toV2Message,
  toV3Message,
} from './schemas';

import type { KeyRegistry, RoutableAttestation, VerifyCode, VerifyResult } from './types';

const V1_SCHEMA_VERSION = 1;
const V2_SCHEMA_VERSION = 2;
const V3_SCHEMA_VERSION = 3;

export interface VerifyOptions {
  /**
   * The published attester-key registry (`.well-known/oracle-keys.json`).
   * When supplied, the signer's trust window is evaluated and reported in
   * `result.keyStatus`. Omit it and `keyStatus` is `not_checked` — this
   * library never fetches anything on its own.
   */
  keyRegistry?: KeyRegistry;
}

interface CoreResult {
  valid: boolean;
  code: VerifyCode;
  kind: 'check' | 'recheck';
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  ageSeconds: number | null;
  expired: boolean;
  schemaVersion: number;
  reason?: string;
}

function fail(
  schemaVersion: number,
  code: VerifyCode,
  reason: string,
  partial: Partial<CoreResult> = {}
): CoreResult {
  return {
    valid: false,
    code,
    kind: 'check',
    uid: null,
    checkedAt: null,
    validUntil: null,
    ageSeconds: null,
    expired: false,
    schemaVersion,
    reason,
    ...partial,
  };
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// v1 — 11 fields
// ---------------------------------------------------------------------------

/**
 * v1 checks the SIGNATURE FIRST, then the UID. That is the opposite of v2/v3
 * and it is reproduced verbatim: v1 is the schema Raul verified end-to-end and
 * flipping the order here would make this library disagree with the API on
 * inputs where both checks fail.
 */
async function verifyV1(attestation: RoutableAttestation): Promise<CoreResult> {
  const data = attestation.data ?? {};
  const args = {
    domain: V1_DOMAIN,
    types: V1_TYPES,
    primaryType: V1_PRIMARY_TYPE,
    message: toV1Message(data),
  } as const;

  const signatureOk = await verifyTypedData({
    ...args,
    address: attestation.attester as `0x${string}`,
    signature: attestation.signature as `0x${string}`,
  });

  if (!signatureOk) {
    return fail(V1_SCHEMA_VERSION, 'signature_invalid', 'signature_invalid', {
      uid: attestation.uid ?? null,
      checkedAt: typeof data.checkedAt === 'number' ? data.checkedAt : null,
    });
  }

  const recomputedUid = hashTypedData(args);
  if (attestation.uid && recomputedUid !== attestation.uid) {
    return fail(
      V1_SCHEMA_VERSION,
      'uid_mismatch',
      'uid_mismatch: data was modified after signing',
      {
        uid: attestation.uid,
        checkedAt: typeof data.checkedAt === 'number' ? data.checkedAt : null,
      }
    );
  }

  const checkedAt = typeof data.checkedAt === 'number' ? data.checkedAt : null;
  const ageSeconds = checkedAt ? nowSeconds() - checkedAt : null;
  const validForSeconds = Number(attestation.validForSeconds ?? 0);
  const expired = ageSeconds !== null && ageSeconds > validForSeconds;

  return {
    valid: true,
    // Mirrors production: an expired v1 receipt is still `valid: true`.
    // Consumers must branch on `code` / `expired`, not `valid`.
    code: expired ? 'expired' : 'ok',
    kind: 'check',
    uid: recomputedUid,
    checkedAt,
    validUntil: checkedAt !== null ? checkedAt + validForSeconds : null,
    ageSeconds,
    expired,
    schemaVersion: V1_SCHEMA_VERSION,
    reason: expired
      ? `Attestation is stale (age ${ageSeconds}s > validFor ${validForSeconds}s).`
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// v2 / v3 — 26 / 27 fields
// ---------------------------------------------------------------------------

/**
 * v2 and v3 check the UID FIRST, then the signature. A tampered payload is
 * therefore rejected before any signature recovery is attempted.
 */
async function verifyV2(attestation: RoutableAttestation): Promise<CoreResult> {
  const data = attestation.data ?? {};
  const args = {
    domain: V2_DOMAIN,
    types: V2_TYPES,
    primaryType: V2_PRIMARY_TYPE,
    message: toV2Message(data),
  } as const;
  return verifyWindowed(attestation, args, V2_SCHEMA_VERSION, data, 'check');
}

async function verifyV3(attestation: RoutableAttestation): Promise<CoreResult> {
  const data = attestation.data ?? {};
  const args = {
    domain: V3_DOMAIN,
    types: V3_TYPES,
    primaryType: V3_PRIMARY_TYPE,
    message: toV3Message(data),
  } as const;
  return verifyWindowed(attestation, args, V3_SCHEMA_VERSION, data, 'check');
}

async function verifyWindowed(
  attestation: RoutableAttestation,
  args: {
    domain: unknown;
    types: unknown;
    primaryType: string;
    message: object;
  },
  schemaVersion: number,
  data: Record<string, unknown>,
  kind: 'check' | 'recheck'
): Promise<CoreResult> {
  const typedArgs = args as Parameters<typeof hashTypedData>[0];
  const expectedUid = hashTypedData(typedArgs);

  if (expectedUid !== attestation.uid) {
    return fail(schemaVersion, 'uid_mismatch', 'uid_mismatch: data was modified after signing', {
      uid: attestation.uid ?? null,
      checkedAt: typeof data.checkedAt === 'number' ? data.checkedAt : null,
      validUntil: typeof data.validUntil === 'number' ? data.validUntil : null,
    });
  }

  const signatureOk = await verifyTypedData({
    ...typedArgs,
    address: attestation.attester as `0x${string}`,
    signature: attestation.signature as `0x${string}`,
  });

  if (!signatureOk) {
    return fail(schemaVersion, 'signature_invalid', 'signature_invalid', {
      uid: attestation.uid ?? null,
      checkedAt: typeof data.checkedAt === 'number' ? data.checkedAt : null,
      validUntil: typeof data.validUntil === 'number' ? data.validUntil : null,
    });
  }

  const checkedAt = typeof data.checkedAt === 'number' ? data.checkedAt : null;
  const validUntil = typeof data.validUntil === 'number' ? data.validUntil : null;
  const expired = validUntil !== null && nowSeconds() > validUntil;

  return {
    valid: !expired,
    code: expired ? 'expired' : 'ok',
    kind,
    uid: attestation.uid ?? null,
    checkedAt,
    validUntil,
    ageSeconds: null,
    expired,
    schemaVersion,
    reason: expired ? 'expired' : undefined,
  };
}

// ---------------------------------------------------------------------------
// Rechecks — 28 (v2) / 29 (v3) fields
// ---------------------------------------------------------------------------

/** Same-trade binding invariant: a recheck's own `requestHash` (one of the base
 *  fields) MUST equal the `originalRequestHash` it claims to bind. The
 *  signature proves the recheck is genuine, NOT that it honours continuity —
 *  a recheck signed with a mismatched reference still recovers cleanly. */
function checkRecheckBinding(
  data: Record<string, unknown>,
  schemaVersion: number,
  uid: string | null,
  checkedAt: number | null,
  validUntil: number | null,
  kind: 'check' | 'recheck'
): CoreResult | null {
  if (data.requestHash !== data.originalRequestHash) {
    return fail(
      schemaVersion,
      'recheck_binding_mismatch',
      'recheck_binding_mismatch: requestHash must equal originalRequestHash',
      { uid, checkedAt, validUntil, kind }
    );
  }
  return null;
}

async function verifyRecheck(attestation: RoutableAttestation): Promise<CoreResult> {
  const data = attestation.data ?? {};
  const args = {
    domain: RECHECK_DOMAIN,
    types: RECHECK_TYPES,
    primaryType: RECHECK_PRIMARY_TYPE,
    message: toRecheckMessage(data),
  } as const;

  const checkedAt = typeof data.checkedAt === 'number' ? data.checkedAt : null;
  const validUntil = typeof data.validUntil === 'number' ? data.validUntil : null;

  const base = await verifyWindowed(attestation, args, V2_SCHEMA_VERSION, data, 'recheck');
  if (base.code !== 'ok') return base;

  const bindingFailure = checkRecheckBinding(
    data,
    V2_SCHEMA_VERSION,
    base.uid,
    checkedAt,
    validUntil,
    'recheck'
  );
  if (bindingFailure) return bindingFailure;

  return base;
}

async function verifyRecheckV3(attestation: RoutableAttestation): Promise<CoreResult> {
  const data = attestation.data ?? {};
  const args = {
    domain: RECHECK_V3_DOMAIN,
    types: RECHECK_V3_TYPES,
    primaryType: RECHECK_V3_PRIMARY_TYPE,
    message: toRecheckV3Message(data),
  } as const;

  const checkedAt = typeof data.checkedAt === 'number' ? data.checkedAt : null;
  const validUntil = typeof data.validUntil === 'number' ? data.validUntil : null;

  const base = await verifyWindowed(attestation, args, V3_SCHEMA_VERSION, data, 'recheck');
  if (base.code !== 'ok') return base;

  const bindingFailure = checkRecheckBinding(
    data,
    V3_SCHEMA_VERSION,
    base.uid,
    checkedAt,
    validUntil,
    'recheck'
  );
  if (bindingFailure) return bindingFailure;

  return base;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify an Insight oracle-safety receipt entirely locally.
 *
 * Pure with respect to the outside world: no network, no filesystem, no env,
 * no telemetry, no clock beyond `Date.now()`. The same input always yields the
 * same answer, on any machine, with or without Insight.
 *
 * Never throws on a bad document — a malformed receipt is a verification
 * failure, not an exception.
 *
 * @example
 * ```ts
 * const result = await verifyReceipt(receipt, { keyRegistry });
 * if (result.code !== 'ok') throw new Error(`bad receipt: ${result.code}`);
 * if (result.keyStatus === 'revoked') throw new Error('signer key is revoked');
 * ```
 */
export async function verifyReceipt(
  attestation: RoutableAttestation,
  opts: VerifyOptions = {}
): Promise<VerifyResult> {
  const attester = typeof attestation?.attester === 'string' ? attestation.attester : '';
  const schemaVersion = attestation?.schemaVersion;

  try {
    if (typeof attestation !== 'object' || attestation === null) {
      return finalize(fail(0, 'malformed', 'malformed: receipt is not an object'), attester, opts);
    }

    if (typeof attestation.signature !== 'string' || attestation.signature.length === 0) {
      return finalize(
        fail(
          typeof schemaVersion === 'number' ? schemaVersion : 0,
          'signature_missing',
          'signature_missing: no signature on the receipt'
        ),
        attester,
        opts
      );
    }

    // A recheck carries schemaVersion 2 (or 3) but a distinct primaryType, so
    // it MUST be routed before the plain check branch — otherwise it would be
    // hashed against the 26-field layout, silently ignoring the two reference
    // fields, and every recheck would fail UID recovery.
    const primaryType = attestation.eip712?.primaryType;
    const isRecheck = attestation.type === RECHECK_TYPE || primaryType === RECHECK_TYPE;

    let core: CoreResult;
    if (schemaVersion === V3_SCHEMA_VERSION && isRecheck) {
      core = await verifyRecheckV3(attestation);
    } else if (schemaVersion === V2_SCHEMA_VERSION && isRecheck) {
      core = await verifyRecheck(attestation);
    } else if (schemaVersion === V3_SCHEMA_VERSION) {
      core = await verifyV3(attestation);
    } else if (schemaVersion === V2_SCHEMA_VERSION) {
      core = await verifyV2(attestation);
    } else if (schemaVersion === V1_SCHEMA_VERSION) {
      core = await verifyV1(attestation);
    } else {
      core = fail(
        typeof schemaVersion === 'number' ? schemaVersion : 0,
        'unsupported_schema',
        `Unsupported schemaVersion ${String(schemaVersion)}; supported: 1 (v1), 2 (v2), 3 (v3).`
      );
    }

    return finalize(core, attester, opts);
  } catch (error) {
    return finalize(
      fail(
        typeof schemaVersion === 'number' ? schemaVersion : 0,
        'malformed',
        `malformed: ${error instanceof Error ? error.message : String(error)}`
      ),
      attester,
      opts
    );
  }
}

function finalize(core: CoreResult, attester: string, opts: VerifyOptions): VerifyResult {
  return {
    valid: core.valid,
    code: core.code,
    kind: core.kind,
    attester,
    uid: core.uid,
    schemaVersion: core.schemaVersion,
    checkedAt: core.checkedAt,
    validUntil: core.validUntil,
    ageSeconds: core.ageSeconds,
    expired: core.expired,
    keyStatus: resolveKeyStatus(attester, core.checkedAt, opts.keyRegistry),
    reason: core.reason,
  };
}
