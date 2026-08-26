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
 * address (may be null when attestations are disabled). When an explicit
 * ATTESTATION_KEYS_CONFIG is present and parseable it wins; otherwise we fall
 * back to the single active key so existing deployments are unaffected.
 */
export function buildKeyRegistryConfig(attester: string | null): KeyRegistryConfig {
  const keysConfig = process.env.ATTESTATION_KEYS_CONFIG;
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
        return { keys: parsed.map(normalizeKey), revoked };
      }
    } catch {
      /* fall through to single-key */
    }
  }

  return {
    keys: attester
      ? [
          normalizeKey({
            key_id: DEFAULT_KEY_ID,
            public_key: attester,
            validFrom: process.env.ATTESTATION_KEY_VALID_FROM ?? DEFAULT_VALID_FROM,
            validUntil: null,
            revoked: false,
          }),
        ]
      : [],
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
