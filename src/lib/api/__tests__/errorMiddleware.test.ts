import { NextResponse } from 'next/server';

import {
  createErrorMiddleware,
  defaultErrorMiddleware,
  developmentErrorMiddleware,
  withErrorHandling,
  type ErrorMiddlewareOptions,
} from '../middleware/errorMiddleware';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/lib/errors', () => ({
  isAppError: jest.fn(),
  errorToResponse: jest.fn(),
}));

const { isAppError, errorToResponse } = require('@/lib/errors');

describe('errorMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createErrorMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createErrorMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should handle AppError correctly', async () => {
      const appError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
        details: { field: 'email' },
      };

      isAppError.mockReturnValue(true);
      errorToResponse.mockReturnValue(
        NextResponse.json({ error: appError }, { status: 400 })
      );

      const middleware = createErrorMiddleware();
      const result = await middleware(appError);

      expect(isAppError).toHaveBeenCalledWith(appError);
      expect(errorToResponse).toHaveBeenCalledWith(appError);
      expect(result.status).toBe(400);
    });

    it('should add requestId to AppError response', async () => {
      const appError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
      };

      isAppError.mockReturnValue(true);
      errorToResponse.mockReturnValue(
        NextResponse.json({ error: appError }, { status: 400 })
      );

      const middleware = createErrorMiddleware();
      const result = await middleware(appError, 'req-123');
      const body = await result.json();

      expect(body.meta.requestId).toBe('req-123');
    });

    it('should handle SyntaxError for JSON parsing', async () => {
      const syntaxError = new SyntaxError('Unexpected token in JSON');

      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware(syntaxError);
      const body = await result.json();

      expect(result.status).toBe(400);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('fetch failed');

      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware(networkError);
      const body = await result.json();

      expect(result.status).toBe(500);
      expect(body.error.retryable).toBe(true);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('network timeout');

      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware(timeoutError);
      const body = await result.json();

      expect(result.status).toBe(500);
      expect(body.error.retryable).toBe(true);
    });

    it('should handle ECONNREFUSED errors', async () => {
      const connectionError = new Error('ECONNREFUSED');

      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware(connectionError);
      const body = await result.json();

      expect(result.status).toBe(500);
      expect(body.error.retryable).toBe(true);
    });

    it('should handle generic Error', async () => {
      const error = new Error('Something went wrong');

      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware(error);
      const body = await result.json();

      expect(result.status).toBe(500);
      expect(body.error.message).toBe('Something went wrong');
    });

    it('should handle unknown error types', async () => {
      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware('string error');
      const body = await result.json();

      expect(result.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware({ includeStackTrace: true });
      const result = await middleware(error);
      const body = await result.json();

      expect(body.error.details.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware({ includeStackTrace: true });
      const result = await middleware(error);
      const body = await result.json();

      expect(body.error.details?.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should skip logging when logErrors is false', async () => {
      const error = new Error('Test error');
      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware({ logErrors: false });
      await middleware(error);

      expect(isAppError).toHaveBeenCalled();
    });

    it('should use default options when not provided', async () => {
      isAppError.mockReturnValue(false);

      const middleware = createErrorMiddleware();
      const result = await middleware(new Error('Test'));

      expect(result.status).toBe(500);
    });
  });

  describe('defaultErrorMiddleware', () => {
    it('should be a pre-configured middleware', () => {
      expect(typeof defaultErrorMiddleware).toBe('function');
    });

    it('should handle errors', async () => {
      isAppError.mockReturnValue(false);

      const result = await defaultErrorMiddleware(new Error('Test'));

      expect(result.status).toBe(500);
    });
  });

  describe('developmentErrorMiddleware', () => {
    it('should be a pre-configured middleware for development', () => {
      expect(typeof developmentErrorMiddleware).toBe('function');
    });

    it('should include stack trace', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      isAppError.mockReturnValue(false);

      const result = await developmentErrorMiddleware(new Error('Test'));
      const body = await result.json();

      expect(body.error.details.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await withErrorHandling(fn);

      expect(result).toEqual({ data: 'success' });
    });

    it('should return error response on failure', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      isAppError.mockReturnValue(false);

      const result = await withErrorHandling(fn);

      expect(result).toBeInstanceOf(NextResponse);
    });

    it('should use custom options', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      isAppError.mockReturnValue(false);

      const result = await withErrorHandling(fn, { logErrors: false });

      expect(result).toBeInstanceOf(NextResponse);
    });
  });
});
