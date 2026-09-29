/**
 * Attester-key trust-window check.
 *
 * A signature proves WHO signed. It does not prove the key was trustworthy at
 * the time. Insight publishes the answer as a key registry at
 * `/.well-known/oracle-keys.json`; pass it in and `verifyReceipt` reports the
 * signer's standing separately from the cryptography.
 *
 * The separation is deliberate. `valid` answers "is this receipt internally
 * sound", `keyStatus` answers "should I trust the key that made it". Collapsing
 * them would make a receipt flip from valid to invalid the moment a key is
 * rotated — retroactively rewriting a statement that was true when it was made.
 */

import type { KeyEntry, KeyRegistry, KeyStatus } from './types';

/**
 * Resolve a signer's standing in the published registry.
 *
 * Deterministic and synchronous. Returns `not_checked` when no registry is
 * supplied, which is the library's default: `verifyReceipt` never reaches for
 * the network on its own.
 */
export function resolveKeyStatus(
  attester: string | undefined | null,
  checkedAt: number | null,
  registry: KeyRegistry | undefined
): KeyStatus {
  if (!registry || !attester) return 'not_checked';
  if (
    (registry.public_keys !== undefined && registry.keys !== undefined) ||
    (registry.revoked_keys !== undefined && registry.revoked !== undefined)
  ) {
    return 'unknown_key';
  }

  const addr = attester.toLowerCase();
  const keys = registry.public_keys ?? registry.keys;
  if (!Array.isArray(keys)) return 'unknown_key';
  const matches = keys.filter(
    (k: KeyEntry) => typeof k?.public_key === 'string' && k.public_key.toLowerCase() === addr
  );
  if (matches.length !== 1) return 'unknown_key';
  const entry = matches[0];
  if (
    typeof entry.key_id !== 'string' ||
    !entry.key_id ||
    typeof entry.revoked !== 'boolean' ||
    (entry.validUntil !== null && typeof entry.validUntil !== 'string')
  ) {
    return 'unknown_key';
  }
  if (entry.revoked) return 'revoked';

  // Superset of the server-side rule (isAttestationKeyValid): we also honour
  // the registry's `revoked` array. A registry that lists a key there while
  // leaving `revoked: false` on the entry is self-contradictory; fail closed.
  const revoked = registry.revoked_keys ?? registry.revoked ?? [];
  if (
    !Array.isArray(revoked) ||
    revoked.some((item) => !item || typeof item !== 'object' || typeof item.key_id !== 'string')
  ) {
    return 'unknown_key';
  }
  if (revoked.some((r) => r?.key_id === entry.key_id)) return 'revoked';

  // No timestamp means the window cannot be evaluated, so it cannot be claimed.
  if (!Number.isSafeInteger(checkedAt) || checkedAt === null || checkedAt < 0) {
    return 'outside_window';
  }

  const checkedAtMs = checkedAt * 1000;
  if (!Number.isSafeInteger(checkedAtMs)) return 'outside_window';

  const from = typeof entry.validFrom === 'string' ? Date.parse(entry.validFrom) : NaN;
  if (!Number.isFinite(from) || checkedAtMs < from) return 'outside_window';

  if (entry.validUntil) {
    const until = Date.parse(entry.validUntil);
    if (!Number.isFinite(until) || until <= from || checkedAtMs >= until) return 'outside_window';
  }

  return 'valid';
}
