/** @jest-environment node */
import { NextRequest } from 'next/server';

import { reportService } from '@/lib/reports/reportService';

import { GET } from '../route';

jest.mock('@/lib/api/handler', () => ({
  createApiHandler: (handler: unknown) => handler,
}));

jest.mock('@/lib/reports/reportService', () => ({
  reportService: { listReportSummaries: jest.fn() },
}));

const mockedList = reportService.listReportSummaries as jest.MockedFunction<
  typeof reportService.listReportSummaries
>;

describe('GET /api/reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not let browsers or the CDN retain a stale archive', async () => {
    mockedList.mockResolvedValue([]);

    const response = await (
      GET as unknown as (request: NextRequest, context: unknown) => Promise<Response>
    )(new NextRequest('https://www.oracleinsight.xyz/api/reports?limit=5'), {
      requestId: 'test',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store, must-revalidate');
    expect(mockedList).toHaveBeenCalledWith(5, 0);
  });
});
