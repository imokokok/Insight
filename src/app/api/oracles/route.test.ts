/**
 * @fileoverview Tests for /api/oracles route
 */

import { NextRequest } from 'next/server';

import * as oracleHandlers from '@/lib/api/oracleHandlers';
import { OracleProvider } from '@/types/oracle';

import { GET, POST } from './route';

// Mock the oracle handlers
jest.mock('@/lib/api/oracleHandlers', () => ({
  validateRequiredParams: jest.fn(),
  validateProvider: jest.fn(),
  validatePeriod: jest.fn(),
  handleGetPrice: jest.fn(),
  handleGetHistoricalPrices: jest.fn(),
  handleBatchPrices: jest.fn(),
}));

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

      (oracleHandlers.validateRequiredParams as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validateProvider as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validatePeriod as jest.Mock).mockReturnValue({ valid: true });
      (oracleHandlers.handleGetPrice as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ data: mockPriceData }), { status: 200 })
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC')
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

      (oracleHandlers.validateRequiredParams as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validateProvider as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validatePeriod as jest.Mock).mockReturnValue({ valid: true, value: 7 });
      (oracleHandlers.handleGetHistoricalPrices as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ data: mockHistoricalData }), { status: 200 })
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC&period=7')
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
      const mockErrorResponse = new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400 }
      );

      (oracleHandlers.validateRequiredParams as jest.Mock).mockReturnValue(mockErrorResponse);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/oracles?provider=chainlink')
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return validation error for invalid provider', async () => {
      const mockErrorResponse = new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
      });

      (oracleHandlers.validateRequiredParams as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validateProvider as jest.Mock).mockReturnValue(mockErrorResponse);

      const request = new NextRequest(
        new URL('http://localhost:3000/api/oracles?provider=invalid&symbol=BTC')
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return validation error for invalid period', async () => {
      const mockErrorResponse = new Response(JSON.stringify({ error: 'Invalid period' }), {
        status: 400,
      });

      (oracleHandlers.validateRequiredParams as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validateProvider as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validatePeriod as jest.Mock).mockReturnValue({
        valid: false,
        error: mockErrorResponse,
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC&period=invalid')
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should handle chain parameter correctly', async () => {
      (oracleHandlers.validateRequiredParams as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validateProvider as jest.Mock).mockReturnValue(null);
      (oracleHandlers.validatePeriod as jest.Mock).mockReturnValue({ valid: true });
      (oracleHandlers.handleGetPrice as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { status: 200 })
      );

      const request = new NextRequest(
        new URL('http://localhost:3000/api/oracles?provider=chainlink&symbol=BTC&chain=ethereum')
      );

      await GET(request);

      expect(oracleHandlers.handleGetPrice).toHaveBeenCalledWith({
        provider: OracleProvider.CHAINLINK,
        symbol: 'BTC',
        chain: 'ethereum',
      });
    });
  });

  describe('POST', () => {
    it('should handle batch price requests successfully', async () => {
      const batchRequests = {
        requests: [
          { provider: OracleProvider.CHAINLINK, symbol: 'BTC' },
          { provider: OracleProvider.PYTH, symbol: 'ETH' },
        ],
      };

      const mockBatchResponse = {
        timestamp: Date.now(),
        results: [
          { request: batchRequests.requests[0], status: 'fulfilled', data: { price: 68000 } },
          { request: batchRequests.requests[1], status: 'fulfilled', data: { price: 3500 } },
        ],
      };

      (oracleHandlers.handleBatchPrices as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify(mockBatchResponse), { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/oracles', {
        method: 'POST',
        body: JSON.stringify(batchRequests),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(oracleHandlers.handleBatchPrices).toHaveBeenCalledWith(batchRequests.requests);
    });

    it('should return error for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/oracles', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'body' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should return error when requests is not an array', async () => {
      const request = new NextRequest('http://localhost:3000/api/oracles', {
        method: 'POST',
        body: JSON.stringify({ requests: 'not-an-array' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });
  });
});
