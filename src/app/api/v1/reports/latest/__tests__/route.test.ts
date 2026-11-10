/** @jest-environment node */

/**
 * Tests for the public /api/v1/reports/latest endpoint: latest-report
 * resolution (today first, then walking back), age reporting, and the 404
 * contract when no report has been published within the lookback window.
 */

import { NextRequest } from 'next/server';

const mockGetReportByDate = jest.fn();

jest.mock('@/lib/api/handler', () => ({
  createApiHandler:
    (handler: (request: NextRequest, context: unknown) => unknown) =>
    async (request: NextRequest, context: unknown) =>
      handler(request, { ...(context as object), validated: {} }),
  createOptionsHandler: () => jest.fn(),
  ApiResponseBuilder: {
    success: (data: unknown) => ({ success: true, data }),
    error: (code: string, message: string, details?: unknown) => ({
      success: false,
      code,
      message,
      details,
    }),
  },
}));

jest.mock('@/lib/reports/reportService', () => ({
  reportService: { getReportByDate: mockGetReportByDate },
}));

jest.mock('@/lib/utils/date', () => ({
  // Fixed "today" so the lookback walk is deterministic.
  getTodayUtc: () => '2026-11-11',
}));

const reportFor = (date: string) => ({
  reportDate: date,
  reportTitle: `Daily report ${date}`,
  summary: 'ok',
  recommendations: [],
  metrics: {},
  topAssets: [],
  providerRankings: [],
  deviationEvents: [],
  anomalySummary: { total: 0, bySeverity: {}, byProvider: {} },
});

async function callGet(): Promise<Response> {
  const { GET } = await import('../route');
  return (GET as unknown as (request: NextRequest, context: unknown) => Promise<Response>)(
    new NextRequest('https://test/api/v1/reports/latest'),
    { requestId: 'test' }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

it("serves today's report with ageDays=0", async () => {
  mockGetReportByDate.mockImplementation(async (date: string) =>
    date === '2026-11-11' ? reportFor(date) : null
  );

  const response = await callGet();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.reportDate).toBe('2026-11-11');
  expect(body.data.ageDays).toBe(0);
  expect(mockGetReportByDate).toHaveBeenCalledTimes(1);
});

it('walks back to the newest published report when today is missing', async () => {
  mockGetReportByDate.mockImplementation(async (date: string) =>
    date === '2026-11-09' ? reportFor(date) : null
  );

  const response = await callGet();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.reportDate).toBe('2026-11-09');
  expect(body.data.ageDays).toBe(2);
  expect(mockGetReportByDate).toHaveBeenCalledTimes(3);
});

it('returns a retryable 404 when nothing was published within the lookback window', async () => {
  mockGetReportByDate.mockResolvedValue(null);

  const response = await callGet();
  expect(response.status).toBe(404);
  expect(mockGetReportByDate).toHaveBeenCalledTimes(8); // today + 7 lookback days
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
