/**
 * Shared key-registry configuration for the OracleSafetyCheck attester keys.
 *
 * Extracted so BOTH the public `.well-known/oracle-keys.json` document and the
 * verification endpoint read ONE source of truth for key validity windows.
 *
 * Drives the key-lifecycle / rotation contract added 2026-08-26 in response to
 * the VERITAS collaboration (see key-rotation-procedure.md §5 gaps 1 & 2).
 *
 * Configuration precedence:
 *   - ATTESTATION_KEYS_CONFIG (JSON array)  → explicit multi-key list
 *   - otherwise                              → single active key derived from
 *                                             the loaded attester address
 * (backward compatible: with no env set, behavior is identical to the
 *  pre-rotation single-key deployment.)
 */

export interface KeyEntry {
  key_id: string;
  /** EIP-712 attester address (0x…). The recovered signer address IS the key. */
  public_key: string;
  algorithm: 'EIP-712/secp256k1';
  /** ISO date the key became trustworthy (trust boundary start). */
  validFrom: string;
  /** ISO date the key stops being trustworthy; null = no scheduled expiry
   *  until the first rotation. */
  validUntil: string | null;
  /** Flips true on compromise. */
  revoked: boolean;
  note?: string;
  /** Headless H8 (2026-09-02): what this key is ALLOWED to sign.
   *
   *  - 'attester' (default) — production attestations over real settlements.
   *  - 'sample'             — SYNTHETIC demo receipts only. Anything signed by
   *    a sample key must never be treated as evidence of a real trade, no
   *    matter how well it verifies. Publishing the role IN the registry means
   *    the sample/fact distinction is checkable from the signature's signer
   *    plus this document alone — the synthetic marker is no longer a label
   *    beside the signature (which strips away) but a property of which key
   *    made it (which cannot strip away without breaking the signature). */
  role?: 'attester' | 'sample';
}

export interface RevokedKey {
  key_id: string;
  /** ISO datetime the revocation was detected. */
  revoked_at: string;
  reason: string;
}

export interface KeyRegistryConfig {
  keys: KeyEntry[];
  revoked: RevokedKey[];
}

export const DEFAULT_KEY_ID = 'insight-oracle-safety-v2';
export const DEFAULT_VALID_FROM = '2026-08-05';

/** The dedicated SAMPLE signer's registry identity (H8). Overridable via
 *  ATTESTATION_SAMPLE_KEY_ID; the address comes from the loaded sample
 *  account, never from config, so the registry can only ever list the key that
 *  actually signs. */
export const DEFAULT_SAMPLE_KEY_ID = 'insight-oracle-safety-sample';
export const DEFAULT_SAMPLE_KEY_NOTE =
  'SAMPLE ONLY: receipts signed by this key carry synthetic demo facts (clearly-labelled demo inputs, no real settlement). Verify them to exercise the signature loop; never treat them as evidence of a real trade.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function isoDate(value: unknown, field: string): string {
  const date = nonEmptyString(value, field);
  // Accept date-only configuration and ISO timestamps with an explicit zone.
  // Date.parse alone also accepts locale-dependent strings such as "tomorrow".
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(`${date.slice(0, 10)}T00:00:00.000Z`).toISOString().slice(0, 10) !== date.slice(0, 10)
  ) {
    throw new Error(`${field} must be an ISO date`);
  }
  return date;
}

function normalizeKey(value: unknown): KeyEntry {
  if (!isRecord(value)) throw new Error('attestation key must be an object');
  const raw = value;
  if (typeof raw.public_key !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(raw.public_key)) {
    throw new Error('attestation public_key must be a 20-byte hex address');
  }
  if (raw.role !== undefined && raw.role !== 'attester' && raw.role !== 'sample') {
    throw new Error('attestation key role must be attester or sample');
  }
  if (raw.algorithm !== undefined && raw.algorithm !== 'EIP-712/secp256k1') {
    throw new Error('attestation key algorithm must be EIP-712/secp256k1');
  }
  if (raw.revoked !== undefined && typeof raw.revoked !== 'boolean') {
    throw new Error('attestation key revoked must be a boolean');
  }
  if (raw.note !== undefined && typeof raw.note !== 'string') {
    throw new Error('attestation key note must be a string');
  }
  const validFrom = isoDate(
    raw.validFrom === undefined
      ? (process.env.ATTESTATION_KEY_VALID_FROM ?? DEFAULT_VALID_FROM)
      : raw.validFrom,
    'attestation key validFrom'
  );
  const validUntil =
    raw.validUntil == null ? null : isoDate(raw.validUntil, 'attestation key validUntil');
  if (validUntil && Date.parse(validUntil) <= Date.parse(validFrom)) {
    throw new Error('attestation key validUntil must be after validFrom');
  }
  return {
    key_id: nonEmptyString(
      raw.key_id === undefined ? DEFAULT_KEY_ID : raw.key_id,
      'attestation key key_id'
    ),
    public_key: raw.public_key,
    algorithm: 'EIP-712/secp256k1',
    validFrom,
    validUntil,
    revoked: raw.revoked ?? false,
    note: raw.note as string | undefined,
    role: raw.role as KeyEntry['role'],
  };
}

function normalizeRevokedKey(value: unknown): RevokedKey {
  if (!isRecord(value)) throw new Error('revoked key must be an object');
  return {
    key_id: nonEmptyString(value.key_id, 'revoked key key_id'),
    revoked_at: isoDate(value.revoked_at, 'revoked key revoked_at'),
    reason: nonEmptyString(value.reason, 'revoked key reason'),
  };
}

function assertUniqueKeyIds(keys: KeyEntry[]): void {
  const ids = keys.map((key) => key.key_id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('attestation key registry contains duplicate key_id values');
  }
}

/**
 * Build the registry config. `attester` is the currently-loaded attester
 * address (may be null when attestations are disabled); `sampleAttester` is
 * the dedicated SAMPLE signer's address (H8, may be null when samples are
 * disabled). When an explicit ATTESTATION_KEYS_CONFIG is present and
 * parseable it wins for the ATTESTER keys; the sample key is then APPENDED
 * (derived from the loaded sample account, never from config) unless the
 * config already lists that address. Otherwise we fall back to the single
 * active key so existing deployments are unaffected.
 */
export function buildKeyRegistryConfig(
  attester: string | null,
  sampleAttester?: string | null
): KeyRegistryConfig {
  const keysConfig = process.env.ATTESTATION_KEYS_CONFIG;
  if (attester && sampleAttester && attester.toLowerCase() === sampleAttester.toLowerCase()) {
    throw new Error('production and sample attesters must use different keys');
  }
  const sampleEntry: KeyEntry | null = sampleAttester
    ? normalizeKey({
        key_id: process.env.ATTESTATION_SAMPLE_KEY_ID ?? DEFAULT_SAMPLE_KEY_ID,
        public_key: sampleAttester,
        validFrom: process.env.ATTESTATION_SAMPLE_KEY_VALID_FROM ?? '2026-09-03',
        validUntil: null,
        revoked: false,
        role: 'sample',
        note: DEFAULT_SAMPLE_KEY_NOTE,
      })
    : null;

  let revoked: RevokedKey[] = [];
  const revokedConfig = process.env.ATTESTATION_REVOKED_KEYS_CONFIG;
  if (revokedConfig) {
    try {
      const parsedRevoked = JSON.parse(revokedConfig) as unknown;
      if (!Array.isArray(parsedRevoked)) {
        throw new Error('ATTESTATION_REVOKED_KEYS_CONFIG must be a JSON array');
      }
      revoked = parsedRevoked.map(normalizeRevokedKey);
    } catch (error) {
      throw new Error(
        `Invalid attestation key registry configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (keysConfig) {
    try {
      const parsed: unknown = JSON.parse(keysConfig);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('ATTESTATION_KEYS_CONFIG must be a non-empty JSON array');
      }
      const keys = parsed.map(normalizeKey);
      const addresses = keys.map((key) => key.public_key.toLowerCase());
      if (new Set(addresses).size !== addresses.length) {
        throw new Error('ATTESTATION_KEYS_CONFIG contains duplicate public_key addresses');
      }
      // Append the sample signer unless the explicit config already lists
      // its address (deduped by address, the verification identity).
      if (sampleEntry) {
        const existing = keys.find(
          (key) => key.public_key.toLowerCase() === sampleEntry.public_key.toLowerCase()
        );
        if (existing && existing.role !== 'sample') {
          throw new Error('sample signer cannot be registered as a production attester');
        }
        if (!existing) keys.push(sampleEntry);
      }
      assertUniqueKeyIds(keys);
      return { keys, revoked };
    } catch (error) {
      throw new Error(
        `Invalid attestation key registry configuration: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const keys: KeyEntry[] = attester
    ? [
        normalizeKey({
          key_id: DEFAULT_KEY_ID,
          public_key: attester,
          validFrom: process.env.ATTESTATION_KEY_VALID_FROM ?? DEFAULT_VALID_FROM,
          validUntil: null,
          revoked: false,
        }),
      ]
    : [];
  if (sampleEntry) keys.push(sampleEntry);
  assertUniqueKeyIds(keys);

  return {
    keys,
    revoked,
  };
}

/**
 * Whether an attestation signed by `attester` at `checkedAt` is within the
 * published trust window. Server verification endpoints always enforce this
 * boundary; independent/offline verifiers can report it separately.
 *
 * Returns false if: key unknown, revoked, `checkedAt` before `validFrom`, or
 * `checkedAt` after `validUntil` (when set).
 */
export function isAttestationKeyValid(
  attester: string,
  checkedAt: number | null,
  config: KeyRegistryConfig
): boolean {
  if (typeof attester !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(attester)) return false;
  const addr = attester.toLowerCase();
  const entry = config.keys.find((k) => k.public_key.toLowerCase() === addr);
  if (!entry) return false;
  if (entry.revoked) return false;
  if (config.revoked.some((revocation) => revocation.key_id === entry.key_id)) return false;
  if (checkedAt == null || !Number.isSafeInteger(checkedAt) || checkedAt < 0) return false;

  const checkedAtMs = checkedAt * 1000;
  if (!Number.isSafeInteger(checkedAtMs)) return false;
  const from = Date.parse(entry.validFrom);
  if (!Number.isFinite(from) || checkedAtMs < from) return false;

  if (entry.validUntil) {
    const until = Date.parse(entry.validUntil);
    if (!Number.isFinite(until) || until <= from || checkedAtMs >= until) return false;
  }
  return true;
}

/** Apply Insight issuer trust to a cryptographically valid verification
 * result. Mutates the result so API handlers cannot accidentally return a
 * self-signed receipt as valid merely because its signature is consistent. */
export function enforceAttestationKeyTrust(
  result: {
    valid: boolean;
    attester: string;
    checkedAt: number | null;
    reason?: string;
  },
  config: KeyRegistryConfig,
  timestampLabel: 'checkedAt' | 'evaluatedAt' = 'checkedAt'
): void {
  if (!result.valid || !result.attester) return;
  if (isAttestationKeyValid(result.attester, result.checkedAt, config)) return;
  result.valid = false;
  result.reason = `attester key is unknown, revoked, or its ${timestampLabel} is outside the published validity window`;
}

/** Resolve the registry entry that authorises a production attestation.
 * Cryptographic validity alone is insufficient: anybody can create a key and
 * self-sign an otherwise well-formed EIP-712 document. */
export function trustedAttesterEntry(
  attester: string,
  checkedAt: number | null,
  config: KeyRegistryConfig
): KeyEntry | null {
  if (!isAttestationKeyValid(attester, checkedAt, config)) return null;
  const entry = config.keys.find(
    (candidate) => candidate.public_key.toLowerCase() === attester.toLowerCase()
  );
  // Missing role is the backwards-compatible production-attester default.
  if (!entry || entry.role === 'sample') return null;
  return entry;
}
