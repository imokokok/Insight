import { type PriceData } from '@/types/oracle';

import { GET } from '../route';

const mockFetchPriceWithDatabase = jest.fn();
const mockUpsertHourlySnapshots = jest.fn();
const mockGenerateDailyReport = jest.fn();
const mockCalculateConsensusPrice = jest.fn();

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: (...args: unknown[]) => mockFetchPriceWithDatabase(...args),
}));

jest.mock('@/lib/reports/reportService', () => ({
  REPORT_ASSETS: ['BTC', 'ETH'],
  REPORT_PROVIDERS: ['chainlink', 'pyth'],
  reportService: {
    upsertHourlySnapshots: (...args: unknown[]) => mockUpsertHourlySnapshots(...args),
    generateDailyReport: (...args: unknown[]) => mockGenerateDailyReport(...args),
  },
}));

jest.mock('@/lib/analytics/consensusPrice', () => ({
  calculateConsensusPrice: (...args: unknown[]) => mockCalculateConsensusPrice(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

function createPrice(provider: string, symbol: string, price: number): PriceData {
  return {
    provider,
    symbol,
    price,
    timestamp: Date.parse('2026-06-24T15:35:00.000Z'),
    ingestionTimestamp: Date.parse('2026-06-24T15:35:05.000Z'),
    confidence: 0.98,
  } as PriceData;
}

describe('/api/cron/daily-report', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-24T15:36:45.000Z'));
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'test-cron-secret',
    };

    mockCalculateConsensusPrice.mockReturnValue({ price: 100 });
    mockUpsertHourlySnapshots.mockResolvedValue(4);
    mockGenerateDailyReport.mockResolvedValue({
      metrics: {
        totalSnapshots: 4,
        overallSuccessRate: 100,
        totalAnomalies: 0,
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it('collects prices directly instead of self-fetching the batch API', async () => {
    const originalFetch = global.fetch;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as typeof global.fetch;
    mockFetchPriceWithDatabase.mockImplementation((provider: string, symbol: string) =>
      Promise.resolve(createPrice(provider, symbol, 100))
    );

    const response = await GET(
      new Request('https://insight.vercel.app/api/cron/daily-report', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockFetchPriceWithDatabase).toHaveBeenCalledTimes(4);
    expect(mockUpsertHourlySnapshots).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          snapshotHour: new Date('2026-06-24T15:00:00.000Z'),
          provider: 'chainlink',
          symbol: 'BTC',
          isSuccess: true,
        }),
      ])
    );
    expect(mockGenerateDailyReport).toHaveBeenCalledWith('2026-06-24');
    await expect(response.text().then(JSON.parse)).resolves.toEqual(
      expect.objectContaining({
        success: true,
        reportDate: '2026-06-24',
        inserted: 4,
      })
    );

    global.fetch = originalFetch;
  });

  it('records failed provider queries without failing the cron run', async () => {
    mockFetchPriceWithDatabase.mockImplementation((provider: string, symbol: string) => {
      if (provider === 'pyth' && symbol === 'BTC') {
        return Promise.reject(new Error('provider unavailable'));
      }
      return Promise.resolve(createPrice(provider, symbol, 100));
    });

    const response = await GET(
      new Request('https://insight.vercel.app/api/cron/daily-report', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );

    expect(response.status).toBe(200);
    expect(mockUpsertHourlySnapshots).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'pyth',
          symbol: 'BTC',
          price: 0,
          isSuccess: false,
          errorMessage: 'provider unavailable',
        }),
      ])
    );
  });

  it('rejects requests without the Vercel cron secret', async () => {
    const response = await GET(new Request('https://insight.vercel.app/api/cron/daily-report'));

    expect(response.status).toBe(401);
    expect(mockFetchPriceWithDatabase).not.toHaveBeenCalled();
  });
});
