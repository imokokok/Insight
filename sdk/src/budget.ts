/** Published credit defaults; callers can override these when their contract differs. */
export const DEFAULT_WORKFLOW_CREDITS = {
  preTrade: 5,
  assessmentPair: 10,
  executionReceipt: 10,
  watchFeed: 5,
} as const;

export function estimateWorkflowBudget(input: {
  balance: number;
  feedCount: number;
  intervalMs: number;
  creditsPerFeed?: number;
  reserveCredits?: number;
  now?: number;
}) {
  const cost = input.creditsPerFeed ?? DEFAULT_WORKFLOW_CREDITS.watchFeed;
  const reserve = input.reserveCredits ?? 0;
  if (
    ![input.balance, cost, reserve].every((v) => Number.isFinite(v) && v >= 0) ||
    !Number.isSafeInteger(input.feedCount) ||
    input.feedCount < 1 ||
    !Number.isFinite(input.intervalMs) ||
    input.intervalMs <= 0
  )
    throw new TypeError(
      'Budget inputs must be finite non-negative amounts, a positive feed count and cadence.'
    );
  const creditsPerCycle = input.feedCount * cost;
  const available = Math.max(0, input.balance - reserve);
  const remainingCycles = creditsPerCycle === 0 ? null : Math.floor(available / creditsPerCycle);
  const projectedDurationMs = remainingCycles == null ? null : remainingCycles * input.intervalMs;
  return {
    creditsPerCycle,
    creditsPerDay: (creditsPerCycle * 86_400_000) / input.intervalMs,
    creditsPerWeek: (creditsPerCycle * 604_800_000) / input.intervalMs,
    remainingCycles,
    projectedDurationMs,
    projectedExhaustionAt:
      projectedDurationMs == null ? null : (input.now ?? Date.now()) + projectedDurationMs,
    canAffordNextCycle: available >= creditsPerCycle,
    basis: 'estimate_before_request_balance_snapshot' as const,
    assumptions: [
      'Successful BLOCK assessments may be charged.',
      'Concurrent usage and retries can change this estimate.',
      'No automatic recharge or execution is performed.',
    ],
  };
}
