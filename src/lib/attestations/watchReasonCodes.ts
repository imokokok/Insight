/**
 * @fileoverview Oracle Watch reason codes — the composable "why" behind a
 * Watch verdict, bound into the v2 signature via `reasonCodesHash`.
 *
 * The v1 Watch receipt carried a single opaque `reason` string
 * (`deviation_or_agreement_breached_danger`, `insufficient_cross_oracle_quorum`,
 * …). An agent told to "pause when DANGER" could not tell a price divergence
 * from a quorum shortfall from an independence failure — three states with
 * completely different remediations. Pre-trade already solved this with a
 * reason-code set (reasonCodesHash.ts); Watch now has its own set because its
 * gate dimensions are not the same as pre-trade's.
 *
 * Codes are additive-only: adding a code changes `reasonCodesHash` but NOT the
 * EIP-712 type layout, so the signed field set stays fixed.
 *
 * Encoding is shared with pre-trade (keccak256(abi.encode(string[])) over the
 * sorted, deduplicated set) so one verifier handles both surfaces.
 */

/**
 * Watch reason codes.
 *
 *   NO_COVERAGE               — zero providers responded; nothing to cross-check.
 *   INSUFFICIENT_QUORUM       — fewer than `requiredParticipantCount` providers.
 *   INSUFFICIENT_INDEPENDENCE — fewer than `requiredSourceGroupCount` distinct
 *                               NON-DERIVED operator groups (TWAP does not
 *                               count). Three wrappers of one operator satisfy
 *                               quorum but NOT independence.
 *   MAX_DEVIATION             — max |deviation from consensus| crossed the
 *                               danger line.
 *   LOW_AGREEMENT             — cross-provider agreement below the danger line.
 *   OUTLIER_PRESENT           — at least one provider was rejected as an
 *                               outlier (caution-level on its own).
 *   STALE_DATA                — at least one provider served stale data.
 *   ML_FORWARD_RISK_HIGH      — advisory forward-looking manipulation risk in
 *                               the high bucket (escalates NORMAL → CAUTION).
 *   MARKET_DIVERGENCE         — advisory oracle-vs-market divergence: consensus
 *                               deviates >= 2% from the independent CEX market
 *                               reference (external truth layer). Evidence,
 *                               never a verdict input by itself.
 */
export type WatchReasonCode =
  | 'NO_COVERAGE'
  | 'INSUFFICIENT_QUORUM'
  | 'INSUFFICIENT_INDEPENDENCE'
  | 'MAX_DEVIATION'
  | 'LOW_AGREEMENT'
  | 'OUTLIER_PRESENT'
  | 'STALE_DATA'
  | 'ML_FORWARD_RISK_HIGH'
  | 'MARKET_DIVERGENCE';

/** Inputs the verdict rule engine produces; pure mapping to codes below. */
export interface WatchReasonInputs {
  /** Providers that responded successfully (participantCount). */
  participantCount: number;
  /** Distinct non-derived operator groups among the responding providers. */
  sourceGroupCount: number;
  /** Quorum floor the signal is judged against. */
  requiredParticipantCount: number;
  /** Independence floor the signal is judged against. */
  requiredSourceGroupCount: number;
  /** Max |deviation from consensus| crossed the DANGER line. */
  deviationDanger: boolean;
  /** Cross-provider agreement below the DANGER line. */
  agreementDanger: boolean;
  outlierCount: number;
  staleCount: number;
  /** Advisory ML forward-risk in the high bucket. */
  mlForwardRiskHigh: boolean;
  /** Advisory oracle-vs-market divergence (consensus vs CEX reference >= 2%). */
  marketDivergence: boolean;
}

/**
 * Derive the sorted, deduplicated reason-code set from the rule engine's
 * outcome. Order of emission follows gate severity (coverage → independence →
 * market → advisory); the hash sorts anyway, so this is documentation.
 */
export function watchReasonCodes(input: WatchReasonInputs): WatchReasonCode[] {
  const codes = new Set<WatchReasonCode>();

  if (input.participantCount === 0) {
    codes.add('NO_COVERAGE');
    return [...codes];
  }
  if (input.participantCount < input.requiredParticipantCount) {
    codes.add('INSUFFICIENT_QUORUM');
  }
  if (input.sourceGroupCount < input.requiredSourceGroupCount) {
    codes.add('INSUFFICIENT_INDEPENDENCE');
  }
  if (input.deviationDanger) codes.add('MAX_DEVIATION');
  if (input.agreementDanger) codes.add('LOW_AGREEMENT');
  if (input.outlierCount > 0) codes.add('OUTLIER_PRESENT');
  if (input.staleCount > 0) codes.add('STALE_DATA');
  if (input.mlForwardRiskHigh) codes.add('ML_FORWARD_RISK_HIGH');
  if (input.marketDivergence) codes.add('MARKET_DIVERGENCE');

  return [...codes].sort();
}
