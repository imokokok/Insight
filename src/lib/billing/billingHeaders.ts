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
  /** Deterministic ledger metering key for this logical request. */
  receipt?: string | null;
}

export const CREDIT_BILLING_HEADER_NAMES = [
  'X-Credit-Cost',
  'X-Credit-Balance',
  'X-Credit-Balance-After',
  'X-Credit-Status',
  'X-Credit-Receipt',
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
  if (input.receipt) {
    headers.set('X-Credit-Receipt', input.receipt);
  }
}
