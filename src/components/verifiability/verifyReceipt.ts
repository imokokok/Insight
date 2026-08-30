/**
 * Pure helpers for the "Verify a receipt" widget.
 *
 * Kept free of React so the parsing/mapping logic is unit-testable and the
 * widget stays a thin presentation layer over the existing public verify
 * endpoint (POST /api/v1/safety/attestation/verify).
 */

export interface ReceiptVerification {
  schemaVersion: number;
  valid: boolean;
  expired: boolean;
  attester: string | null;
  uid: string | null;
  checkedAt: number | null;
  validUntil: number | null;
  ageSeconds: number | null;
  reason?: string;
}

export interface VerifyEnvelope {
  success: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
}

export type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };

export type VerifyResult = { ok: true; result: ReceiptVerification } | { ok: false; error: string };

export function parseReceiptInput(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a receipt first.' };
  }
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Not valid JSON. Paste the raw receipt object.' };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Expected a JSON object, got something else.' };
  }
  return { ok: true, value };
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function toReceiptVerification(envelope: VerifyEnvelope): VerifyResult {
  if (envelope.success !== true) {
    return {
      ok: false,
      error: envelope.error?.message ?? 'Verification failed.',
    };
  }
  const d = (envelope.data ?? {}) as Record<string, unknown>;
  const schemaVersion = asNumber(d.schemaVersion) ?? 0;
  if (schemaVersion === 0) {
    return { ok: false, error: 'Verification response has no schemaVersion.' };
  }
  return {
    ok: true,
    result: {
      schemaVersion,
      valid: d.valid === true,
      expired: d.expired === true,
      attester: asString(d.attester),
      uid: asString(d.uid),
      checkedAt: asNumber(d.checkedAt),
      validUntil: asNumber(d.validUntil),
      ageSeconds: asNumber(d.ageSeconds),
      reason: asString(d.reason) ?? undefined,
    },
  };
}

/**
 * Honest gate note per schema version. The v3 struct carries both policy
 * constants inside the signed bytes, so both gates are recomputable by a
 * third party. At v1/v2 the independence threshold is outside the struct and
 * is asserted rather than verifiable from the bytes alone.
 */
export function gateNote(schemaVersion: number): string {
  if (schemaVersion === 3) {
    return 'Both gates are recomputable from the bytes alone (participantCount and sourceGroupCount against the required values inside the signed struct).';
  }
  return 'At this schema version the independence threshold is not inside the signed struct, so that gate is asserted rather than verifiable from the bytes alone.';
}

export function shortAddress(address: string | null): string | null {
  if (!address) return null;
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
