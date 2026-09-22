import { getMlOutcomeMetrics } from '@/lib/api/services/mlOutcomeMetrics';
import { getModelStatus } from '@/lib/ml/inference';
import { createServiceRoleClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));
jest.mock('@/lib/ml/inference', () => ({
  ...jest.requireActual('@/lib/ml/inference'),
  getModelStatus: jest.fn(() => ({
    active: true,
    trainedAt: null,
    labelSpecVersion: 2,
    mediumThreshold: 0.25,
    highThreshold: 0.75,
  })),
}));

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;
const mockedGetModelStatus = getModelStatus as jest.MockedFunction<typeof getModelStatus>;

type Result = { data: unknown; error: unknown };

function makeChain(result: Result | ((start: number, end: number) => Result)) {
  const api: Record<string, (...args: unknown[]) => unknown> = {};
  let start = 0;
  let end = 999;
  for (const m of ['select', 'eq', 'gt', 'lt', 'lte', 'is', 'not', 'gte', 'order', 'update']) {
    api[m] = () => api;
  }
  api.range = (from: unknown, to: unknown) => {
    start = Number(from);
    end = Number(to);
    return api;
  };
  api.then = (resolve: (v: Result) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(typeof result === 'function' ? result(start, end) : result).then(
      resolve,
      reject
    );
  return api;
}

function row(asset: string, mlScore: number, label: boolean) {
  return {
    asset,
    ml_score: mlScore,
    outcome_label: label,
    outcome: { methodVersion: 2 },
  };
}

describe('mlOutcomeMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetModelStatus.mockReturnValue({
      active: true,
      trainedAt: null,
      metrics: {},
      horizons: ['6h'],
      horizonDetails: [],
      labelSpecVersion: 2,
      mediumThreshold: 0.25,
      highThreshold: 0.75,
    });
  });

  it('computes realized precision/recall buckets and rank AUC', async () => {
    // 8 labeled rows evaluated at the model-versioned 0.25 / 0.75 thresholds.
    const data = [
      row('ETH', 0.9, true),
      row('ETH', 0.8, true),
      row('BTC', 0.6, true),
      row('BTC', 0.5, false),
      row('ETH', 0.2, false),
      row('USDC', 0.1, false),
      row('USDC', 0.05, false),
      row('USDT', 0.3, false),
    ];
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data, error: null }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.errored).toBeUndefined();
    expect(m.labeled).toBe(8);
    expect(m.positives).toBe(3);
    expect(m.baseRate).toBe(0.375);
    // Perfect separation: every positive outscores every negative.
    expect(m.auc).toBe(1);

    const medium = m.buckets.find((b) => b.threshold === 0.25)!;
    expect(medium.n).toBe(5);
    expect(medium.positives).toBe(3);
    expect(medium.precision).toBe(0.6);
    expect(medium.recall).toBe(1);

    const hi = m.buckets.find((b) => b.threshold === 0.75)!;
    expect(hi.precision).toBe(1);
    expect(hi.recall).toBeCloseTo(2 / 3, 3);
  });

  it('splits metrics by asset class (stable vs volatile)', async () => {
    const data = [
      row('USDC', 0.9, true),
      row('USDC', 0.1, false),
      row('ETH', 0.9, false),
      row('BTC', 0.1, true),
    ];
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data, error: null }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.byClass.stable).not.toBeNull();
    expect(m.byClass.stable!.labeled).toBe(2);
    expect(m.byClass.stable!.positives).toBe(1);
    expect(m.byClass.stable!.auc).toBe(1); // perfect separation within class
    expect(m.byClass.volatile).not.toBeNull();
    expect(m.byClass.volatile!.labeled).toBe(2);
    expect(m.byClass.volatile!.auc).toBe(0); // the high score was a negative
  });

  it('assigns average ranks to tied positive and negative scores', async () => {
    const data = [row('ETH', 0.5, true), row('BTC', 0.5, false)];
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data, error: null }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.auc).toBe(0.5);
  });

  it('uses each horizon score, label, and operating threshold separately', async () => {
    mockedGetModelStatus.mockReturnValue({
      active: true,
      trainedAt: null,
      metrics: {},
      horizons: ['1h', '6h'],
      labelSpecVersion: 2,
      mediumThreshold: 0.01,
      highThreshold: 0.02,
      horizonDetails: [
        {
          name: '1h',
          verified: true,
          evalWindowHours: 1,
          auc: null,
          precision: null,
          recall: null,
          mediumThreshold: 0.01,
          highThreshold: 0.02,
        },
        {
          name: '6h',
          verified: true,
          evalWindowHours: 6,
          auc: null,
          precision: null,
          recall: null,
          mediumThreshold: 0.2,
          highThreshold: 0.8,
        },
      ],
    });
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({
          data: [
            {
              asset: 'ETH',
              ml_score: 0.9,
              ml_score_1h: 0.03,
              ml_score_6h: 0.9,
              outcome_label: true,
              outcome_label_1h: true,
              outcome_label_6h: true,
              outcome_1h: { methodVersion: 2 },
              outcome_6h: { methodVersion: 2 },
            },
            {
              asset: 'ETH',
              ml_score: 0.4,
              ml_score_1h: 0.015,
              ml_score_6h: 0.4,
              outcome_label: false,
              outcome_label_1h: false,
              outcome_label_6h: false,
              outcome_1h: { methodVersion: 2 },
              outcome_6h: { methodVersion: 2 },
            },
          ],
          error: null,
        }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.operatingThresholds.high).toBe(0.8);
    expect(m.buckets.find((bucket) => bucket.threshold === 0.8)?.n).toBe(1);
    expect(m.byHorizon['1h']?.operatingThresholds.high).toBe(0.02);
    expect(m.byHorizon['1h']?.buckets.find((bucket) => bucket.threshold === 0.02)?.n).toBe(1);
    expect(m.byHorizon['6h']?.labeled).toBe(2);
  });

  it('returns an empty (non-errored) result when there are no labeled rows', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: [], error: null }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.labeled).toBe(0);
    expect(m.auc).toBeNull();
    expect(m.byClass.stable).toBeNull();
    expect(m.byClass.volatile).toBeNull();
  });

  it('excludes labels produced by the old incomplete-window method', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain({
          data: [{ asset: 'ETH', ml_score: 0.9, outcome_label: true, outcome: {} }],
          error: null,
        }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.labeled).toBe(0);
    expect(m.byHorizon['6h']).toBeNull();
  });

  it('includes labeled checks after the first PostgREST page', async () => {
    const firstPage = Array.from({ length: 1_000 }, () => row('ETH', 0.2, false));
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain((start) => ({
          data: start === 0 ? firstPage : [row('ETH', 0.9, true)],
          error: null,
        })),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.errored).toBeUndefined();
    expect(m.labeled).toBe(1_001);
    expect(m.positives).toBe(1);
  });

  it('does not report partial metrics when a later page fails', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () =>
        makeChain((start) =>
          start === 0
            ? { data: Array.from({ length: 1_000 }, () => row('ETH', 0.9, true)), error: null }
            : { data: null, error: { message: 'page unavailable' } }
        ),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.errored).toBe(true);
    expect(m.labeled).toBe(0);
  });

  it('degrades to errored:true when the query fails', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: null, error: { message: 'boom' } }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.errored).toBe(true);
    expect(m.labeled).toBe(0);
  });
});
