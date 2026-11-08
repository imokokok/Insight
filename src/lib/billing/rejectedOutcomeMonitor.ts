/**
 * Observability for refusal billing:
 *
 *   - `billable`   — a rejected verdict carrying all five evidence items. It is
 *     sold as the refusal conclusion.
 *   - `downgraded` — a rejected verdict missing evidence. The gate demotes it
 *     to `unavailable` and waives the charge; early-stage these are pure loss
 *     and must be visible in scale.
 *
 * Counters are process-local and exported for tests/ops; the log lines carry
 * distinct `event` names so a log pipeline can aggregate the same two buckets.
 */

import { createLogger } from '@/lib/utils/logger';

export type RejectedOutcomeSurface = 'mcp' | 'x402';
export type RejectedOutcomeKind = 'billable' | 'downgraded';

const logger = createLogger('rejected-outcome');

const counters: Record<RejectedOutcomeKind, number> = {
  billable: 0,
  downgraded: 0,
};

export function recordRejectedOutcome(input: {
  surface: RejectedOutcomeSurface;
  tool: string;
  kind: RejectedOutcomeKind;
  missingEvidence?: readonly string[];
  reasonCode?: string | null;
}): void {
  counters[input.kind] += 1;
  const fields = {
    event: `rejected.${input.kind}`,
    surface: input.surface,
    tool: input.tool,
    reasonCode: input.reasonCode ?? null,
    missingEvidence: input.missingEvidence ?? [],
    billableRejected: counters.billable,
    downgradedRejected: counters.downgraded,
  };
  if (input.kind === 'billable') {
    logger.info('Rejected verdict is billable: all five evidence items present', fields);
  } else {
    logger.warn('Rejected outcome downgraded to unavailable: incomplete evidence', fields);
  }
}

export function getRejectedOutcomeCounts(): Record<RejectedOutcomeKind, number> {
  return { ...counters };
}

export function resetRejectedOutcomeCounts(): void {
  counters.billable = 0;
  counters.downgraded = 0;
}
