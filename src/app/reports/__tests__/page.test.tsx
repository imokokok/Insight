/** @jest-environment node */

import { reportService } from '@/lib/reports/reportService';

import ReportsPage from '../page';

jest.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}));

jest.mock('@/lib/reports/reportService', () => ({
  reportService: { listReportSummaries: jest.fn() },
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ warn: jest.fn() }),
}));

jest.mock('../ReportsContent', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedList = reportService.listReportSummaries as jest.MockedFunction<
  typeof reportService.listReportSummaries
>;

describe('ReportsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the archive shell when the report store is temporarily unavailable', async () => {
    mockedList.mockRejectedValueOnce(new Error('database unavailable'));

    const page = await ReportsPage();

    expect(page.props).toMatchObject({
      initialReports: [],
      initialDataUnavailable: true,
    });
  });

  it('passes available report summaries through unchanged', async () => {
    const reports = [
      {
        reportDate: '2026-10-27',
        summary: 'Daily archive summary',
        metrics: {},
      },
    ] as Awaited<ReturnType<typeof reportService.listReportSummaries>>;
    mockedList.mockResolvedValueOnce(reports);

    const page = await ReportsPage();

    expect(page.props).toMatchObject({
      initialReports: reports,
      initialDataUnavailable: false,
    });
  });
});
