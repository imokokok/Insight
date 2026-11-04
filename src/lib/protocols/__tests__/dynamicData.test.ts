import {
  getAllProtocolsWithDynamicData,
  resetDynamicDataCacheForTests,
} from '@/lib/protocols/dynamicData';
import { createServiceRoleClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

type QueryResult = { data: unknown; error: { message: string } | null };

function makeQuery(result: Promise<QueryResult>) {
  const query: {
    select: jest.Mock;
    in: jest.Mock;
    abortSignal: jest.Mock;
  } = {
    select: jest.fn(),
    in: jest.fn(),
    abortSignal: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.abortSignal.mockReturnValue(result);
  return query;
}

describe('dynamic protocol data cache', () => {
  beforeEach(() => {
    resetDynamicDataCacheForTests();
    jest.clearAllMocks();
  });

  it('coalesces a concurrent all-protocol cache miss into one pair of database reads', async () => {
    let resolveMetrics!: (value: QueryResult) => void;
    let resolveRiskParams!: (value: QueryResult) => void;
    const metrics = new Promise<QueryResult>((resolve) => {
      resolveMetrics = resolve;
    });
    const riskParams = new Promise<QueryResult>((resolve) => {
      resolveRiskParams = resolve;
    });
    const from = jest.fn((table: string) =>
      makeQuery(table === 'protocol_metrics' ? metrics : riskParams)
    );
    jest.mocked(createServiceRoleClient).mockReturnValue({ from } as never);

    const first = getAllProtocolsWithDynamicData();
    const second = getAllProtocolsWithDynamicData();

    expect(from).toHaveBeenCalledTimes(2);
    resolveMetrics({ data: [], error: null });
    resolveRiskParams({ data: [], error: null });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toHaveLength(secondResult.length);
    expect(from).toHaveBeenCalledTimes(2);

    await getAllProtocolsWithDynamicData();
    expect(from).toHaveBeenCalledTimes(2);
  });
});
