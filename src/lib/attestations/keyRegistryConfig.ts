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

/**
 * Rotation cadence target (key-rotation-procedure.md §2): annual, or
 * immediately on compromise / regeneration. Process-level — the actual
 * schedule lives on an operations calendar, not in code (gap §5.5).
 */
export const ROTATION_TARGET_CADENCE_DAYS = 365;

function normalizeKey(raw: Partial<KeyEntry> & { public_key: string }): KeyEntry {
  return {
    key_id: raw.key_id ?? DEFAULT_KEY_ID,
    public_key: raw.public_key,
    algorithm: 'EIP-712/secp256k1',
    validFrom: raw.validFrom ?? process.env.ATTESTATION_KEY_VALID_FROM ?? DEFAULT_VALID_FROM,
    validUntil: raw.validUntil ?? null,
    revoked: raw.revoked ?? false,
    note: raw.note,
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
        validFrom:
          process.env.ATTESTATION_SAMPLE_KEY_VALID_FROM ?? '2026-09-03',
        validUntil: null,
        revoked: false,
        role: 'sample',
        note: DEFAULT_SAMPLE_KEY_NOTE,
      }
    : null;

  if (keysConfig) {
    try {
      const parsed = JSON.parse(keysConfig) as Array<Partial<KeyEntry> & { public_key: string }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const revokedConfig = process.env.ATTESTATION_REVOKED_KEYS_CONFIG;
        let revoked: RevokedKey[] = [];
        if (revokedConfig) {
          try {
            const parsedRevoked = JSON.parse(revokedConfig);
            if (Array.isArray(parsedRevoked)) revoked = parsedRevoked as RevokedKey[];
          } catch {
            /* ignore malformed revoked config */
          }
        }
        const keys = parsed.map(normalizeKey);
        // Append the sample signer unless the explicit config already lists
        // its address (deduped by address, the verification identity).
        if (
          sampleEntry &&
          !keys.some(
            (k) => k.public_key.toLowerCase() === sampleEntry.public_key.toLowerCase()
          )
        ) {
          keys.push(sampleEntry);
        }
        return { keys, revoked };
      }
    } catch {
      /* fall through to single-key */
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
    revoked: [],
  };
}

/**
 * Whether an attestation signed by `attester` at `checkedAt` is within the
 * published trust window. Used ONLY when server-side window enforcement is
 * enabled (ATTESTATION_ENFORCE_KEY_WINDOW). When enforcement is off this is
 * never called.
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
  if (checkedAt == null) return false;

  const from = Date.parse(entry.validFrom);
  if (!Number.isNaN(from) && checkedAt < from) return false;

  if (entry.validUntil) {
    const until = Date.parse(entry.validUntil);
    if (!Number.isNaN(until) && checkedAt > until) return false;
  }
  return true;
}
