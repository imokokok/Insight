import { GET, POST } from '../route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200 })),
  },
}));

jest.mock('@/lib/services/marketData', () => ({
  coinGeckoMarketService: {
    getTokenMarketData: jest.fn().mockResolvedValue({ marketCap: 1000000, price: 50000 }),
    getHistoricalPrices: jest.fn().mockResolvedValue([{ price: 50000, timestamp: Date.now() }]),
    getOHLCData: jest
      .fn()
      .mockResolvedValue([{ open: 50000, high: 51000, low: 49000, close: 50500 }]),
    getMultipleTokensMarketData: jest.fn().mockResolvedValue([]),
  },
  binanceMarketService: {
    getTokenMarketData: jest.fn().mockResolvedValue({ marketCap: 1000000, price: 50000 }),
    getHistoricalPrices: jest.fn().mockResolvedValue([{ price: 50000, timestamp: Date.now() }]),
    getOHLCData: jest
      .fn()
      .mockResolvedValue([{ open: 50000, high: 51000, low: 49000, close: 50500 }]),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('/api/market-data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return error when symbol is missing', async () => {
      const request = new Request('http://localhost/api/market-data');
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should return error for invalid symbol format', async () => {
      const request = new Request('http://localhost/api/market-data?symbol=invalid-symbol!');
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid symbol format');
    });

    it('should return error for invalid type', async () => {
      const request = new Request('http://localhost/api/market-data?symbol=BTC&type=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid type parameter');
    });

    it('should return error for invalid days', async () => {
      const request = new Request('http://localhost/api/market-data?symbol=BTC&days=500');
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid days parameter');
    });

    it('should return market data successfully', async () => {
      const request = new Request('http://localhost/api/market-data?symbol=BTC');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
    });

    it('should return historical data', async () => {
      const request = new Request('http://localhost/api/market-data?symbol=BTC&type=historical');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });

    it('should return OHLC data', async () => {
      const request = new Request('http://localhost/api/market-data?symbol=BTC&type=ohlc');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });
  });

  describe('POST', () => {
    it('should return error when symbols is missing', async () => {
      const request = new Request('http://localhost/api/market-data', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Symbols array is required');
    });

    it('should return error when symbols is empty', async () => {
      const request = new Request('http://localhost/api/market-data', {
        method: 'POST',
        body: JSON.stringify({ symbols: [] }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Symbols array is required');
    });

    it('should return error when too many symbols', async () => {
      const symbols = Array(51).fill('BTC');
      const request = new Request('http://localhost/api/market-data', {
        method: 'POST',
        body: JSON.stringify({ symbols }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Maximum');
    });

    it('should return batch data successfully', async () => {
      const request = new Request('http://localhost/api/market-data', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['BTC', 'ETH'] }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
    });

    it('should handle invalid JSON body', async () => {
      const request = new Request('http://localhost/api/market-data', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid JSON body');
    });
  });
});
