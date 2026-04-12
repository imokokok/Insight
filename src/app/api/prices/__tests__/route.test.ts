import type { NextRequest } from 'next/server';

import { GET } from '../route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status || 200, headers: new Map() })),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock rate limit middleware
jest.mock('@/lib/api/middleware/rateLimitMiddleware', () => ({
  apiRateLimit: jest.fn().mockResolvedValue({
    success: true,
    remaining: 99,
    resetTime: Date.now() + 60000,
  }),
  withRateLimitHeaders: jest.fn((response) => response),
}));

const mockBinanceResponse = [
  { symbol: 'BTCUSDT', price: '50000.00' },
  { symbol: 'ETHUSDT', price: '3000.00' },
  { symbol: 'SOLUSDT', price: '100.00' },
  { symbol: 'AVAXUSDT', price: '35.00' },
  { symbol: 'BNBUSDT', price: '300.00' },
  { symbol: 'MATICUSDT', price: '0.80' },
  { symbol: 'ARBUSDT', price: '1.20' },
  { symbol: 'OPUSDT', price: '2.50' },
  { symbol: 'UNIUSDT', price: '6.00' },
  { symbol: 'AAVEUSDT', price: '90.00' },
  { symbol: 'LINKUSDT', price: '14.00' },
  { symbol: 'USDCUSDT', price: '1.00' },
  { symbol: 'DAIUSDT', price: '1.00' },
];

// Create a mock NextRequest
function createMockRequest(): Request {
  return new Request('http://localhost:3000/api/prices', {
    headers: {
      'x-forwarded-for': '127.0.0.1',
    },
  });
}

describe('/api/prices', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBinanceResponse,
      text: async () => JSON.stringify(mockBinanceResponse),
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return prices successfully', async () => {
    const request = createMockRequest();
    const response = await GET(request as unknown as NextRequest);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('prices');
    expect(response.data).toHaveProperty('cached');
    expect(response.data).toHaveProperty('timestamp');
  });

  it('should return cached prices on subsequent requests', async () => {
    const request = createMockRequest();
    await GET(request as unknown as NextRequest);
    const response2 = await GET(request as unknown as NextRequest);

    expect(response2.data.cached).toBe(true);
  });

  it('should include USDT price as 1.0', async () => {
    const request = createMockRequest();
    const response = await GET(request as unknown as NextRequest);

    expect(response.data.prices.USDT).toBe(1.0);
  });

  it('should return cached prices on fetch error', async () => {
    const request = createMockRequest();
    await GET(request as unknown as NextRequest);

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const response = await GET(request as unknown as NextRequest);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('prices');
    expect(response.data.cached).toBe(true);
  });
});
