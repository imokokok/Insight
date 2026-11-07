/**
 * Canonical per-request billing receipt headers (`X-Credit-*`).
 *
 * The authoritative pricing review (2026-11-07 v2.1) keeps this pre-existing
 * public contract and explicitly rejects inventing `X-Insight-*` aliases:
 * callers already read `X-Credit-*`.
 */

export type CreditBillingStatus =
  | 'charged'
  | 'replayed'
  | 'waived'
  | 'degraded'
  | 'free'
  | 'not_charged'
  | 'quote';

export interface CreditBillingHeaderInput {
  /** Credits charged for this request (per successful item for batches). */
  costCredits?: number;
  /** Pre-request wallet balance, when known. */
  balance?: number | null;
  /** Post-request wallet balance. Present after a confirmed debit. */
  balanceAfter?: number | null;
  status?: CreditBillingStatus;
  /**
   * Why this request cost zero credits: `insufficient_data` (the evidence
   * grade itself could not support a conclusion), `upstream_failed` (every
   * requested batch item failed upstream), `rejected_without_evidence` (a
   * refused verdict omitted a reproducibility item and was downgraded), `timeout`,
   * `tool_free` (the tool or
   * verification kind is zero-priced by design), `free`, `replay`,
   * `unconfirmed`. Emitted only for zero-charge outcomes so a caller can tell
   * "free because there was no data" from "free by price".
   */
  zeroReason?: string;
  /** Deterministic ledger metering key for this logical request. */
  receipt?: string | null;
  /**
   * True when this call brings the key to >=80% of its monthly spend cap.
   * Left `undefined`/`false` when the caller has no budget concept (no cap
   * set) or is below the threshold — the header is omitted, never sent empty.
   */
  budgetWarning?: boolean;
}

/** Advisory spend-cap header, emitted once a key reaches the threshold. */
export const CREDIT_BUDGET_WARNING_HEADER = 'X-Credit-Budget-Warning';

/** Header value: the threshold percentage, matching the documented REST
 *  contract (`X-Credit-Budget-Warning: 80`). The cap itself hard-stops at
 *  100% via `precheck_credits`; this header is advisory. */
export const CREDIT_BUDGET_WARNING_PERCENT = 80;

export const CREDIT_BILLING_HEADER_NAMES = [
  'X-Credit-Cost',
  'X-Credit-Balance',
  'X-Credit-Balance-After',
  'X-Credit-Status',
  'X-Credit-Zero-Reason',
  'X-Credit-Receipt',
  CREDIT_BUDGET_WARNING_HEADER,
] as const;

export function applyCreditBillingHeaders(headers: Headers, input: CreditBillingHeaderInput): void {
  if (input.costCredits !== undefined) {
    headers.set('X-Credit-Cost', String(input.costCredits));
  }
  if (input.balance !== undefined && input.balance !== null) {
    headers.set('X-Credit-Balance', String(input.balance));
  }
  if (input.balanceAfter !== undefined && input.balanceAfter !== null) {
    headers.set('X-Credit-Balance-After', String(input.balanceAfter));
  }
  if (input.status) {
    headers.set('X-Credit-Status', input.status);
  }
  if (input.zeroReason) {
    headers.set('X-Credit-Zero-Reason', input.zeroReason);
  }
  if (input.receipt) {
    headers.set('X-Credit-Receipt', input.receipt);
  }
  if (input.budgetWarning === true) {
    headers.set(CREDIT_BUDGET_WARNING_HEADER, String(CREDIT_BUDGET_WARNING_PERCENT));
  }
}
