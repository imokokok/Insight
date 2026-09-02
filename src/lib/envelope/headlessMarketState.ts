/**
 * Headless Oracle market-state receipt: fetch + independent Ed25519 verification.
 *
 * This is the market-state half of the pre-trade safety envelope prototype
 * (environment.market_state + environment.price_integrity, per the
 * draft-borthwick-msebenzi-environment-state family). Verification is done
 * LOCALLY against the key published in Headless Oracle's well-known key
 * registry — we never route verification through their /v5/verify endpoint.
 * That is the "verification-not-endorsement" boundary stated in the
 * collaboration agreement: the gate checks signature-to-key, schema and
 * freshness itself, and the attested values remain the issuer's claims.
 *
 * Signature canonicalization (verified empirically against the live v5.0 demo
 * endpoint on 2026-08-21, two independent receipts): the signed payload is the
 * receipt object minus its `signature` field, serialized as JSON with object
 * keys sorted lexicographically (JCS-style, RFC 8785 without number
 * reserialization — all observed fields are strings).
 */

import { createPublicKey, verify as ed25519Verify } from 'node:crypto';

export const HEADLESS_ORACLE_DEFAULT_BASE_URL = 'https://headlessoracle.com';

/** Overridable for tests / staging mirrors. */
export function getHeadlessOracleBaseUrl(): string {
  return process.env.HEADLESS_ORACLE_BASE_URL || HEADLESS_ORACLE_DEFAULT_BASE_URL;
}

const FETCH_TIMEOUT_MS = 10_000;

/** Signed fields of a v5.0 market-state receipt (snake_case, as issued). */
export interface HeadlessMarketStateReceipt {
  receipt_id: string;
  issued_at: string;
  expires_at: string;
  issuer: string;
  mic: string;
  status: string;
  source: string;
  halt_detection: string;
  receipt_mode: string;
  schema_version: string;
  public_key_id: string;
  signature: string;
}

/** Entry in /.well-known/oracle-keys.json. */
export interface HeadlessOracleKeyEntry {
  key_id: string;
  algorithm: string;
  format: string;
  public_key: string;
  status: string;
  created_at?: string;
  valid_from?: string;
  valid_until?: string | null;
}

export interface HeadlessKeyRegistry {
  keys: HeadlessOracleKeyEntry[];
  issuer?: string;
}

/** The v5.0 demo endpoint returns receipt fields at the top level AND a nested
 * `receipt` copy (both carry the same signature), plus a discovery pointer. */
export type HeadlessDemoResponse = HeadlessMarketStateReceipt & {
  receipt?: HeadlessMarketStateReceipt;
  discovery_url?: string;
};

export interface MarketStateVerificationResult {
  /** Signature verified against the published key AND within validity window. */
  valid: boolean;
  signatureValid: boolean;
  expired: boolean;
  issuer: string;
  receiptId: string | null;
  mic: string | null;
  status: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  keyId: string | null;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Canonicalization + Ed25519 primitives
// ---------------------------------------------------------------------------

/** JSON with recursively sorted object keys. Equivalent to RFC 8785 (JCS)
 * ordering for the ASCII keys the v5.0 schema uses. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(',')}}`;
}

/** The bytes covered by the signature: the receipt minus `signature`,
 * canonicalized. Exported for tests — this rule is the integration contract. */
export function headlessSignedPayload(receipt: HeadlessMarketStateReceipt): string {
  const { signature: _signature, ...payload } = receipt;
  return canonicalJson(payload);
}

/** Wrap a raw 32-byte Ed25519 public key in an SPKI DER header so node:crypto
 * can consume it. Ed25519 SPKI is a fixed 12-byte prefix + the raw key. */
function ed25519PublicKeyFromHex(hex: string): ReturnType<typeof createPublicKey> {
  const raw = Buffer.from(hex, 'hex');
  if (raw.length !== 32) {
    throw new Error(`Ed25519 public key must be 32 bytes, got ${raw.length}`);
  }
  const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]);
  return createPublicKey({ key: spki, format: 'der', type: 'spki' });
}

/** Verify the signature and freshness of a market-state receipt against a
 * published Ed25519 public key (hex). Pure: no network, no clock injection —
 * freshness uses Date.now(). */
export function verifyHeadlessMarketStateReceipt(
  receipt: HeadlessMarketStateReceipt,
  publicKeyHex: string
): { signatureValid: boolean; expired: boolean } {
  let signatureValid = false;
  try {
    signatureValid = ed25519Verify(
      null,
      Buffer.from(headlessSignedPayload(receipt), 'utf8'),
      ed25519PublicKeyFromHex(publicKeyHex),
      Buffer.from(receipt.signature, 'hex')
    );
  } catch {
    // Malformed signature hex / key material fails closed, not loudly: the
    // caller (the envelope gate) turns this into a BLOCK member diagnosis.
    signatureValid = false;
  }

  const expiresAtMs = Date.parse(receipt.expires_at);
  const expired = Number.isNaN(expiresAtMs) ? true : Date.now() > expiresAtMs;
  return { signatureValid, expired };
}

// ---------------------------------------------------------------------------
// Network fetchers
// ---------------------------------------------------------------------------

/** The demo/sandbox receipt endpoint Michael pointed the prototype at
 * (https://headlessoracle.com/v5/demo?mic=XCOI serves it today). */
export async function fetchHeadlessDemoReceipt(mic: string): Promise<HeadlessDemoResponse> {
  const url = `${getHeadlessOracleBaseUrl()}/v5/demo?mic=${encodeURIComponent(mic)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`headless demo endpoint returned HTTP ${res.status}`);
  }
  return (await res.json()) as HeadlessDemoResponse;
}

/** SMA-convention key registry (same shape as Insight's oracle-keys.json). */
export async function fetchHeadlessKeyRegistry(): Promise<HeadlessKeyRegistry> {
  const url = `${getHeadlessOracleBaseUrl()}/.well-known/oracle-keys.json`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`headless key registry returned HTTP ${res.status}`);
  }
  return (await res.json()) as HeadlessKeyRegistry;
}

/** Pick the signing key for a receipt: matched by key_id, must be an active
 * Ed25519 hex key. A missing/inactive/rotated-away key yields null — the gate
 * treats that exactly like an unverifiable signature (fail-closed). */
export function selectHeadlessSigningKey(
  registry: HeadlessKeyRegistry,
  keyId: string
): HeadlessOracleKeyEntry | null {
  const key = registry.keys?.find((k) => k.key_id === keyId);
  if (!key) return null;
  if (key.algorithm !== 'Ed25519' || key.format !== 'hex') return null;
  if (key.status !== 'active') return null;
  return key;
}

// ---------------------------------------------------------------------------
// Combined fetch + verify
// ---------------------------------------------------------------------------

/** Extract the canonical receipt object from a demo response (nested copy if
 * present, else the flattened top level). */
export function extractHeadlessReceipt(envelope: HeadlessDemoResponse): HeadlessMarketStateReceipt {
  return envelope.receipt ?? envelope;
}

/** The v5.0 response carries every signed field twice — flattened at the top
 * level AND inside the nested `receipt` object — and only the nested copy is
 * covered by the signature (Michael's kit finding, 2026-09-02, CC-14a/b).
 * This gate reads from the nested receipt and never from the top level, so a
 * top-level-only tamper cannot influence a decision; but we still fail closed
 * on an inconsistent body rather than silently ignoring it, so a consumer of
 * our response can never be shown an unsigned convenience copy that differs
 * from the signed object. Returns null when consistent (or when the response
 * is the flattened shape with no duplicate copies). */
export function headlessTwoCopyMismatch(envelope: HeadlessDemoResponse): string | null {
  const receipt = envelope.receipt;
  if (!receipt) return null;
  const top = envelope as unknown as Record<string, unknown>;
  const signed = receipt as unknown as Record<string, unknown>;
  for (const key of Object.keys(receipt)) {
    if (!(key in top)) continue;
    if (top[key] !== signed[key]) {
      return `two_copy_mismatch: field '${key}' top-level=${JSON.stringify(top[key])} receipt=${JSON.stringify(signed[key])}; the top-level copy is not covered by the signature`;
    }
  }
  return null;
}

/** Structured "unfetchable" result. Any fetch/parse failure becomes this, so
 * the envelope gate fails closed with a diagnosis instead of a 500. Exported
 * for callers that compose the primitives themselves (e.g. the prototype's
 * tampered-market demo, which fetches raw and mutates before verifying). */
export function headlessFetchFailedResult(error: unknown): MarketStateVerificationResult {
  return {
    valid: false,
    signatureValid: false,
    expired: false,
    issuer: 'headlessoracle.com',
    receiptId: null,
    mic: null,
    status: null,
    issuedAt: null,
    expiresAt: null,
    keyId: null,
    reason: `fetch_failed: ${error instanceof Error ? error.message : String(error)}`,
  };
}

export interface HeadlessFetchAndVerify {
  envelope: HeadlessDemoResponse | null;
  result: MarketStateVerificationResult;
}

/** Fetch a live demo receipt + the key registry, then verify the receipt
 * locally. Never throws: any failure becomes a structured invalid result so
 * the envelope gate can fail closed with a diagnosis instead of a 500. */
export async function fetchAndVerifyHeadlessMarketState(
  mic: string
): Promise<HeadlessFetchAndVerify> {
  try {
    const [envelope, registry] = await Promise.all([
      fetchHeadlessDemoReceipt(mic),
      fetchHeadlessKeyRegistry(),
    ]);
    const receipt = extractHeadlessReceipt(envelope);
    // Fail closed if the two copies disagree (top-level-only tamper): the
    // convenience copy is unsigned, so an inconsistent body is untrustworthy
    // even though every read below goes through the signed receipt object.
    const twoCopyMismatch = headlessTwoCopyMismatch(envelope);
    if (twoCopyMismatch) {
      return {
        envelope,
        result: {
          valid: false,
          signatureValid: false,
          expired: false,
          issuer: receipt.issuer,
          receiptId: receipt.receipt_id,
          mic: receipt.mic,
          status: receipt.status,
          issuedAt: receipt.issued_at,
          expiresAt: receipt.expires_at,
          keyId: receipt.public_key_id,
          reason: twoCopyMismatch,
        },
      };
    }
    const result = verifyHeadlessMarketStateAgainstRegistry(receipt, registry);
    return { envelope, result };
  } catch (error) {
    return { envelope: null, result: headlessFetchFailedResult(error) };
  }
}

/** Verify a receipt against a key registry (signature + freshness + key
 * selection). Pure apart from Date.now(). */
export function verifyHeadlessMarketStateAgainstRegistry(
  receipt: HeadlessMarketStateReceipt,
  registry: HeadlessKeyRegistry
): MarketStateVerificationResult {
  const base = {
    issuer: receipt.issuer,
    receiptId: receipt.receipt_id,
    mic: receipt.mic,
    status: receipt.status,
    issuedAt: receipt.issued_at,
    expiresAt: receipt.expires_at,
    keyId: receipt.public_key_id,
  };

  const key = selectHeadlessSigningKey(registry, receipt.public_key_id);
  if (!key) {
    return {
      ...base,
      valid: false,
      signatureValid: false,
      expired: false,
      reason: `signing_key_unavailable: no active Ed25519 key for key_id ${receipt.public_key_id}`,
    };
  }

  const { signatureValid, expired } = verifyHeadlessMarketStateReceipt(receipt, key.public_key);
  const reason = !signatureValid ? 'signature_invalid' : expired ? 'expired' : undefined;
  return {
    ...base,
    valid: signatureValid && !expired,
    signatureValid,
    expired,
    reason,
  };
}
