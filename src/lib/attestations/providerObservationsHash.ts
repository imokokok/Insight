/**
 * @fileoverview providerObservationsHash — binds "which evidence produced the
 * verdict" into the v2 signed attestation.
 *
 * Raul's locked v2 spec (clarification ⑩, §7.6): participantCount alone does
 * NOT bind which providers/feeds actually produced the verdict. So in addition
 * to the count, we sign a `providerObservationsHash` over a canonical sorted
 * list of provider observations. The full observation list stays in the JSON
 * response (human/agent readable); only the hash is signed — binding the
 * evidence provenance without bloating the signature.
 *
 * Each observation entry captures:
 *   - provider        e.g. 'chainlink' (evidence source namespace)
 *   - feedId          the oracle feed identifier (oracle_feeds.address —
 *                     Chainlink feed contract / Pyth feed ID / API3 dAPI / …)
 *   - value           observed price, scaled ×1e8 (uint256)
 *   - timestamp       observation time, unix seconds (uint256)
 *   - dataAgeSeconds  age at check time, seconds (uint256)
 *   - included        whether this observation was included in consensus
 *   - exclusionReason '' when included; a reason code when excluded (outlier /
 *                     stale / unsupported / error) — this is how the hash
 *                     captures BOTH included AND excluded evidence
 *
 * Canonical encoding (deterministic, reproducible by both sides):
 *   1. ABI-encode each entry as a fixed 7-field tuple.
 *   2. keccak256 each encoded entry.
 *   3. Sort the per-entry hashes lexicographically (byte order) — this makes
 *      the root order-independent so input ordering can't drift the signature.
 *   4. Concatenate the sorted 32-byte hashes and keccak256 once more → root.
 *
 * This Merkle-root-style construction is standard, unambiguous, and trivially
 * reproducible: both sides call the same ABI encode + keccak + sort + keccak.
 */

import { concat, encodeAbiParameters, keccak256 } from 'viem';

export interface ProviderObservationEntry {
  provider: string;
  feedId: string;
  value: bigint; // ×1e8
  timestamp: bigint; // unix seconds
  dataAgeSeconds: bigint;
  included: boolean;
  exclusionReason: string; // '' when included
}

const ENTRY_ABI = [
  { name: 'provider', type: 'string' },
  { name: 'feedId', type: 'string' },
  { name: 'value', type: 'uint256' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'dataAgeSeconds', type: 'uint256' },
  { name: 'included', type: 'bool' },
  { name: 'exclusionReason', type: 'string' },
] as const;

function encodeEntry(e: ProviderObservationEntry): `0x${string}` {
  return encodeAbiParameters(ENTRY_ABI, [
    e.provider,
    e.feedId,
    e.value,
    e.timestamp,
    e.dataAgeSeconds,
    e.included,
    e.exclusionReason,
  ]);
}

function compareHex(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la < lb) return -1;
  if (la > lb) return 1;
  return 0;
}

/**
 * VERITAS round 3 N6: the count and agreement figure a gate signs BESIDE its
 * observations must be derivable from those observations, so a consumer holding
 * one gate can recompute the signed numbers from the presented evidence rather
 * than trusting a self-asserted figure. (The earlier demo packet signed
 * participantCount 4 beside three observations and 9900 bps of agreement
 * beside three identical values.)
 *
 * participantCount = the number of INCLUDED observations. Excluded entries are
 * evidence the verdict saw and discarded, not voices in the quorum, so they do
 * not count toward coverage.
 *
 * crossProviderAgreement = 1 - (max - min) / max over the included values
 * (×1e8-scaled prices). Identical values → 1.0 (perfect agreement → 10000 bps);
 * a 5% spread between the closest and farthest included quote → 0.95.
 */
export function deriveParticipantCount(entries: ProviderObservationEntry[]): number {
  return entries.filter((e) => e.included).length;
}

export function deriveCrossProviderAgreement(entries: ProviderObservationEntry[]): number {
  const included = entries.filter((e) => e.included).map((e) => Number(e.value));
  if (included.length === 0) return 0;
  const max = Math.max(...included);
  const min = Math.min(...included);
  return max > 0 ? 1 - (max - min) / max : 1;
}

/**
 * Compute the canonical providerObservationsHash. Pure & deterministic.
 *
 * Empty list → keccak256 of empty bytes (a stable, published constant) so the
 * "no observations" case still has a well-defined signed value rather than null
 * (a null hash field would let the JSON drift from the signature — the exact
 * v1 gap v2 closes).
 */
export function computeProviderObservationsHash(
  entries: ProviderObservationEntry[]
): `0x${string}` {
  if (entries.length === 0) return keccak256('0x');

  const entryHashes = entries
    .map(encodeEntry)
    .map((encoded) => keccak256(encoded))
    .sort(compareHex);

  return keccak256(concat(entryHashes as `0x${string}`[]));
}
