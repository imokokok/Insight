/**
 * @fileoverview reasonCodesHash — binds the verdict's reasons into the v2
 * signature without expanding the signed field set.
 *
 * Raul's locked v2 spec (§4, §7.4): BLOCK-from-missing-evidence vs
 * BLOCK-from-market-danger must be distinguishable. Rather than sign a variable
 * list of reason strings (which would make the EIP-712 type layout non-fixed),
 * we sign a single `reasonCodesHash = keccak(sorted unique reasonCodes array)`.
 * The full contributingFactors stay in JSON; the hash binds the reason set.
 *
 * Reason codes (v2.0 + v2.1):
 *   INSUFFICIENT_COVERAGE, MAX_DEVIATION, CROSS_SPREAD, STALE_DATA,
 *   LOW_AGREEMENT, STABLECOIN_DEPEG, POSITION_VS_LIQUIDITY, PROTOCOL_BUFFER
 *   INSUFFICIENT_INDEPENDENCE (v2.1's source-group / operator-independence gate)
 *
 * Encoding: `keccak256(abi.encode(['string[]'], [sortedUniqueCodes]))`.
 * ABI-encoding a string[] is standard, length-prefixed, deterministic — both
 * sides reproduce the same hash from the same reason set.
 */

import { encodeAbiParameters, keccak256 } from 'viem';

export type ReasonCode =
  | 'INSUFFICIENT_COVERAGE'
  | 'MAX_DEVIATION'
  | 'CROSS_SPREAD'
  | 'STALE_DATA'
  | 'LOW_AGREEMENT'
  | 'STABLECOIN_DEPEG'
  | 'POSITION_VS_LIQUIDITY'
  | 'PROTOCOL_BUFFER'
  | 'INSUFFICIENT_INDEPENDENCE';

/**
 * Map the pre-trade rule engine's `contributingFactors[].rule` strings to the
 * signed reason-code set. Verified against the actual rule names emitted by
 * preTradeSafetyService (oracle_coverage, max_provider_deviation_pct, …).
 */
export const RULE_TO_REASON_CODE: Record<string, ReasonCode> = {
  oracle_coverage: 'INSUFFICIENT_COVERAGE',
  quorum: 'INSUFFICIENT_COVERAGE', // v2 quorum gate reuses this code
  max_provider_deviation_pct: 'MAX_DEVIATION',
  cross_provider_spread_pct: 'CROSS_SPREAD',
  data_stale_seconds: 'STALE_DATA',
  cross_provider_agreement: 'LOW_AGREEMENT',
  stablecoin_depeg_pct: 'STABLECOIN_DEPEG',
  position_to_liquidity_ratio: 'POSITION_VS_LIQUIDITY',
  protocol_buffer_consumed: 'PROTOCOL_BUFFER',
  oracle_independence: 'INSUFFICIENT_INDEPENDENCE',
};

/**
 * Derive the sorted, deduplicated reason-code set from contributing factors.
 * Unknown rules are skipped (forward-compatible with v2.1 additions).
 */
export function reasonCodesFromContributingFactors(
  factors: ReadonlyArray<{ rule: string }>
): ReasonCode[] {
  const codes = new Set<ReasonCode>();
  for (const f of factors) {
    const code = RULE_TO_REASON_CODE[f.rule];
    if (code) codes.add(code);
  }
  return [...codes].sort();
}

/**
 * Compute the canonical reasonCodesHash. Pure & deterministic.
 *
 * Deduplicates + alphabetically sorts before encoding so input order/multiplicity
 * can't drift the signature. Empty set still hashes to a well-defined value.
 */
export function computeReasonCodesHash(reasonCodes: ReadonlyArray<string>): `0x${string}` {
  const sorted = [...new Set(reasonCodes)].sort();
  return keccak256(encodeAbiParameters([{ type: 'string[]', name: 'reasonCodes' }], [sorted]));
}
