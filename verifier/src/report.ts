/**
 * Opt-in verification telemetry.
 *
 * `verifyReceipt()` is silent by design — it makes no network call, ever. This
 * module is the explicit, separate opt-in for callers who WANT Insight to know
 * a verification happened.
 *
 * Why it is separate rather than a flag on `verifyReceipt`:
 *
 *   - The whole value of a local verifier is that it works with no dependency
 *     on Insight. A telemetry flag on the verify path makes that a matter of
 *     configuration rather than a property of the code, and one default flip
 *     away from silently phoning home.
 *   - A caller can read this file and see there is nothing else outbound. That
 *     is a much stronger claim than "trust our defaults".
 *
 * The JSON body contains only the schema version, outcome code, key standing,
 * and (only on explicit request) the UID. The receiving server can still see
 * ordinary network metadata such as the caller's IP address.
 *
 * Honest caveat: an unauthenticated public counter is trivially gameable by
 * anyone who can send HTTP. Treat numbers collected this way as a directional
 * signal about the long tail, never as a billing or SLA input. For a number you
 * can actually stand behind, measure evidence utilization server-side — see
 * `scripts/evidence-utilization.mjs` in this package.
 */

import type { VerifyResult } from './types';

/** Bump when the payload shape changes. Consumers can branch on it. */
export const REPORT_SCHEMA_VERSION = 1;

export interface VerificationReport {
  v: number;
  schemaVersion: number;
  /** 'recheck' when the receipt was a recheck, otherwise 'check'. */
  kind: 'check' | 'recheck';
  /** Terminal outcome of the verification. */
  code: string;
  /** Attester-key standing, or 'not_checked' when no registry was supplied. */
  keyStatus: string;
  /** Only present when `includeUid` is set. See the note on that option. */
  uid?: string;
}

export interface ReportOptions {
  /** REQUIRED. Where to send the report. There is deliberately no default:
   *  this library will not pick a destination on your behalf. Point it at
   *  Insight's telemetry endpoint or at your own collector — the payload shape
   *  is public either way. */
  endpoint: string;
  /** Include the receipt UID. Off by default: a UID was issued by Insight, so
   *  it can be joined back to the account that requested it. Only turn this on
   *  if that linkage is something you actually want. */
  includeUid?: boolean;
  /** Milliseconds before the request is abandoned. Default 1500. */
  timeoutMs?: number;
  /** Inject a fetch implementation (tests, older runtimes, proxies). */
  fetchImpl?: typeof fetch;
}

/**
 * Best-effort report of a verification. It never rejects, and a failure here
 * says nothing about the receipt. Callers can await the result or deliberately
 * discard the returned promise when telemetry is outside their critical path.
 *
 * @returns true if the report was accepted, false otherwise. There is no retry.
 *
 * @example
 * ```ts
 * const result = await verifyReceipt(receipt, { keyRegistry });
 * void reportVerification(result, { endpoint: process.env.INSIGHT_TELEMETRY_URL! });
 * ```
 */
export async function reportVerification(
  result: VerifyResult,
  opts: ReportOptions
): Promise<boolean> {
  try {
    if (!opts?.endpoint) return false;

    const payload: VerificationReport = {
      v: REPORT_SCHEMA_VERSION,
      schemaVersion: result.schemaVersion,
      kind: result.kind,
      code: result.code,
      keyStatus: result.keyStatus,
      ...(opts.includeUid && result.uid ? { uid: result.uid } : {}),
    };

    const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') return false;

    const timeoutMs = opts.timeoutMs ?? 1500;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(opts.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        // Do not ask the runtime to keep this optional request alive on unload.
        keepalive: false,
      } as RequestInit);
      return response.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // A failed report is not a verification failure. Swallow it.
    return false;
  }
}
