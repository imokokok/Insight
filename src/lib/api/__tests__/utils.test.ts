import { type NextRequest } from 'next/server';

import {
  createErrorResponse,
  withCacheHeaders,
  createCachedJsonResponse,
  handleApiError,
  ErrorCodes,
  CacheConfig,
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

describe('createErrorResponse', () => {
  it('should create an error response with correct structure', async () => {
    const response = createErrorResponse({
      code: 'TEST_ERROR',
      message: 'Test error message',
      retryable: true,
      statusCode: 400,
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        retryable: true,
      },
    });
  });

  it('should handle non-retryable errors', async () => {
    const response = createErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      retryable: false,
      statusCode: 400,
    });

    const body = await response.json();
    expect(body.error.retryable).toBe(false);
  });

  it('should handle different status codes', () => {
    const response404 = createErrorResponse({
      code: 'NOT_FOUND',
      message: 'Resource not found',
      retryable: false,
      statusCode: 404,
    });
    expect(response404.status).toBe(404);

    const response500 = createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Server error',
      retryable: true,
      statusCode: 500,
    });
    expect(response500.status).toBe(500);
  });
});

describe('withCacheHeaders', () => {
  it('should set Cache-Control header on response', () => {
    const mockResponse = {
      headers: {
        set: jest.fn(),
      },
    } as unknown as Response;

    const result = withCacheHeaders(mockResponse as any, CacheConfig.PRICE);

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

describe('handleApiError', () => {
  it('should handle network errors as retryable', async () => {
    const error = new Error('fetch failed');
    const response = handleApiError(error, { operation: 'fetch price' });

    const body = await response.json();
    expect(body.error.retryable).toBe(true);
    expect(body.error.code).toBe(ErrorCodes.ORACLE_FETCH_FAILED);
    expect(body.error.message).toContain('fetch price');
  });

  it('should handle timeout errors as retryable', async () => {
    const error = new Error('timeout exceeded');
    const response = handleApiError(error, { operation: 'fetch data' });

    const body = await response.json();
    expect(body.error.retryable).toBe(true);
  });

  it('should handle ECONNREFUSED errors as retryable', async () => {
    const error = new Error('ECONNREFUSED');
    const response = handleApiError(error, { operation: 'connect' });

    const body = await response.json();
    expect(body.error.retryable).toBe(true);
  });

  it('should handle non-network errors as non-retryable', async () => {
    const error = new Error('Some other error');
    const response = handleApiError(error, { operation: 'process' });

    const body = await response.json();
    expect(body.error.retryable).toBe(false);
  });

  it('should handle non-Error objects', async () => {
    const response = handleApiError('string error', { operation: 'test' });

    const body = await response.json();
    expect(body.error.message).toContain('Unknown error');
  });

  it('should include context in error message', async () => {
    const error = new Error('test error');
    const response = handleApiError(error, {
      operation: 'fetch oracle data',
      provider: 'chainlink',
      symbol: 'BTC/USD',
    });

    const body = await response.json();
    expect(body.error.message).toContain('fetch oracle data');
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
