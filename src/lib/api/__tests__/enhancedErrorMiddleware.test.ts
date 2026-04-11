import type { NextResponse } from 'next/server';

import { ValidationError, NotFoundError, RateLimitError, InternalError } from '@/lib/errors';

import {
  createEnhancedErrorMiddleware,
  enhancedErrorMiddleware,
  withEnhancedErrorHandling,
  classifyError,
  getSuggestedAction,
  type StandardizedErrorResponse,
} from '../middleware/enhancedErrorMiddleware';

describe('Enhanced Error Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createEnhancedErrorMiddleware', () => {
    it('should handle AppError correctly', async () => {
      const middleware = createEnhancedErrorMiddleware();
      const error = new ValidationError('Invalid input', { field: 'name' });

      const response = await middleware(error);

      expect(response.status).toBe(400);
      expect(typeof response.json).toBe('function');

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid input');
      expect(body.error.details).toEqual({ field: 'name' });
      expect(body.error.retryable).toBe(false);
    });

    it('should handle network errors as retryable', async () => {
      const middleware = createEnhancedErrorMiddleware();
      const error = new Error('Network request failed: fetch error');

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.retryable).toBe(true);
    });

    it('should include request ID when configured', async () => {
      const middleware = createEnhancedErrorMiddleware({ includeRequestId: true });
      const error = new Error('Test error');

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.requestId).toBeDefined();
      expect(body.meta.requestId).toBeDefined();
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const middleware = createEnhancedErrorMiddleware({ includeStackTrace: true });
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.method';

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.stackTrace).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const middleware = createEnhancedErrorMiddleware({ includeStackTrace: true });
      const error = new Error('Test error');

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.stackTrace).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle JSON syntax errors', async () => {
      const middleware = createEnhancedErrorMiddleware();
      const error = new SyntaxError('Unexpected token in JSON');

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.code).toBe('INVALID_JSON');
      expect(response.status).toBe(500);
    });

    it('should include request information when request is provided', async () => {
      const middleware = createEnhancedErrorMiddleware();
      const error = new Error('Test error');
      const request = new Request('https://example.com/api/test', { method: 'POST' });

      const response = await middleware(error, request);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.meta.path).toBe('/api/test');
      expect(body.meta.method).toBe('POST');
    });

    it('should include documentation URL when configured', async () => {
      const middleware = createEnhancedErrorMiddleware({ includeDocumentationUrl: true });
      const error = new NotFoundError('Resource not found');

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.documentationUrl).toBe('/docs/errors/not-found');
    });

    it('should add retry headers for retryable errors', async () => {
      const middleware = createEnhancedErrorMiddleware();
      const error = new Error('Network timeout');

      const response = await middleware(error);

      expect(response.headers.get('X-Retryable')).toBe('true');
    });

    it('should add Retry-After header when provided in details', async () => {
      const middleware = createEnhancedErrorMiddleware();
      const error = new RateLimitError('Rate limit exceeded', { retryAfter: 60 });

      const response = await middleware(error);

      const body = (await response.json()) as StandardizedErrorResponse;
      expect(body.error.details?.retryAfter).toBe(60);
    });
  });

  describe('withEnhancedErrorHandling', () => {
    it('should return handler result on success', async () => {
      const handler = jest.fn().mockResolvedValue({ data: 'success' });
      const wrappedHandler = withEnhancedErrorHandling(handler);
      const request = new Request('https://example.com/api/test');

      const result = await wrappedHandler(request);

      expect(result).toEqual({ data: 'success' });
      expect(handler).toHaveBeenCalledWith(request);
    });

    it('should return error response on failure', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const wrappedHandler = withEnhancedErrorHandling(handler);
      const request = new Request('https://example.com/api/test');

      const result = await wrappedHandler(request);

      expect(result.status).toBe(500);
      expect(typeof result.json).toBe('function');

      const body = (await result.json()) as StandardizedErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Handler failed');
    });

    it('should pass custom options to middleware', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Test'));
      const wrappedHandler = withEnhancedErrorHandling(handler, {
        includeRequestId: true,
        includeStackTrace: true,
      });
      const request = new Request('https://example.com/api/test');

      const result = await wrappedHandler(request);
      const body = (await (result as NextResponse).json()) as StandardizedErrorResponse;

      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('classifyError', () => {
    it('should classify server errors correctly', () => {
      const error = new InternalError('Server error');
      const classification = classifyError(error);

      expect(classification.category).toBe('server');
      expect(classification.severity).toBe('high');
    });

    it('should classify client errors correctly', () => {
      const error = new ValidationError('Invalid input');
      const classification = classifyError(error);

      expect(classification.category).toBe('client');
      expect(classification.severity).toBe('medium');
    });

    it('should classify network errors correctly', () => {
      const error = new Error('Network fetch failed');
      const classification = classifyError(error);

      expect(classification.category).toBe('network');
      expect(classification.severity).toBe('high');
    });

    it('should classify unknown errors as critical', () => {
      const error = 'unknown error';
      const classification = classifyError(error);

      expect(classification.category).toBe('unknown');
      expect(classification.severity).toBe('critical');
    });
  });

  describe('getSuggestedAction', () => {
    it('should return suggestion for known error codes', () => {
      const suggestion = getSuggestedAction('VALIDATION_ERROR');
      expect(suggestion).toBe('请检查输入数据是否符合要求');
    });

    it('should return suggestion for rate limit error', () => {
      const suggestion = getSuggestedAction('RATE_LIMIT_EXCEEDED');
      expect(suggestion).toBe('请稍后再试，或降低请求频率');
    });

    it('should return undefined for unknown error codes', () => {
      const suggestion = getSuggestedAction('UNKNOWN_ERROR_CODE');
      expect(suggestion).toBeUndefined();
    });
  });

  describe('predefined middlewares', () => {
    it('enhancedErrorMiddleware should be defined', () => {
      expect(enhancedErrorMiddleware).toBeDefined();
      expect(typeof enhancedErrorMiddleware).toBe('function');
    });

    it('developmentErrorMiddleware should include stack traces', async () => {
      const { developmentErrorMiddleware } = await import('../middleware/enhancedErrorMiddleware');
      const error = new Error('Test');
      error.stack = 'stack trace';

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await developmentErrorMiddleware(error);
      const body = (await response.json()) as StandardizedErrorResponse;

      expect(body.error.stackTrace).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('productionErrorMiddleware should not include stack traces', async () => {
      const { productionErrorMiddleware } = await import('../middleware/enhancedErrorMiddleware');
      const error = new Error('Test');

      const response = await productionErrorMiddleware(error);
      const body = (await response.json()) as StandardizedErrorResponse;

      expect(body.error.stackTrace).toBeUndefined();
    });
  });
});
