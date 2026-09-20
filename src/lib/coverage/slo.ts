export interface CoverageSloCounts {
  expected: number;
  observed: number;
  data_ready: number;
  signed_ready: number;
  unavailable: number;
  missing: number;
  objective_bps: number;
}

/** Missing samples consume budget; an empty window is not 100% availability. */
export function summarizeCoverageSlo(c: CoverageSloCounts) {
  const values = [c.expected, c.observed, c.data_ready, c.signed_ready, c.unavailable, c.missing];
  if (
    values.some((v) => !Number.isSafeInteger(v) || v < 0) ||
    c.observed > c.expected ||
    c.data_ready > c.observed ||
    c.signed_ready > c.data_ready ||
    c.unavailable + c.data_ready > c.observed ||
    c.missing !== c.expected - c.observed ||
    !Number.isSafeInteger(c.objective_bps) ||
    c.objective_bps < 1 ||
    c.objective_bps >= 10000
  )
    throw new TypeError('Invalid SLO counts');
  const bad = c.expected - c.data_ready;
  const budget = (c.expected * (10000 - c.objective_bps)) / 10000;
  return {
    ...c,
    dataReadyPct: c.expected ? (c.data_ready / c.expected) * 100 : null,
    signedReadyPct: c.expected ? (c.signed_ready / c.expected) * 100 : null,
    observationPct: c.expected ? (c.observed / c.expected) * 100 : null,
    remainingErrorBudgetSlots: c.expected ? budget - bad : null,
    burnRate: c.expected ? bad / budget : null,
    signedStatus: !c.expected
      ? 'WARMING_UP'
      : c.expected - c.signed_ready > budget
        ? 'BELOW_OBJECTIVE'
        : 'HEALTHY',
    status: !c.expected
      ? 'WARMING_UP'
      : c.missing
        ? 'MEASUREMENT_GAP'
        : bad > budget
          ? 'BELOW_OBJECTIVE'
          : 'HEALTHY',
  };
}
