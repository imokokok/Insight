import {
  backfillOutcomes,
  computeOutcome,
  OUTCOME_THRESHOLDS,
} from '@/lib/api/services/safetyOutcomeService';
import { createServiceRoleClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

type Result = { data: unknown; error: unknown };

/**
 * A minimal thenable chain that resolves to `result`. Every chainable method
 * (select/eq/gt/lt/lte/is/order/limit/update) is a no-op returning the chain,
 * so the service code runs unchanged against canned data.
 */
function makeChain(result: Result) {
  const api: Record<string, (...args: unknown[]) => unknown> = {};
  const thenable = Promise.resolve(result);
  for (const m of ['select', 'eq', 'gt', 'lt', 'lte', 'is', 'order', 'limit', 'update']) {
    api[m] = () => api;
  }
  api.then = (resolve: (v: Result) => void, reject?: (e: unknown) => void) =>
    thenable.then(resolve, reject);
  return api;
}

/** Snapshot row at hour offset `h` (relative to check time). */
function snap(
  h: number,
  price: number | null,
  deviation = 0.5
): {
  snapshot_hour: string;
  consensus_price: number | null;
  deviation_pct: number | null;
} {
  const t = new Date('2026-01-01T00:00:00Z').getTime() + h * 3600_000;
  return {
    snapshot_hour: new Date(t).toISOString(),
    consensus_price: price,
    deviation_pct: deviation,
  };
}

const CHECK_AT = '2026-01-01T00:00:00Z';

describe('safetyOutcomeService — computeOutcome', () => {
  afterEach(() => jest.clearAllMocks());

  it('labels POSITIVE when the consensus price moves >= priceMovePct in the window', async () => {
    // Baseline 1860 at h=-1; window climbs to 1960 at h=2 → ~5.4% move (>= 5%).
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({ data: [snap(-1, 1860), snap(1, 1900), snap(2, 1960, 1.0)], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);

    expect(outcome).not.toBeNull();
    expect(outcome!.label).toBe(true);
    expect(outcome!.baselinePrice).toBe(1860);
    expect(outcome!.maxPriceMovePct).toBeGreaterThanOrEqual(OUTCOME_THRESHOLDS.priceMovePct);
    expect(outcome!.evidence.length).toBeGreaterThan(0);
  });

  it('labels POSITIVE when cross-oracle deviation spikes even if price is stable', async () => {
    // Price flat at 1860, but deviation hits 9% (>= 8%) — a manipulation signal.
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({ data: [snap(-1, 1860), snap(1, 1860, 9.0), snap(2, 1860, 1.0)], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);

    expect(outcome).not.toBeNull();
    expect(outcome!.label).toBe(true);
    expect(outcome!.maxDeviationPct).toBeGreaterThanOrEqual(OUTCOME_THRESHOLDS.deviationPct);
    expect(outcome!.maxPriceMovePct).toBeLessThan(OUTCOME_THRESHOLDS.priceMovePct);
  });

  it('labels NEGATIVE when price and deviation stay benign', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({ data: [snap(-1, 1860), snap(1, 1862, 0.4), snap(2, 1861, 0.3)], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);

    expect(outcome).not.toBeNull();
    expect(outcome!.label).toBe(false);
    expect(outcome!.evidence).toHaveLength(0);
  });

  it('returns null when no snapshot data is available for the window', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);
    expect(outcome).toBeNull();
  });

  it('returns null on a query error (non-blocking)', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: null, error: { message: 'boom' } }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);
    expect(outcome).toBeNull();
  });

  it('labels POSITIVE on Track-B oracle-vs-market divergence (label spec v2)', async () => {
    // Consensus flat at 1860 (no price move, no deviation spike) — but the CEX
    // reference drops to ~1785 → 4.2% divergence: the blind-spot case Track A
    // cannot see, which Track B must catch.
    const snapRows = [snap(-1, 1860), snap(1, 1861, 0.4), snap(2, 1860, 0.3)];
    const refRows = [
      {
        ref_hour: new Date(new Date(CHECK_AT).getTime() + 3600_000).toISOString(),
        ref_price: 1785,
      },
      {
        ref_hour: new Date(new Date(CHECK_AT).getTime() + 2 * 3600_000).toISOString(),
        ref_price: 1786,
      },
    ];
    mockedCreateServiceRoleClient.mockReturnValue({
      from: jest.fn((table: string) =>
        table === 'market_reference_hourly'
          ? makeChain({ data: refRows, error: null })
          : makeChain({ data: snapRows, error: null })
      ),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);

    expect(outcome).not.toBeNull();
    expect(outcome!.label).toBe(true);
    expect(outcome!.maxMarketDivergencePct).toBeGreaterThanOrEqual(
      OUTCOME_THRESHOLDS.marketDivergencePct
    );
    expect(outcome!.maxPriceMovePct).toBeLessThan(OUTCOME_THRESHOLDS.priceMovePct);
    expect(outcome!.maxDeviationPct).toBeLessThan(OUTCOME_THRESHOLDS.deviationPct);
    expect(outcome!.evidence.some((e) => e.includes('Oracle-vs-market divergence'))).toBe(true);
  });

  it('excludes Track-B (null, not zero) when the reference layer has no coverage', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [snap(-1, 1860), snap(1, 1861, 0.4)], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);

    expect(outcome).not.toBeNull();
    expect(outcome!.maxMarketDivergencePct).toBeNull();
    // With no price move, no deviation spike and no reference → negative label.
    expect(outcome!.label).toBe(false);
  });
});

describe('safetyOutcomeService — backfillOutcomes', () => {
  afterEach(() => jest.clearAllMocks());

  it('labels pending rows and reports a positive when the outcome is abnormal', async () => {
    // pre_trade_checks: 1st call = SELECT pending row; later calls = UPDATEs (succeed).
    // hourly_price_snapshots: a window with a >=5% move → positive label.
    let preTradeCall = 0;
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'hourly_price_snapshots') {
          return makeChain({
            data: [snap(-1, 1860), snap(1, 1900), snap(2, 1960, 1.0)],
            error: null,
          });
        }
        preTradeCall += 1;
        const result: Result =
          preTradeCall === 1
            ? {
                data: [{ id: 'row-1', asset: 'ETH', chain_id: 1, created_at: CHECK_AT }],
                error: null,
              }
            : { data: null, error: null };
        return makeChain(result);
      },
    } as never);

    const summary = await backfillOutcomes();

    expect(summary.scanned).toBe(1);
    expect(summary.labeled).toBe(1);
    expect(summary.positive).toBe(1);
    expect(summary.errors).toBe(0);
  });

  it('skips (marks evaluated, null label) when no snapshot data exists', async () => {
    let preTradeCall = 0;
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table === 'hourly_price_snapshots') return makeChain({ data: [], error: null });
        preTradeCall += 1;
        const result: Result =
          preTradeCall === 1
            ? {
                data: [{ id: 'row-2', asset: 'RARE', chain_id: 1, created_at: CHECK_AT }],
                error: null,
              }
            : { data: null, error: null };
        return makeChain(result);
      },
    } as never);

    const summary = await backfillOutcomes();

    expect(summary.scanned).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.labeled).toBe(0);
  });

  it('returns an empty summary when there are no pending rows', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [], error: null }),
    } as never);

    const summary = await backfillOutcomes();
    expect(summary).toEqual({ scanned: 0, labeled: 0, positive: 0, skipped: 0, errors: 0 });
  });
});
