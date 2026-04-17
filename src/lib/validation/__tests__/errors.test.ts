import { ZodError, z } from 'zod';

import { ZodValidationError, handleZodError, isZodValidationError } from '../errors';

describe('ZodValidationError', () => {
  describe('constructor', () => {
    it('should create error with message and zodError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string',
        },
      ]);

      const error = new ZodValidationError('Validation failed', zodError);

      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ZodValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.zodError).toBe(zodError);
    });

    it('should create error with details', () => {
      const zodError = new ZodError([]);
      const details = { errors: [{ field: 'name', message: 'Required' }] };

      const error = new ZodValidationError('Validation failed', zodError, details);

      expect(error.details).toEqual(details);
    });

    it('should have correct error properties', () => {
      const zodError = new ZodError([]);
      const error = new ZodValidationError('Test error', zodError);

      expect(error.category).toBe('validation');
      expect(error.severity).toBe('low');
    });
  });

  describe('fromZodError', () => {
    it('should create ZodValidationError from single issue', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string',
        },
      ]);

      const error = ZodValidationError.fromZodError(zodError);

      expect(error.message).toBe('Validation error: Expected string');
      expect(error.details?.errors).toEqual([{ field: 'name', message: 'Expected string' }]);
    });

    it('should create ZodValidationError from multiple issues', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string',
        },
        { code: 'too_small', minimum: 1, path: ['email'], message: 'Required' },
      ]);

      const error = ZodValidationError.fromZodError(zodError);

      expect(error.message).toBe('Validation failed with 2 errors');
      expect(error.details?.errors).toHaveLength(2);
      expect(error.details?.errors).toEqual([
        { field: 'name', message: 'Expected string' },
        { field: 'email', message: 'Required' },
      ]);
    });

    it('should handle nested path', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['user', 'profile', 'name'],
          message: 'Invalid',
        },
      ]);

      const error = ZodValidationError.fromZodError(zodError);

      expect(error.details?.errors?.[0].field).toBe('user.profile.name');
    });

    it('should handle root level path', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: [],
          message: 'Invalid root',
        },
      ]);

      const error = ZodValidationError.fromZodError(zodError);

      expect(error.details?.errors?.[0].field).toBe('root');
    });
  });

  describe('toResponse', () => {
    it('should return formatted error response', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string',
        },
      ]);

      const error = ZodValidationError.fromZodError(zodError);
      const response = error.toResponse();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Validation error: Expected string');
      expect(response.error.details).toBeDefined();
      expect(response.timestamp).toBeGreaterThan(0);
    });
  });

  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const zodError = new ZodError([]);
      const error = new ZodValidationError('Test', zodError);

      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const zodError = new ZodError([]);
      const error = new ZodValidationError('Test', zodError);

      expect(error.stack).toBeDefined();
    });
  });
});

describe('handleZodError', () => {
  it('should throw ZodValidationError', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
    ]);

    expect(() => handleZodError(zodError)).toThrow(ZodValidationError);
  });

  it('should preserve error details in thrown error', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string',
      },
    ]);

    try {
      handleZodError(zodError);
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      if (error instanceof ZodValidationError) {
        expect(error.details?.errors).toHaveLength(1);
        expect(error.details?.errors?.[0].field).toBe('name');
      }
    }
  });
});

describe('isZodValidationError', () => {
  it('should return true for ZodValidationError', () => {
    const zodError = new ZodError([]);
    const error = new ZodValidationError('Test', zodError);

    expect(isZodValidationError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Regular error');

    expect(isZodValidationError(error)).toBe(false);
  });

  it('should return false for ZodError', () => {
    const zodError = new ZodError([]);

    expect(isZodValidationError(zodError)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isZodValidationError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isZodValidationError(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(isZodValidationError({ message: 'error' })).toBe(false);
  });
});

describe('integration with zod schemas', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
    email: z.string().email(),
  });

  it('should handle schema validation errors', () => {
    const result = testSchema.safeParse({
      name: '',
      age: -1,
      email: 'invalid',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = ZodValidationError.fromZodError(result.error);

      expect(error.details?.errors).toHaveLength(3);
    }
  });

  it('should handle valid data', () => {
    const result = testSchema.safeParse({
      name: 'John',
      age: 25,
      email: 'john@example.com',
    });

    expect(result.success).toBe(true);
  });
});
