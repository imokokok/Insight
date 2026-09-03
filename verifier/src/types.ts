/**
 * Public types for verify-insight-receipt.
 *
 * These mirror the Insight production envelope shape. The verifier never
 * trusts a client-supplied type layout: EIP-712 types are taken from the
 * constants in ./schemas, not from the document being verified.
 */

/**
 * The loose envelope accepted by the router. v1 carries 11 signed fields,
 * v2 26, v3 27, and the recheck variants 28 / 29. A malformed document
 * returns `valid: false` rather than throwing.
 */
export interface RoutableAttestation {
  uid: string;
  schemaVersion: number;
  attester: string;
  data: Record<string, unknown>;
  signature?: string;
  eip712?: { primaryType?: string };
  /** Envelope discriminator: rechecks carry 'OracleSafetyRecheck'. */
  type?: string;
  /** v1 only: the freshness budget, in seconds. */
  validForSeconds?: number;
  [key: string]: unknown;
}

/** Outcome of the attester-key validity-window check. */
export type KeyStatus =
  /** No key registry was supplied, so no window check was performed. */
  | 'not_checked'
  /** The signer is a known key and the attestation falls inside its window. */
  | 'valid'
  /** The signer is not present in the supplied registry. */
  | 'unknown_key'
  /** The signer's key has been revoked. */
  | 'revoked'
  /** The attestation's checkedAt falls outside the key's validFrom/validUntil. */
  | 'outside_window';

/**
 * Terminal outcome of the verification. Stable enum — branch on this, not on
 * the human-readable `reason` string.
 *
 * 'expired' is set whenever the receipt is past its deadline, regardless of
 * schema version. See the v1 note on {@link VerifyResult.valid}.
 */
export type VerifyCode =
  /** Signature recovered, UID matched, binding invariants held, not expired. */
  | 'ok'
  /** The recomputed EIP-712 hash does not equal the `uid` the receipt claims. */
  | 'uid_mismatch'
  /** The signature does not recover to `attester`. */
  | 'signature_invalid'
  /** No signature was supplied. */
  | 'signature_missing'
  /** Past the receipt's own validity deadline. */
  | 'expired'
  /** A recheck's `requestHash` does not equal its `originalRequestHash`. */
  | 'recheck_binding_mismatch'
  /** `schemaVersion` is not one this library knows how to hash. */
  | 'unsupported_schema'
  /** Structurally malformed — a required field is missing or of the wrong type. */
  | 'malformed';

export interface VerifyResult {
  /**
   * True when the signature recovers to `attester`, the recomputed EIP-712
   * hash equals `uid`, and every binding invariant holds.
   *
   * A key-window failure does NOT flip this — it is reported separately in
   * `keyStatus`, because a receipt can be cryptographically sound while the
   * key that signed it is no longer trustworthy.
   *
   * v1 QUIRK (mirrored from the production endpoint, NOT fixed here):
   * an EXPIRED v1 receipt returns `valid: true` with `expired: true` and
   * `code: 'expired'`. v2/v3 return `valid: false`. This asymmetry exists in
   * Insight's verifier today; this library reproduces it rather than silently
   * disagreeing with the API. Branch on `code` / `expired`, never on `valid`
   * on its own.
   */
  valid: boolean;
  /** Terminal outcome. Branch on this. */
  code: VerifyCode;
  /** 'recheck' for a freshness re-verification of an earlier receipt,
   *  otherwise 'check'. */
  kind: 'check' | 'recheck';
  attester: string;
  uid: string | null;
  schemaVersion: number;
  checkedAt: number | null;
  validUntil: number | null;
  /** v1 only: age since checkedAt. null for v2/v3. */
  ageSeconds: number | null;
  expired: boolean;
  keyStatus: KeyStatus;
  /** Human-readable failure reason, absent on success. */
  reason?: string;
}

/** One entry of the published attester-key registry. */
export interface KeyEntry {
  key_id: string;
  /** EIP-712 attester address (0x…). The recovered signer address IS the key. */
  public_key: string;
  /** Present in older registry documents; omitted by the live document. */
  algorithm?: 'EIP-712/secp256k1';
  /** ISO date the key became trustworthy. */
  validFrom: string;
  /** ISO date the key stops being trustworthy. null = no scheduled expiry. */
  validUntil: string | null;
  revoked: boolean;
  note?: string;
  /** What this key is allowed to sign. 'sample' keys sign synthetic demo
   *  receipts only — see the note on KeyRegistry verification. */
  role?: 'attester' | 'sample';
}

export interface RevokedKey {
  key_id: string;
  revoked_at: string;
  reason: string;
}

/**
 * Shape of the document published at /.well-known/oracle-keys.json.
 *
 * The live document uses `public_keys` / `revoked_keys`; older consumers and
 * some test fixtures use `keys` / `revoked`. Both are accepted so a verifier
 * built against either shape resolves the signer's trust window.
 */
export interface KeyRegistry {
  keys?: KeyEntry[];
  public_keys?: KeyEntry[];
  revoked?: RevokedKey[];
  revoked_keys?: RevokedKey[];
}
