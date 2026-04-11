import { NextResponse } from 'next/server';

import { ZodError } from 'zod';

import { ErrorCode } from '@/types/api/error';

import {
  createErrorResponse,
  handleValidationError,
  handleUnknownError,
  handleError,
  withErrorHandling,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
  createUnauthorizedErrorResponse,
  createForbiddenErrorResponse,
  createRateLimitErrorResponse,
} from '../errorHandler';
import { ZodValidationError } from '../errors';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

function isNextResponseLike(obj: unknown): boolean {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'status' in obj &&
    'json' in obj &&
    typeof (obj as Record<string, unknown>).json === 'function'
  );
}

describe('createErrorResponse', () => {
  it('should create error response with valid ErrorCode', () => {
    const response = createErrorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid input');

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(400);
  });

  it('should create error response with details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const response = createErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid email', details);

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(400);
  });

  it('should map unknown code to BAD_REQUEST', () => {
    const response = createErrorResponse('UNKNOWN_CODE', 'Some error');

    expect(response.status).toBe(400);
  });

  it('should use custom status code', () => {
    const response = createErrorResponse(ErrorCode.NOT_FOUND, 'Not found', undefined, 404);

    expect(response.status).toBe(404);
  });

  it('should handle FORBIDDEN error code with custom status', () => {
    const response = createErrorResponse(ErrorCode.FORBIDDEN, 'Access denied', undefined, 403);

    expect(response.status).toBe(403);
  });

  it('should handle INTERNAL_ERROR error code with custom status', () => {
    const response = createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Server error', undefined, 500);

    expect(response.status).toBe(500);
  });

  it('should default to 400 status code', () => {
    const response = createErrorResponse(ErrorCode.FORBIDDEN, 'Access denied');

    expect(response.status).toBe(400);
  });
});

describe('handleValidationError', () => {
  it('should handle ZodError', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
    ]);

    const response = handleValidationError(zodError);

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(400);
  });

  it('should handle ZodValidationError', () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, path: ['name'], message: 'Required' },
    ]);
    const validationError = ZodValidationError.fromZodError(zodError);

    const response = handleValidationError(validationError);

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(400);
  });

  it('should include context in log message', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
    ]);

    const response = handleValidationError(zodError, 'user-registration');

    expect(response.status).toBe(400);
  });

  it('should handle multiple validation errors', () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, path: ['name'], message: 'Required' },
      { code: 'too_small', minimum: 0, path: ['age'], message: 'Must be positive' },
    ]);

    const response = handleValidationError(zodError);

    expect(response.status).toBe(400);
  });

  it('should return error details in response', async () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, path: ['name'], message: 'Required' },
    ]);
    const validationError = ZodValidationError.fromZodError(zodError);

    const response = handleValidationError(validationError);
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details).toBeDefined();
    expect(json.error.details.errors).toHaveLength(1);
  });
});

describe('handleUnknownError', () => {
  it('should handle Error instance', () => {
    const error = new Error('Something went wrong');

    const response = handleUnknownError(error);

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(500);
  });

  it('should handle non-Error values', () => {
    const response = handleUnknownError('string error');

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(500);
  });

  it('should handle null', () => {
    const response = handleUnknownError(null);

    expect(response.status).toBe(500);
  });

  it('should handle undefined', () => {
    const response = handleUnknownError(undefined);

    expect(response.status).toBe(500);
  });

  it('should handle object without message', () => {
    const response = handleUnknownError({ code: 123 });

    expect(response.status).toBe(500);
  });

  it('should return INTERNAL_ERROR code', async () => {
    const response = handleUnknownError(new Error('Test'));
    const json = await response.json();

    expect(json.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('handleError', () => {
  it('should handle ZodValidationError', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
    ]);
    const validationError = ZodValidationError.fromZodError(zodError);

    const response = handleError(validationError);

    expect(response.status).toBe(400);
  });

  it('should handle native ZodError', () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, path: ['name'], message: 'Required' },
    ]);

    const response = handleError(zodError);

    expect(response.status).toBe(400);
  });

  it('should handle object with issues (ZodError-like)', () => {
    const zodLikeError = {
      issues: [{ code: 'too_small', minimum: 1, path: ['name'], message: 'Required' }],
    };

    const response = handleError(zodLikeError);

    expect(response.status).toBe(400);
  });

  it('should handle unknown errors', () => {
    const response = handleError('unknown error');

    expect(response.status).toBe(500);
  });

  it('should include context for ZodValidationError', () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, path: ['name'], message: 'Required' },
    ]);
    const validationError = ZodValidationError.fromZodError(zodError);

    const response = handleError(validationError, 'api-endpoint');

    expect(response.status).toBe(400);
  });
});

describe('withErrorHandling', () => {
  it('should return successful response', async () => {
    const handler = () => Promise.resolve(NextResponse.json({ data: 'success' }));

    const response = await withErrorHandling(handler);

    expect(response.status).toBe(200);
  });

  it('should catch and handle ZodValidationError', async () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, path: ['name'], message: 'Required' },
    ]);
    const handler = () => Promise.reject(ZodValidationError.fromZodError(zodError));

    const response = await withErrorHandling(handler);

    expect(response.status).toBe(400);
  });

  it('should catch and handle unknown error', async () => {
    const handler = () => Promise.reject(new Error('Handler failed'));

    const response = await withErrorHandling(handler);

    expect(response.status).toBe(500);
  });

  it('should include context in error handling', async () => {
    const handler = () => Promise.reject(new Error('Failed'));

    const response = await withErrorHandling(handler, 'test-context');

    expect(response.status).toBe(500);
  });

  it('should handle string rejection', async () => {
    const handler = () => Promise.reject('string error');

    const response = await withErrorHandling(handler);

    expect(response.status).toBe(500);
  });
});

describe('createValidationErrorResponse', () => {
  it('should create validation error response', () => {
    const response = createValidationErrorResponse('email', 'Invalid email format');

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(400);
  });

  it('should include value in details', async () => {
    const response = createValidationErrorResponse('age', 'Must be positive', -5);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.details.value).toBe(-5);
  });

  it('should work without value', async () => {
    const response = createValidationErrorResponse('name', 'Required');

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.details.errors).toEqual([{ field: 'name', message: 'Required' }]);
  });

  it('should return VALIDATION_ERROR code', async () => {
    const response = createValidationErrorResponse('field', 'Invalid');
    const json = await response.json();

    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('createNotFoundErrorResponse', () => {
  it('should create not found response with resource only', () => {
    const response = createNotFoundErrorResponse('User');

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(404);
  });

  it('should create not found response with resource and id', async () => {
    const response = createNotFoundErrorResponse('User', '123');

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error.message).toContain('123');
  });

  it('should handle different resource types', () => {
    const resources = ['User', 'Product', 'Order', 'Transaction'];

    resources.forEach((resource) => {
      const response = createNotFoundErrorResponse(resource);
      expect(response.status).toBe(404);
    });
  });

  it('should return NOT_FOUND code', async () => {
    const response = createNotFoundErrorResponse('Resource');
    const json = await response.json();

    expect(json.error.code).toBe('NOT_FOUND');
  });
});

describe('createUnauthorizedErrorResponse', () => {
  it('should create unauthorized response with default message', () => {
    const response = createUnauthorizedErrorResponse();

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(401);
  });

  it('should create unauthorized response with custom message', async () => {
    const response = createUnauthorizedErrorResponse('Token expired');

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.message).toBe('Token expired');
  });

  it('should create unauthorized response with empty message', () => {
    const response = createUnauthorizedErrorResponse('');

    expect(response.status).toBe(401);
  });

  it('should return UNAUTHORIZED code', async () => {
    const response = createUnauthorizedErrorResponse();
    const json = await response.json();

    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});

describe('createForbiddenErrorResponse', () => {
  it('should create forbidden response with default message', () => {
    const response = createForbiddenErrorResponse();

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(403);
  });

  it('should create forbidden response with custom message', async () => {
    const response = createForbiddenErrorResponse('Admin access required');

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.message).toBe('Admin access required');
  });

  it('should create forbidden response with empty message', () => {
    const response = createForbiddenErrorResponse('');

    expect(response.status).toBe(403);
  });

  it('should return FORBIDDEN code', async () => {
    const response = createForbiddenErrorResponse();
    const json = await response.json();

    expect(json.error.code).toBe('FORBIDDEN');
  });
});

describe('createRateLimitErrorResponse', () => {
  it('should create rate limit response without retryAfter', () => {
    const response = createRateLimitErrorResponse();

    expect(isNextResponseLike(response)).toBe(true);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeUndefined();
  });

  it('should create rate limit response with retryAfter', () => {
    const response = createRateLimitErrorResponse(60);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('should not set header for zero retryAfter (falsy value)', () => {
    const response = createRateLimitErrorResponse(0);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeUndefined();
  });

  it('should handle large retryAfter values', () => {
    const response = createRateLimitErrorResponse(3600);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('3600');
  });

  it('should return RATE_LIMIT_EXCEEDED code', async () => {
    const response = createRateLimitErrorResponse();
    const json = await response.json();

    expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should include retryAfter in details when provided', async () => {
    const response = createRateLimitErrorResponse(60);
    const json = await response.json();

    expect(json.error.details.retryAfter).toBe(60);
  });
});

describe('error response format', () => {
  it('should return consistent format for all error types', async () => {
    const responses = [
      createErrorResponse(ErrorCode.BAD_REQUEST, 'Bad request'),
      createValidationErrorResponse('field', 'Invalid'),
      createNotFoundErrorResponse('Resource'),
      createUnauthorizedErrorResponse(),
      createForbiddenErrorResponse(),
      createRateLimitErrorResponse(),
    ];

    for (const response of responses) {
      const json = await response.json();

      expect(json).toHaveProperty('success');
      expect(json.success).toBe(false);
      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('code');
      expect(json.error).toHaveProperty('message');
    }
  });

  it('should include timestamp in error response', async () => {
    const response = createErrorResponse(ErrorCode.BAD_REQUEST, 'Test');
    const json = await response.json();

    expect(json).toHaveProperty('meta');
    expect(json.meta).toHaveProperty('timestamp');
    expect(typeof json.meta.timestamp).toBe('number');
  });
});
