// Failure classes for the post-deploy live smoke.
//
// The release workflow releases main before the post-merge quality run finishes,
// so the live smoke is the only thing between a regression and users. It must
// therefore distinguish "the application answered wrongly" from "the probe never
// reached the application". Only the first class is allowed to trigger an
// automatic rollback; the second is retried and never reverted, because rolling a
// healthy release back on an edge or rate-limit hiccup is itself an outage.

export const INFRASTRUCTURE_STATUSES = new Set([429, 502, 503, 504]);

/** Classify a non-matching HTTP status from a probe that reached the server. */
export function classifyStatusFailure(status) {
  return INFRASTRUCTURE_STATUSES.has(status) ? 'infrastructure' : 'application';
}

/**
 * Exit code contract for `scripts/smoke-live-payment-rails.mjs`:
 * 0 = passed, 1 = application failure, 2 = infrastructure-only failure.
 */
export function exitCodeForFailureKinds(kinds) {
  if (kinds.some((kind) => kind === 'application')) return 1;
  if (kinds.length > 0) return 2;
  return 0;
}
