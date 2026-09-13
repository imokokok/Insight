/**
 * @fileoverview Signed commitments added by Execution Receipt v3.
 *
 * Both helpers exist because the same defect was found twice in one
 * verification pass, in two different forms:
 *
 *   1. Half of the quote basis was unsigned. quotedPrice is the ratio of TWO
 *      pre-trade gates, and only one uid was in the struct, so the other gate
 *      arrived out of band and could be swapped without breaking any signature.
 *   2. A signed zero was indistinguishable from an unmeasured field. Four
 *      notional fields were signed as 0 on a five-figure settlement, and nothing
 *      in the bytes said whether that meant "measured, and it was zero" or
 *      "never measured".
 *
 * The fix in both cases is a commitment rather than more fields: the values stay
 * where they are, and a hash binds either the set of gates the quote was built
 * from or the set of fields that were genuinely measured.
 *
 * Design rule applied to both: a verifier must be able to OPEN the hash without
 * asking us for anything. That is why {@link computeMeasuredFieldsHash} hashes a
 * name list drawn from a small published universe (16 subsets — a verifier
 * enumerates them and matches) rather than an opaque bitmask, and why
 * {@link computePreTradeUidsHash} takes the non-zero uids themselves, which
 * already ship in the receipt for the two-gate case. The zero bytes32 value is
 * a fixed-layout sentinel, not a gate and therefore not a set member.
 */

import { concat, keccak256, toBytes } from 'viem';

/**
 * The fields whose signed value is only meaningful if it was actually measured.
 * This is the universe {@link computeMeasuredFieldsHash} is defined over — a
 * verifier needs this list and nothing else to open the hash.
 */
export const MEASURABLE_EXECUTION_FIELDS = [
  'actualFeeUsd',
  'executedAmountUsd',
  'mevRiskBps',
  'quotedAmountUsd',
] as const;

export type MeasurableExecutionField = (typeof MEASURABLE_EXECUTION_FIELDS)[number];

/** Field-name separator. Part of the commitment: changing it changes every hash. */
const FIELD_SEPARATOR = ',';
const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

/**
 * Commit to WHICH notional fields carry a measured value.
 *
 * `uint256` cannot express "absent", so a zero notional and an unmeasured
 * notional sign identically. This hash separates them: a consumer checks the
 * field it is about to read is in the committed set before believing the number.
 *
 * Deterministic and order-independent: deduplicated, then sorted, then joined.
 * The empty set hashes to keccak256 of the empty string — a defined value, which
 * is the honest encoding of "nothing here was measured".
 */
export function computeMeasuredFieldsHash(
  fields: ReadonlyArray<MeasurableExecutionField>
): `0x${string}` {
  const sorted = [...new Set(fields)].sort();
  return keccak256(toBytes(sorted.join(FIELD_SEPARATOR)));
}

/**
 * Commit to the ORDERED set of non-zero pre-trade gate uids the quote was built
 * from. A zero bytes32 value is a fixed-layout sentinel for "no gate" and is
 * omitted before hashing; it is never a member of the set.
 *
 * Order is part of the commitment on purpose. quotedPrice for a two-leg swap is
 * source consensus over destination consensus, so the same pair of gates in the
 * opposite order is a different quote with a different meaning.
 *
 * Empty input, or an input containing only zero sentinels, hashes the empty byte
 * string, which is what a receipt with no proven gates must commit to.
 */
export function computePreTradeUidsHash(
  uids: ReadonlyArray<`0x${string}` | string>
): `0x${string}` {
  const normalized = uids
    .map((uid) => (uid.startsWith('0x') ? (uid as `0x${string}`) : (`0x${uid}` as `0x${string}`)))
    .filter((uid) => uid.toLowerCase() !== ZERO_BYTES32);
  if (normalized.length === 0) return keccak256(toBytes(''));
  return keccak256(concat(normalized));
}
