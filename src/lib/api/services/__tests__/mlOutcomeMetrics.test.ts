import { getMlOutcomeMetrics } from '@/lib/api/services/mlOutcomeMetrics';
import { createServiceRoleClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockedCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

type Result = { data: unknown; error: unknown };

function makeChain(result: Result) {
  const api: Record<string, (...args: unknown[]) => unknown> = {};
  const thenable = Promise.resolve(result);
  for (const m of [
    'select',
    'eq',
    'gt',
    'lt',
    'lte',
    'is',
    'not',
    'gte',
    'order',
    'limit',
    'update',
  ]) {
    api[m] = () => api;
  }
  api.then = (resolve: (v: Result) => void, reject?: (e: unknown) => void) =>
    thenable.then(resolve, reject);
  return api;
}

function row(asset: string, mlScore: number, label: boolean) {
  return { asset, ml_score: mlScore, outcome_label: label };
}

describe('mlOutcomeMetrics', () => {
  afterEach(() => jest.clearAllMocks());

  it('computes realized precision/recall buckets and rank AUC', async () => {
    // 8 labeled rows: every row with score >= 0.5 is a true positive.
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

    const half = m.buckets.find((b) => b.threshold === 0.5)!;
    expect(half.n).toBe(4);
    expect(half.positives).toBe(3);
    expect(half.precision).toBe(0.75);
    expect(half.recall).toBe(1);

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

  it('degrades to errored:true when the query fails', async () => {
    mockedCreateServiceRoleClient.mockReturnValue({
      from: () => makeChain({ data: null, error: { message: 'boom' } }),
    } as never);

    const m = await getMlOutcomeMetrics(24);

    expect(m.errored).toBe(true);
    expect(m.labeled).toBe(0);
  });
});
