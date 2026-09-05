import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { reputationService } from '@/lib/oracles/services/reputationService';

import { GET, runReputationCalculation } from '../route';

jest.mock('@/lib/api/cronAuth', () => ({
  verifyCronSecret: jest.fn(),
}));

jest.mock('@/lib/oracles/services/reputationService', () => ({
  reputationService: { calculateAndStore: jest.fn() },
}));

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

const mockedVerify = verifyCronSecret as jest.MockedFunction<typeof verifyCronSecret>;
const mockedCalculate = reputationService.calculateAndStore as jest.MockedFunction<
  typeof reputationService.calculateAndStore
>;

describe('reputation cron pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the same successful pipeline to scripts and the HTTP fallback', async () => {
    mockedCalculate.mockResolvedValue({ total: 10, success: 9, failed: 1 });

    await expect(runReputationCalculation()).resolves.toEqual({
      status: 200,
      body: {
        success: true,
        data: { total: 10, success: 9, failed: 1 },
        message: 'Cron calculation complete: 9/10 successful',
      },
    });
  });

  it('keeps the HTTP fallback protected by the cron secret', async () => {
    mockedVerify.mockReturnValue(new NextResponse('unauthorized', { status: 401 }));

    const response = await GET(new Request('https://www.oracleinsight.xyz/api/cron/reputation'));

    expect(response.status).toBe(401);
    expect(mockedCalculate).not.toHaveBeenCalled();
  });

  it('returns a failing status to make GitHub Actions fail visibly', async () => {
    mockedCalculate.mockRejectedValue(new Error('provider outage'));

    await expect(runReputationCalculation()).resolves.toEqual({
      status: 500,
      body: { success: false, error: 'Calculation failed' },
    });
  });
});
