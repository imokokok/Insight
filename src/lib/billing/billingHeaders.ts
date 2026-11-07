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
   * requested batch item failed upstream), `timeout`, `free`, `replay`,
   * `unconfirmed`. Emitted only for zero-charge outcomes so a caller can tell
   * "free because there was no data" from "free by price".
   */
  zeroReason?: string;
  /** Deterministic ledger metering key for this logical request. */
  receipt?: string | null;
}

export const CREDIT_BILLING_HEADER_NAMES = [
  'X-Credit-Cost',
  'X-Credit-Balance',
  'X-Credit-Balance-After',
  'X-Credit-Status',
  'X-Credit-Zero-Reason',
  'X-Credit-Receipt',
  'X-Credit-Budget-Warning',
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
}
