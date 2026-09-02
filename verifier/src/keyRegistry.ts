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

  const addr = attester.toLowerCase();
  const entry = (registry.keys ?? []).find(
    (k: KeyEntry) => typeof k?.public_key === 'string' && k.public_key.toLowerCase() === addr
  );
  if (!entry) return 'unknown_key';
  if (entry.revoked) return 'revoked';

  // Superset of the server-side rule (isAttestationKeyValid): we also honour
  // the registry's `revoked` array. A registry that lists a key there while
  // leaving `revoked: false` on the entry is self-contradictory; fail closed.
  if ((registry.revoked ?? []).some((r) => r?.key_id === entry.key_id)) return 'revoked';

  // No timestamp means the window cannot be evaluated, so it cannot be claimed.
  if (checkedAt == null) return 'outside_window';

  const checkedAtMs = checkedAt * 1000;

  const from = Date.parse(entry.validFrom);
  if (!Number.isNaN(from) && checkedAtMs < from) return 'outside_window';

  if (entry.validUntil) {
    const until = Date.parse(entry.validUntil);
    if (!Number.isNaN(until) && checkedAtMs > until) return 'outside_window';
  }

  return 'valid';
}
