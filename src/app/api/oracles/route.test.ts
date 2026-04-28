import { type NextRequest } from 'next/server';

import * as oracleHandlers from '@/lib/api/oracleHandlers';
import { OracleProvider } from '@/types/oracle';

import { GET } from './route';

jest.mock('@/lib/api/oracleHandlers', () => ({
  handleGetPrice: jest.fn(),
  handleGetHistoricalPrices: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

function createMockRequest(url: string): NextRequest {
  const urlObj = new URL(url);
  const request = {
    url,
    nextUrl: urlObj,
    method: 'GET',
    headers: new Headers(),
    clone: function () {
      return {
        url: this.url,
        nextUrl: this.nextUrl,
        method: this.method,
        headers: this.headers,
      } as unknown as NextRequest;
    },
  } as unknown as NextRequest;
  return request;
}

describe('/api/oracles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return price data for valid request', async () => {
      const mockPriceData = {
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        price: 68000,
        timestamp: Date.now(),
      };

      (oracleHandlers.handleGetPrice as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ data: mockPriceData }), { status: 200 })
      );

      const request = createMockRequest(
        'http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.symbol).toBe('BTC');
      expect(oracleHandlers.handleGetPrice).toHaveBeenCalledWith({
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        chain: undefined,
      });
    });

    it('should return historical prices when period is provided', async () => {
      const mockHistoricalData = {
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        period: 7,
        data: [],
      };

      (oracleHandlers.handleGetHistoricalPrices as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ data: mockHistoricalData }), { status: 200 })
      );

      const request = createMockRequest(
        'http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC&period=7'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(oracleHandlers.handleGetHistoricalPrices).toHaveBeenCalledWith({
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        chain: undefined,
        period: 7,
      });
    });

    it('should return validation error for missing parameters', async () => {
      const request = createMockRequest('http://localhost:3000/api/oracles?provider=chainlink');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return validation error for invalid provider', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/oracles?provider=invalid&symbol=BTC'
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should handle chain parameter correctly', async () => {
      (oracleHandlers.handleGetPrice as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 200 })
      );

      const request = createMockRequest(
        'http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC&chain=ethereum'
      );

      await GET(request);

      expect(oracleHandlers.handleGetPrice).toHaveBeenCalledWith({
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        chain: 'ethereum',
      });
    });
  });
});
