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
 * (select/eq/gt/lt/lte/is/order/range/limit/update) is a no-op returning the chain,
 * so the service code runs unchanged against canned data.
 */
function makeChain(result: Result, expandSnapshots = true, extraPages: Result[] = []) {
  const api: Record<string, (...args: unknown[]) => unknown> = {};
  let offset = 0;
  const data =
    expandSnapshots && Array.isArray(result.data)
      ? result.data.flatMap((row) =>
          row && typeof row === 'object' && 'price' in row
            ? [
                { ...row, provider: 'oracle-a' },
                { ...row, provider: 'oracle-b' },
              ]
            : [row]
        )
      : result.data;
  for (const m of ['select', 'eq', 'gt', 'lt', 'lte', 'is', 'order', 'limit', 'update']) {
    api[m] = () => api;
  }
  api.range = (from: unknown) => {
    offset = Number(from);
    return api;
  };
  api.then = (resolve: (v: Result) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(
      offset === 0
        ? { ...result, data }
        : (extraPages[Math.floor(offset / 1_000) - 1] ?? { data: [], error: null })
    ).then(resolve, reject);
  return api;
}

/** Snapshot row at hour offset `h` (relative to check time). */
function snap(
  h: number,
  price: number | null,
  deviation = 0.5
): {
  snapshot_hour: string;
  price: number | null;
  consensus_price: number | null;
  deviation_pct: number | null;
} {
  const t = new Date('2026-01-01T00:00:00Z').getTime() + h * 3600_000;
  return {
    snapshot_hour: new Date(t).toISOString(),
    price,
    consensus_price: price,
    deviation_pct: deviation,
  };
}

function fineSnap(minutes: number, price: number | null, deviation = 0.5) {
  const t = new Date(CHECK_AT).getTime() + minutes * 60_000;
  return {
    snapshot_ts: new Date(t).toISOString(),
    price,
    consensus_price: price,
    deviation_pct: deviation,
  };
}

function completeFineWindow(hours: number, price = 1860) {
  return Array.from({ length: hours * 4 + 2 }, (_, i) => fineSnap((i - 1) * 15, price));
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

  it('uses the median raw provider price rather than a stored consensus value', async () => {
    const fine = completeFineWindow(1, 100).flatMap((row) =>
      ['oracle-a', 'oracle-b'].map((provider) => ({
        ...row,
        provider,
        consensus_price: new Date(row.snapshot_ts) > new Date(CHECK_AT) ? 150 : 100,
      }))
    );
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({ data: table === 'price_snapshots' ? fine : [], error: null }, false),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT, 1);
    expect(outcome?.label).toBe(false);
    expect(outcome?.maxPriceMovePct).toBe(0);
  });

  it('does not let one price outlier move the three-provider median', async () => {
    const fine = completeFineWindow(1, 100).flatMap((row) =>
      ['oracle-a', 'oracle-b', 'oracle-c'].map((provider) => ({
        ...row,
        provider,
        price:
          provider === 'oracle-c' && row.snapshot_ts === fineSnap(30, 100).snapshot_ts ? 130 : 100,
      }))
    );
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({ data: table === 'price_snapshots' ? fine : [], error: null }, false),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT, 1);
    expect(outcome?.label).toBe(false);
    expect(outcome?.maxPriceMovePct).toBe(0);
  });

  it('uses the check-time price instead of an hourly row overwritten later', async () => {
    const futureFine = completeFineWindow(1, 100).filter(
      (row) => new Date(row.snapshot_ts) > new Date(CHECK_AT)
    );
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({
          data:
            table === 'price_snapshots'
              ? futureFine
              : table === 'hourly_price_snapshots'
                ? [snap(0, 130), snap(1, 100)]
                : [],
          error: null,
        }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT, 1, 100);
    expect(outcome?.baselinePrice).toBe(100);
    expect(outcome?.label).toBe(false);
    expect(outcome?.maxPriceMovePct).toBe(0);
    expect(await computeOutcome('ETH', CHECK_AT, 1)).toBeNull();
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
      from: (table: string) =>
        makeChain({
          data:
            table === 'price_snapshots'
              ? completeFineWindow(6)
              : table === 'hourly_price_snapshots'
                ? [snap(-1, 1860), snap(1, 1862, 0.4), snap(2, 1861, 0.3), snap(6, 1860)]
                : [],
          error: null,
        }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT);

    expect(outcome).not.toBeNull();
    expect(outcome!.label).toBe(false);
    expect(outcome!.evidence).toHaveLength(0);
  });

  it('does not label an incomplete benign window as negative', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({
          data:
            table === 'price_snapshots'
              ? [fineSnap(-15, 1860), fineSnap(15, 1860), fineSnap(30, 1860)]
              : table === 'hourly_price_snapshots'
                ? [snap(-1, 1860), snap(1, 1860)]
                : [],
          error: null,
        }),
    } as never);

    expect(await computeOutcome('ETH', CHECK_AT, 6)).toBeNull();
  });

  it('does not label a benign window with a missing 15-minute slot as negative', async () => {
    const fine = completeFineWindow(1).filter(
      (row) =>
        row.snapshot_ts !== new Date(new Date(CHECK_AT).getTime() + 30 * 60_000).toISOString()
    );
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({ data: table === 'price_snapshots' ? fine : [], error: null }),
    } as never);

    expect(await computeOutcome('ETH', CHECK_AT, 1)).toBeNull();
  });

  it('does not label a benign window without a pre-check baseline as negative', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({
          data: table === 'price_snapshots' ? completeFineWindow(1).slice(2) : [],
          error: null,
        }),
    } as never);

    expect(await computeOutcome('ETH', CHECK_AT, 1)).toBeNull();
  });

  it('does not treat single-provider observations as complete coverage', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain(
          {
            data:
              table === 'price_snapshots'
                ? completeFineWindow(1).map((row) => ({ ...row, provider: 'oracle-a' }))
                : [],
            error: null,
          },
          false
        ),
    } as never);

    expect(await computeOutcome('ETH', CHECK_AT, 1)).toBeNull();
  });

  it('deduplicates a provider across chains before checking for an incident', async () => {
    const fine = completeFineWindow(1).flatMap((row) => [
      { ...row, provider: 'oracle-a', data_age_seconds: 0 },
      { ...row, provider: 'oracle-b', data_age_seconds: 0 },
    ]);
    fine.push({
      ...fineSnap(30, 1860, 9),
      provider: 'oracle-a',
      data_age_seconds: 999,
    });
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({ data: table === 'price_snapshots' ? fine : [], error: null }, false),
    } as never);

    expect((await computeOutcome('ETH', CHECK_AT, 1))?.label).toBe(false);
  });

  it('uses a between-hour incident for the 6h outcome', async () => {
    const fine = completeFineWindow(6);
    fine[3] = fineSnap(30, 1860, 9);
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({
          data:
            table === 'price_snapshots'
              ? fine
              : table === 'hourly_price_snapshots'
                ? [snap(-1, 1860), snap(1, 1860), snap(2, 1860), snap(6, 1860)]
                : [],
          error: null,
        }),
    } as never);

    expect((await computeOutcome('ETH', CHECK_AT, 6))?.label).toBe(true);
  });

  it('reads a fine-snapshot incident on the second database page', async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => ({
      ...fineSnap(15, 100),
      provider: `oracle-${index % 2}`,
    }));
    const secondPage = ['oracle-a', 'oracle-b'].map((provider) => ({
      ...fineSnap(30, 110),
      provider,
    }));
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        table === 'price_snapshots'
          ? makeChain({ data: firstPage, error: null }, false, [{ data: secondPage, error: null }])
          : makeChain({ data: [], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT, 1, 100);
    expect(outcome?.label).toBe(true);
    expect(outcome?.maxPriceMovePct).toBe(10);
  });

  it('does not label from a truncated snapshot read', async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => ({
      ...fineSnap(15, 100),
      provider: `oracle-${index % 2}`,
    }));
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        table === 'price_snapshots'
          ? makeChain({ data: firstPage, error: null }, false, [
              { data: null, error: { message: 'second page unavailable' } },
            ])
          : makeChain({ data: [], error: null }),
    } as never);

    expect(await computeOutcome('ETH', CHECK_AT, 1, 100)).toBeNull();
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
    expect(outcome!.labelSpecVersion).toBe(OUTCOME_THRESHOLDS.labelSpecVersion);
    expect(outcome!.methodVersion).toBe(OUTCOME_THRESHOLDS.methodVersion);
  });

  it('uses the 15-minute spine for the 1h outcome', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        table === 'price_snapshots'
          ? makeChain({
              data: [fineSnap(-15, 100), fineSnap(30, 100, 9), fineSnap(60, 100)],
              error: null,
            })
          : makeChain({ data: [], error: null }),
    } as never);

    const outcome = await computeOutcome('ETH', CHECK_AT, 1);
    expect(outcome?.label).toBe(true);
    expect(outcome?.maxDeviationPct).toBe(9);
  });

  it('excludes Track-B (null, not zero) when the reference layer has no coverage', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) =>
        makeChain({
          data: table === 'price_snapshots' ? completeFineWindow(6) : [],
          error: null,
        }),
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
        if (table === 'price_snapshots') {
          return makeChain({
            data: [fineSnap(-15, 1860), fineSnap(30, 1960), fineSnap(60, 1960)],
            error: null,
          });
        }
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
        if (table === 'hourly_price_snapshots' || table === 'price_snapshots') {
          return makeChain({ data: [], error: null });
        }
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
    expect(preTradeCall).toBe(2); // older than retry window: finalized as unknown
  });

  it('retries a recent incomplete window instead of finalizing it', async () => {
    let preTradeCall = 0;
    const recentCheck = new Date(Date.now() - 7 * 3600_000).toISOString();
    mockedCreateServiceRoleClient.mockReturnValue({
      from: (table: string) => {
        if (table !== 'pre_trade_checks') return makeChain({ data: [], error: null });
        preTradeCall += 1;
        return makeChain({
          data: [{ id: 'row-retry', asset: 'ETH', chain_id: 1, created_at: recentCheck }],
          error: null,
        });
      },
    } as never);

    const summary = await backfillOutcomes();

    expect(summary.scanned).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.labeled).toBe(0);
    expect(preTradeCall).toBe(1); // no UPDATE: next cron can try again
  });

  it('returns an empty summary when there are no pending rows', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [], error: null }),
    } as never);

    const summary = await backfillOutcomes();
    expect(summary).toEqual({ scanned: 0, labeled: 0, positive: 0, skipped: 0, errors: 0 });
  });
});
