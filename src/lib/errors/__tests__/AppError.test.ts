import { AppError, AppErrorOptions } from '../AppError';

// Test implementation of AppError
class TestError extends AppError {
  constructor(options: AppErrorOptions) {
    super(options);
  }
}

describe('AppError', () => {
  describe('constructor', () => {
    it('should create error with basic properties', () => {
      const error = new TestError({
        message: 'Test error message',
        code: 'TEST_ERROR',
        statusCode: 400,
      });

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should set isOperational to false when specified', () => {
      const error = new TestError({
        message: 'Critical error',
        code: 'CRITICAL_ERROR',
        statusCode: 500,
        isOperational: false,
      });

      expect(error.isOperational).toBe(false);
    });

    it('should include details when provided', () => {
      const details = { field: 'username', value: 'test' };
      const error = new TestError({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details,
      });

      expect(error.details).toEqual(details);
    });

    it('should include i18nKey when provided', () => {
      const error = new TestError({
        message: 'Not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        i18nKey: 'errors.notFound',
      });

      expect(error.i18nKey).toBe('errors.notFound');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new TestError({
        message: 'Wrapped error',
        code: 'WRAPPED_ERROR',
        statusCode: 500,
        cause,
      });

      expect(error.cause).toBe(cause);
    });

    it('should set error name to class name', () => {
      const error = new TestError({
        message: 'Test',
        code: 'TEST',
        statusCode: 400,
      });

      expect(error.name).toBe('TestError');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation of error', () => {
      const error = new TestError({
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: { field: 'test' },
        i18nKey: 'errors.test',
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'TestError',
        message: 'Test error',
        code: 'TEST_ERROR',
        statusCode: 400,
        isOperational: true,
        details: { field: 'test' },
        i18nKey: 'errors.test',
      });
    });

    it('should handle errors without optional properties', () => {
      const error = new TestError({
        message: 'Simple error',
        code: 'SIMPLE_ERROR',
        statusCode: 500,
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'TestError',
        message: 'Simple error',
        code: 'SIMPLE_ERROR',
        statusCode: 500,
        isOperational: true,
        details: undefined,
        i18nKey: undefined,
      });
    });
  });

  describe('toApiResponse', () => {
    it('should return API response format', () => {
      const error = new TestError({
        message: 'API error',
        code: 'API_ERROR',
        statusCode: 400,
        details: { field: 'invalid' },
      });

      const response = error.toApiResponse();

      expect(response).toEqual({
        error: {
          code: 'API_ERROR',
          message: 'API error',
          retryable: false,
          details: { field: 'invalid' },
        },
      });
    });

    it('should mark operational errors as non-retryable', () => {
      const error = new TestError({
        message: 'Operational error',
        code: 'OPERATIONAL_ERROR',
        statusCode: 400,
        isOperational: true,
      });

      const response = error.toApiResponse();

      expect(response.error.retryable).toBe(false);
    });

    it('should mark non-operational errors as retryable', () => {
      const error = new TestError({
        message: 'System error',
        code: 'SYSTEM_ERROR',
        statusCode: 500,
        isOperational: false,
      });

      const response = error.toApiResponse();

      expect(response.error.retryable).toBe(true);
    });

    it('should handle errors without details', () => {
      const error = new TestError({
        message: 'Simple error',
        code: 'SIMPLE_ERROR',
        statusCode: 400,
      });

      const response = error.toApiResponse();

      expect(response.error.details).toBeUndefined();
    });
  });

  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const error = new TestError({
        message: 'Test',
        code: 'TEST',
        statusCode: 400,
      });

      expect(error).toBeInstanceOf(Error);
    });

    it('should be instance of AppError', () => {
      const error = new TestError({
        message: 'Test',
        code: 'TEST',
        statusCode: 400,
      });

      expect(error).toBeInstanceOf(AppError);
    });

    it('should have stack trace', () => {
      const error = new TestError({
        message: 'Test',
        code: 'TEST',
        statusCode: 400,
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestError');
    });
  });
});
