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

function normalizeKey(raw: Partial<KeyEntry> & { public_key: string }): KeyEntry {
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw.public_key)) {
    throw new Error('attestation public_key must be a 20-byte hex address');
  }
  if (raw.role !== undefined && raw.role !== 'attester' && raw.role !== 'sample') {
    throw new Error('attestation key role must be attester or sample');
  }
  const validFrom = raw.validFrom ?? process.env.ATTESTATION_KEY_VALID_FROM ?? DEFAULT_VALID_FROM;
  if (Number.isNaN(Date.parse(validFrom))) {
    throw new Error('attestation key validFrom must be an ISO date');
  }
  if (
    raw.validUntil !== undefined &&
    raw.validUntil !== null &&
    Number.isNaN(Date.parse(raw.validUntil))
  ) {
    throw new Error('attestation key validUntil must be an ISO date or null');
  }
  return {
    key_id: raw.key_id ?? DEFAULT_KEY_ID,
    public_key: raw.public_key,
    algorithm: 'EIP-712/secp256k1',
    validFrom,
    validUntil: raw.validUntil ?? null,
    revoked: raw.revoked ?? false,
    note: raw.note,
    role: raw.role,
  };
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
  const sampleEntry: KeyEntry | null = sampleAttester
    ? {
        key_id: process.env.ATTESTATION_SAMPLE_KEY_ID ?? DEFAULT_SAMPLE_KEY_ID,
        public_key: sampleAttester,
        algorithm: 'EIP-712/secp256k1',
        validFrom: process.env.ATTESTATION_SAMPLE_KEY_VALID_FROM ?? '2026-09-03',
        validUntil: null,
        revoked: false,
        role: 'sample',
        note: DEFAULT_SAMPLE_KEY_NOTE,
      }
    : null;

  let revoked: RevokedKey[] = [];
  const revokedConfig = process.env.ATTESTATION_REVOKED_KEYS_CONFIG;
  if (revokedConfig) {
    try {
      const parsedRevoked = JSON.parse(revokedConfig) as unknown;
      if (!Array.isArray(parsedRevoked)) {
        throw new Error('ATTESTATION_REVOKED_KEYS_CONFIG must be a JSON array');
      }
      revoked = parsedRevoked as RevokedKey[];
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
      const parsed = JSON.parse(keysConfig) as Array<Partial<KeyEntry> & { public_key: string }>;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('ATTESTATION_KEYS_CONFIG must be a non-empty JSON array');
      }
      if (parsed.some((key) => typeof key.public_key !== 'string' || key.public_key.length === 0)) {
        throw new Error('ATTESTATION_KEYS_CONFIG contains a key without public_key');
      }

      const keys = parsed.map(normalizeKey);
      // Append the sample signer unless the explicit config already lists
      // its address (deduped by address, the verification identity).
      if (
        sampleEntry &&
        !keys.some((k) => k.public_key.toLowerCase() === sampleEntry.public_key.toLowerCase())
      ) {
        keys.push(sampleEntry);
      }
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
  const addr = attester.toLowerCase();
  const entry = config.keys.find((k) => k.public_key.toLowerCase() === addr);
  if (!entry) return false;
  if (entry.revoked) return false;
  if (config.revoked.some((revocation) => revocation.key_id === entry.key_id)) return false;
  if (checkedAt == null) return false;

  const checkedAtMs = checkedAt * 1000;
  const from = Date.parse(entry.validFrom);
  if (!Number.isNaN(from) && checkedAtMs < from) return false;

  if (entry.validUntil) {
    const until = Date.parse(entry.validUntil);
    if (!Number.isNaN(until) && checkedAtMs >= until) return false;
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
