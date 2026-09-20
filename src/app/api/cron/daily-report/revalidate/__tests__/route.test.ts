/** @jest-environment node */
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';

import { POST } from '../route';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/api/cronAuth', () => ({
  verifyCronSecret: jest.fn(),
}));

const mockedVerify = verifyCronSecret as jest.MockedFunction<typeof verifyCronSecret>;

function makeRequest() {
  return new Request('https://www.oracleinsight.xyz/api/cron/daily-report/revalidate', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-secret' },
  });
}

describe('POST /api/cron/daily-report/revalidate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthorised invalidation attempts', async () => {
    mockedVerify.mockReturnValue(new NextResponse('unauthorized', { status: 401 }));

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('immediately expires the report data and route caches', async () => {
    mockedVerify.mockReturnValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store, must-revalidate');
    await expect(response.json()).resolves.toEqual({
      success: true,
      revalidated: ['daily-reports'],
    });
    expect(revalidateTag).toHaveBeenCalledWith('daily-reports', { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledWith('/reports');
  });
});
