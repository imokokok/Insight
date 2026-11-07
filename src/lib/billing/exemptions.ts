/**
 * Billing exemptions for results that carry no usable conclusion.
 *
 * A tool that returns no usable data is not a delivered product, so it must
 * never be charged:
 *
 *   - `insufficient_data` evidence grades / "no successful prices" batch results
 *     are exempt from billing;
 *   - upstream or chain timeouts are surfaced with an explicit error code
 *     (`UPSTREAM_TIMEOUT`) instead of a generic failure, and are never billed.
 */

export const UPSTREAM_TIMEOUT_CODE = 'UPSTREAM_TIMEOUT';

/** Signals an evidence/verdict explicitly graded as insufficient to conclude. */
const INSUFFICIENT_DATA_PATTERN = /\bINSUFFICIENT_DATA\b/;

/** Batch tools say exactly this when every requested item failed. */
const NO_SUCCESSFUL_DATA_PATTERN = /\bNo successful (?:prices|results|quotes)\b/i;

export function isNoUsableDataResult(resultText: string): boolean {
  return INSUFFICIENT_DATA_PATTERN.test(resultText) || NO_SUCCESSFUL_DATA_PATTERN.test(resultText);
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
