import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { updateAllFeedStalenessBaselines } from '@/lib/oracles/feedCadence';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { GET } from '../route';

jest.mock('@/lib/api/cronAuth', () => ({
  verifyCronSecret: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/oracles/feedCadence', () => ({
  updateAllFeedStalenessBaselines: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockedVerify = verifyCronSecret as jest.Mock;
const mockedUpdate = updateAllFeedStalenessBaselines as jest.Mock;
const mockedClient = createServiceRoleClient as jest.Mock;

function makeRequest() {
  return new Request('http://localhost/api/cron/feed-cadence');
}

describe('GET /api/cron/feed-cadence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClient.mockReturnValue({} as never);
  });

  it('rejects requests without a valid cron secret', async () => {
    mockedVerify.mockReturnValue(new NextResponse('unauthorized', { status: 401 }));

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(updateAllFeedStalenessBaselines).not.toHaveBeenCalled();
  });

  it('runs the baseline backfill and returns the updated count', async () => {
    mockedVerify.mockReturnValue(null);
    mockedUpdate.mockResolvedValue(42);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockedClient).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith({});
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.updated).toBe(42);
  });

  it('returns 500 when the backfill throws', async () => {
    mockedVerify.mockReturnValue(null);
    mockedUpdate.mockRejectedValue(new Error('db down'));

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
