/**
 * Billing exemptions for results that carry no usable conclusion.
 *
 * A tool that returns no usable data is not a delivered product, so it must
 * never be charged. "Free" is not one outcome, though: the ledger `reason` and
 * `X-Credit-Zero-Reason` must say which kind of zero the caller got.
 *
 *   - `insufficient_data` — an evidence grade explicitly says the inputs were
 *     insufficient to conclude. The data was measured and judged unusable.
 *   - `upstream_failed` — a batch returned no successful item at all, i.e.
 *     every lookup failed upstream. The data may exist; the sources did not
 *     answer. Kept separate so a ledger cannot confuse "no data" with "all
 *     upstreams down".
 *   - `timeout` — upstream/chain deadline (`UPSTREAM_TIMEOUT`), also unbilled.
 */

export const UPSTREAM_TIMEOUT_CODE = 'UPSTREAM_TIMEOUT';

/** Zero-charge reasons emitted in `X-Credit-Zero-Reason` and `credit_ledger.reason`. */
export const BILLING_ZERO_REASONS = {
  insufficientData: 'insufficient_data',
  upstreamFailed: 'upstream_failed',
  timeout: 'timeout',
} as const;

export type BillingZeroReason = (typeof BILLING_ZERO_REASONS)[keyof typeof BILLING_ZERO_REASONS];

/** Signals an evidence/verdict explicitly graded as insufficient to conclude. */
const INSUFFICIENT_DATA_PATTERN = /\bINSUFFICIENT_DATA\b/;

/** Batch tools say exactly this when every requested item failed. */
const NO_SUCCESSFUL_DATA_PATTERN = /\bNo successful (?:prices|results|quotes)\b/i;

/** True when the evidence itself was graded insufficient to conclude. */
export function isInsufficientDataResult(resultText: string): boolean {
  return INSUFFICIENT_DATA_PATTERN.test(resultText);
}

/** True when every requested batch item failed — an upstream failure, not "no data". */
export function isAllItemsFailedResult(resultText: string): boolean {
  return NO_SUCCESSFUL_DATA_PATTERN.test(resultText);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }
  return String(error);
}

/** Detect AbortError / TimeoutError / ETIMEDOUT and explicit timeout wording. */
export function isUpstreamTimeoutError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    /\b(?:AbortError|TimeoutError|ETIMEDOUT|ESOCKETTIMEDOUT|UND_ERR_CONNECT_TIMEOUT)\b/i.test(
      message
    ) || /\b(?:timed?\s*out|timeout|deadline exceeded)\b/i.test(message)
  );
}
