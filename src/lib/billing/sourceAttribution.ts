/**
 * Funding-source attribution for credit charges.
 *
 * The wallet is one pooled balance: grants and top-ups add to it, usage
 * subtracts from it. `credit_ledger.source` used to be a constant (`wallet`),
 * which is false whenever a charge is actually paid out of a signup grant or a
 * subscription allowance. This module makes the ledger answer the only question
 * reconciliation asks: which bucket paid for this call.
 *
 * Model:
 *   - every positive-delta grant/top-up/refund row is a lot;
 *   - consumption is FIFO: the oldest unexhausted lot pays first;
 *   - a charge carries its per-lot allocation in `meta.allocations`;
 *   - the row-level `source` is the lot with the largest share.
 *
 * Nothing here changes the balance or `consume_credits`. Attribution is
 * audit-only, and it is read-derived: exhausted lots are recomputed from
 * `sum(lot amounts) - wallet balance`, which is exactly how much the ledger has
 * consumed so far. No new table, no backfill, no DDL.
 */

/** Uses the existing `credit_ledger_source_check` vocabulary. */
export type FundedBucket = 'free' | 'subscription' | 'wallet';

export type CreditLot = {
  /** `credit_ledger.id` of the grant/top-up/refund row. */
  lotId: number;
  amount: number;
  /** `null` when the grant predates source tracking (0126); never inferred. */
  source: FundedBucket | null;
};

export type LotAllocation = {
  lotId: number;
  source: FundedBucket | null;
  amount: number;
};

/**
 * Map a grant row's `source` to a usage bucket.
 *
 * `signup` grants are free credit, `subscription` grants are plan allowances,
 * and money-funded top-ups (`wallet` and the x402 acquisition path) are the
 * wallet bucket. Anything untagged stays `null`: inventing `free` for old rows
 * would rewrite history with today's rules.
 */
export function grantBucket(source: string | null | undefined): FundedBucket | null {
  switch (source) {
    case 'signup':
    case 'free':
      return 'free';
    case 'subscription':
      return 'subscription';
    case 'wallet':
    case 'x402':
      return 'wallet';
    default:
      return null;
  }
}

/**
 * Allocate `cost` across `lots` after `consumed` credits have already been
 * spent. Lots must be ordered oldest first. Rounds each allocation to two
 * decimals (the ledger's numeric(12,2) precision) while keeping the total
 * exactly equal to the allocated slice.
 */
export function allocateFifoLots(
  lots: readonly CreditLot[],
  consumed: number,
  cost: number
): LotAllocation[] {
  if (cost <= 0 || lots.length === 0) return [];

  let skip = Math.max(0, consumed);
  const allocations: LotAllocation[] = [];
  let remainingCost = round2(cost);

  for (const lot of lots) {
    if (remainingCost <= 0) break;
    if (skip >= lot.amount) {
      skip -= lot.amount;
      continue;
    }

    const available = lot.amount - skip;
    skip = 0;
    const amount = round2(Math.min(available, remainingCost));
    if (amount > 0) {
      allocations.push({ lotId: lot.lotId, source: lot.source, amount });
      remainingCost = round2(remainingCost - amount);
    }
  }

  return allocations;
}

/**
 * The row-level bucket: the single lot with the largest allocated share.
 * Ties keep the earlier (older) lot, matching the FIFO order.
 */
export function dominantLotSource(allocations: readonly LotAllocation[]): FundedBucket | null {
  let dominant: LotAllocation | null = null;
  for (const allocation of allocations) {
    if (dominant === null || allocation.amount > dominant.amount) dominant = allocation;
  }
  return dominant?.source ?? null;
}

/** Whether every credit in `cost` found a lot to land on. */
export function allocationCoversCost(
  allocations: readonly LotAllocation[],
  cost: number
): boolean {
  const allocated = allocations.reduce((total, allocation) => total + allocation.amount, 0);
  return round2(allocated) >= round2(cost);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
