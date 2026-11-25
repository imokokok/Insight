/** @jest-environment node */

import { POST } from '../route';

const mockGetDatabase = jest.fn();
const mockSaveRecords = jest.fn();

jest.mock('@/lib/cloudflare/priceRecords', () => ({
  getPriceRecordsD1Database: (...args: unknown[]) => mockGetDatabase(...args),
  saveD1PriceRecords: (...args: unknown[]) => mockSaveRecords(...args),
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://oracleinsight.xyz/api/cron/price-records', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-cron-secret',
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/cron/price-records', () => {
  const previousSecret = process.env.CRON_SECRET;

  beforeAll(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDatabase.mockResolvedValue({ prepare: jest.fn(), batch: jest.fn() });
    mockSaveRecords.mockResolvedValue(1);
  });

  it('rejects unauthorized requests before reading the payload', async () => {
    const response = await POST(request({ records: [] }, { authorization: 'Bearer wrong' }));
    expect(response.status).toBe(401);
    expect(mockGetDatabase).not.toHaveBeenCalled();
  });

  it('validates bounded price records and writes them through the D1 binding', async () => {
    const record = {
      provider: 'pyth',
      symbol: 'BTC',
      chain: 'ethereum',
      price: 50_100,
      timestamp: Date.now(),
      confidence: 0.99,
      signal_vector: {
        freshness: 0.99,
        sourceReliability: 0.98,
        metadataCompleteness: 0.95,
        consistency: 0.99,
        auditStatus: 1,
      },
    };
    const response = await POST(request({ records: [record] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: 1 });
    expect(mockGetDatabase).toHaveBeenCalledTimes(1);
    expect(mockSaveRecords).toHaveBeenCalledWith(expect.any(Object), [record]);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects malformed and oversized batches before touching D1', async () => {
    const malformed = await POST(request({ records: [{ provider: 'pyth', price: -1 }] }));
    const oversized = await POST(request('{}', { 'content-length': String(512 * 1024 + 1) }));

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(mockGetDatabase).not.toHaveBeenCalled();
  });

  it('does not expose D1 errors to the caller', async () => {
    mockGetDatabase.mockRejectedValue(new Error('private D1 error detail'));

    const response = await POST(
      request({
        records: [
          {
            provider: 'pyth',
            symbol: 'BTC',
            price: 50_100,
            timestamp: Date.now(),
          },
        ],
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'Price-record storage unavailable' });
  });
});
