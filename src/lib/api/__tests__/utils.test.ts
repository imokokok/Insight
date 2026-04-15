import { type NextRequest } from 'next/server';

import {
  withCacheHeaders,
  createCachedJsonResponse,
  ErrorCodes,
  NewCacheConfig as CacheConfig,
} from '../utils';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('ErrorCodes', () => {
  it('should have all required error codes', () => {
    expect(ErrorCodes.MISSING_PARAMS).toBe('MISSING_PARAMS');
    expect(ErrorCodes.INVALID_PROVIDER).toBe('INVALID_PROVIDER');
    expect(ErrorCodes.INVALID_PARAMS).toBe('INVALID_PARAMS');
    expect(ErrorCodes.CLIENT_NOT_FOUND).toBe('CLIENT_NOT_FOUND');
    expect(ErrorCodes.ORACLE_FETCH_FAILED).toBe('ORACLE_FETCH_FAILED');
    expect(ErrorCodes.BATCH_REQUEST_FAILED).toBe('BATCH_REQUEST_FAILED');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});

describe('CacheConfig', () => {
  describe('PRICE', () => {
    it('should have correct values', () => {
      expect(CacheConfig.PRICE.maxAge).toBe(30);
      expect(CacheConfig.PRICE.staleWhileRevalidate).toBe(60);
    });

    it('should generate correct header', () => {
      expect(CacheConfig.PRICE.header).toBe('public, s-maxage=30, stale-while-revalidate=60');
    });
  });

  describe('HISTORY', () => {
    it('should have correct values', () => {
      expect(CacheConfig.HISTORY.maxAge).toBe(300);
      expect(CacheConfig.HISTORY.staleWhileRevalidate).toBe(600);
    });

    it('should generate correct header', () => {
      expect(CacheConfig.HISTORY.header).toBe('public, s-maxage=300, stale-while-revalidate=600');
    });
  });
});

describe('withCacheHeaders', () => {
  it('should set Cache-Control header on response', () => {
    const mockResponse = {
      headers: {
        set: jest.fn(),
      },
    } as unknown as Response;

    const result = withCacheHeaders(mockResponse as unknown as Response, CacheConfig.PRICE);

    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Cache-Control',
      CacheConfig.PRICE.header
    );
    expect(result).toBe(mockResponse);
  });
});

describe('createCachedJsonResponse', () => {
  it('should create JSON response with cache headers', async () => {
    const data = { price: 100, symbol: 'BTC/USD' };
    const response = createCachedJsonResponse(data, CacheConfig.PRICE);

    expect(response.headers.get('Cache-Control')).toBe(CacheConfig.PRICE.header);

    const body = await response.json();
    expect(body).toEqual(data);
  });
});

describe('getUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no authorization header', async () => {
    const { getUserId } = await import('../utils');
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    } as unknown as NextRequest;

    const result = await getUserId(mockRequest);
    expect(result).toBeNull();
  });

  it('should return null when authorization header does not start with Bearer', async () => {
    const { getUserId } = await import('../utils');
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Basic token'),
      },
    } as unknown as NextRequest;

    const result = await getUserId(mockRequest);
    expect(result).toBeNull();
  });

  it('should return null when Supabase config is missing', async () => {
    const { getUserId } = await import('../utils');
    const originalEnv = process.env;

    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer token'),
      },
    } as unknown as NextRequest;

    const result = await getUserId(mockRequest);
    expect(result).toBeNull();

    process.env = originalEnv;
  });
});
