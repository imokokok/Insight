import { type NextRequest } from 'next/server';

import {
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validate,
  validateField,
} from '@/lib/api/middleware/validationMiddleware';
import { validateObject, type ObjectSchema } from '@/lib/api/validation/schemas';
import {
  isString,
  isNumber,
  isInteger,
  isEmail,
  isUrl,
  isUuid,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  oneOf,
  isArray,
  isObject,
  chain,
  optional,
} from '@/lib/api/validation/validators';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  const { method = 'POST', url = 'http://localhost/api/test', headers = {}, body } = options;

  return {
    method,
    url,
    headers: new Headers(headers),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue(body || {}),
  } as unknown as NextRequest;
}

// eslint-disable-next-line max-lines-per-function
describe('API Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Parameter Validation', () => {
    describe('Body Validation', () => {
      it('should validate request body successfully', async () => {
        const schema: ObjectSchema = {
          name: { validators: [isString, minLength(1)], required: true },
          age: { validators: [isNumber, min(0), max(150)], required: true },
        };
        const body = { name: 'John', age: 30 };

        const middleware = createValidationMiddleware({ body: schema });
        const request = createMockRequest({ body });

        const result = await middleware(request);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.body).toEqual(body);
        }
      });

      it('should return 400 when body validation fails', async () => {
        const schema: ObjectSchema = {
          name: { validators: [isString, minLength(1)], required: true },
        };

        const middleware = createValidationMiddleware({ body: schema });
        const request = createMockRequest({ body: { name: '' } });

        const result = await middleware(request);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response.status).toBe(400);
        }
      });

      it('should validate nested object in body', async () => {
        const schema: ObjectSchema = {
          user: { validators: [isObject], required: true },
        };
        const body = { user: { name: 'John', email: 'john@example.com' } };

        const middleware = createValidationMiddleware({ body: schema });
        const request = createMockRequest({ body });

        const result = await middleware(request);

        expect(result.success).toBe(true);
      });

      it('should validate array in body', async () => {
        const schema: ObjectSchema = {
          tags: { validators: [isArray], required: true },
        };
        const body = { tags: ['tag1', 'tag2'] };

        const middleware = createValidationMiddleware({ body: schema });
        const request = createMockRequest({ body });

        const result = await middleware(request);

        expect(result.success).toBe(true);
      });
    });

    describe('Query Parameter Validation', () => {
      it('should validate query parameters successfully', async () => {
        const schema: ObjectSchema = {
          page: {
            validators: [isInteger, min(1)],
            required: false,
            transform: (v) => (v === undefined ? undefined : Number(v)),
          },
          limit: {
            validators: [isInteger, min(1), max(100)],
            required: false,
            transform: (v) => (v === undefined ? undefined : Number(v)),
          },
        };

        const middleware = createValidationMiddleware({ query: schema });
        const request = createMockRequest({
          url: 'http://localhost/api/test?page=1&limit=20',
        });

        const result = await middleware(request);

        expect(result.success).toBe(true);
      });

      it('should return 400 when query validation fails', async () => {
        const schema: ObjectSchema = {
          page: { validators: [isInteger, min(1)], required: true },
        };

        const middleware = createValidationMiddleware({ query: schema });
        const request = createMockRequest({
          url: 'http://localhost/api/test?page=-1',
        });

        const result = await middleware(request);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response.status).toBe(400);
        }
      });

      it('should handle multiple query values as array', async () => {
        const schema: ObjectSchema = {
          tags: { validators: [isArray], required: false },
        };

        const middleware = createValidationMiddleware({ query: schema });
        const request = createMockRequest({
          url: 'http://localhost/api/test?tags=a&tags=b',
        });

        await middleware(request);
      });

      it('should handle missing optional query parameters', async () => {
        const schema: ObjectSchema = {
          page: { validators: [isInteger], required: false },
        };

        const middleware = createValidationMiddleware({ query: schema });
        const request = createMockRequest({
          url: 'http://localhost/api/test',
        });

        const result = await middleware(request);

        expect(result.success).toBe(true);
      });
    });

    describe('Route Params Validation', () => {
      it('should validate route params successfully', async () => {
        const schema: ObjectSchema = {
          id: { validators: [isString, minLength(1)], required: true },
        };
        const params = { id: '123' };

        const middleware = createValidationMiddleware({ params: schema });
        const request = createMockRequest();

        const result = await middleware(request, params);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.params).toEqual(params);
        }
      });

      it('should return 400 when params validation fails', async () => {
        const schema: ObjectSchema = {
          id: { validators: [isUuid], required: true },
        };

        const middleware = createValidationMiddleware({ params: schema });
        const request = createMockRequest();

        const result = await middleware(request, { id: 'invalid-uuid' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response.status).toBe(400);
        }
      });

      it('should skip params validation when no params provided', async () => {
        const schema: ObjectSchema = {
          id: { validators: [isString], required: true },
        };
        const middleware = createValidationMiddleware({ params: schema });
        const request = createMockRequest();

        const result = await middleware(request);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent error response format', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: {} });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body).toHaveProperty('success');
        expect(body.success).toBe(false);
        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('code');
        expect(body.error).toHaveProperty('message');
      }
    });

    it('should include validation errors in response details', async () => {
      const schema: ObjectSchema = {
        email: { validators: [isEmail], required: true },
        age: { validators: [isInteger, min(0), max(150)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { email: 'invalid', age: 200 } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.details).toHaveProperty('errors');
      }
    });
  });

  describe('Error Response Format', () => {
    it('should return BAD_REQUEST for invalid JSON', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
      };
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const middleware = createValidationMiddleware({ body: schema });
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.code).toBe('BAD_REQUEST');
      }
    });

    it('should return VALIDATION_ERROR for validation failures', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString, minLength(5)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { name: 'ab' } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Boundary Values', () => {
    it('should validate minimum boundary value', async () => {
      const schema: ObjectSchema = {
        count: { validators: [isInteger, min(0)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { count: 0 } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should validate maximum boundary value', async () => {
      const schema: ObjectSchema = {
        count: { validators: [isInteger, max(100)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { count: 100 } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should reject value below minimum', async () => {
      const schema: ObjectSchema = {
        count: { validators: [isInteger, min(1)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { count: 0 } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });

    it('should reject value above maximum', async () => {
      const schema: ObjectSchema = {
        count: { validators: [isInteger, max(100)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { count: 101 } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });

    it('should validate string minimum length boundary', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString, minLength(3)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { name: 'abc' } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should validate string maximum length boundary', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString, maxLength(10)], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { name: '1234567890' } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should handle very large numbers', async () => {
      const schema: ObjectSchema = {
        value: { validators: [isNumber], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { value: Number.MAX_SAFE_INTEGER } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should handle negative numbers', async () => {
      const schema: ObjectSchema = {
        value: { validators: [isNumber], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { value: -100 } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should handle decimal numbers', async () => {
      const schema: ObjectSchema = {
        value: { validators: [isNumber], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { value: 3.14159 } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should reject Infinity values', async () => {
      const schema: ObjectSchema = {
        value: { validators: [isNumber], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { value: Infinity } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });

    it('should reject NaN values', async () => {
      const schema: ObjectSchema = {
        value: { validators: [isNumber], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { value: NaN } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });
  });

  describe('Type Coercion', () => {
    it('should transform values using transform function', async () => {
      const schema: ObjectSchema = {
        page: {
          validators: [isInteger],
          required: false,
          transform: (v) => (v === undefined ? 1 : Number(v)),
        },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: {} });

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body?.page).toBe(1);
      }
    });

    it('should coerce string number to number', async () => {
      const schema: ObjectSchema = {
        count: {
          validators: [isInteger],
          required: true,
          transform: (v) => Number(v),
        },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { count: '42' } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body?.count).toBe(42);
        expect(typeof result.data.body?.count).toBe('number');
      }
    });

    it('should handle transform that returns undefined', async () => {
      const schema: ObjectSchema = {
        optional: {
          validators: [],
          required: false,
          transform: () => undefined,
        },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { optional: 'value' } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });
  });

  describe('Required Field Validation', () => {
    it('should pass when required field is provided', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { name: 'John' } });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should fail when required field is missing', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: {} });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });

    it('should fail when required field is null', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { name: null } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });

    it('should fail when required field is undefined', async () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { name: undefined } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });

    it('should pass when optional field is missing', async () => {
      const schema: ObjectSchema = {
        nickname: { validators: [isString], required: false },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: {} });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should validate multiple required fields', async () => {
      const schema: ObjectSchema = {
        firstName: { validators: [isString], required: true },
        lastName: { validators: [isString], required: true },
        email: { validators: [isEmail], required: true },
      };

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: { firstName: 'John' } });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const body = await result.response.json();
        expect(body.error.details.errors.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Validator Functions', () => {
    describe('isString', () => {
      it('should pass for valid strings', () => {
        const result = isString('hello', 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for numbers', () => {
        const result = isString(123, 'field');
        expect(result.valid).toBe(false);
      });

      it('should fail for booleans', () => {
        const result = isString(true, 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('should pass for valid numbers', () => {
        const result = isNumber(42, 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for strings', () => {
        const result = isNumber('42', 'field');
        expect(result.valid).toBe(false);
      });

      it('should fail for Infinity', () => {
        const result = isNumber(Infinity, 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('isInteger', () => {
      it('should pass for integers', () => {
        const result = isInteger(42, 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for decimals', () => {
        const result = isInteger(3.14, 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('isEmail', () => {
      it('should pass for valid emails', () => {
        const result = isEmail('test@example.com', 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid emails', () => {
        const result = isEmail('invalid-email', 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('isUrl', () => {
      it('should pass for valid URLs', () => {
        const result = isUrl('https://example.com', 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid URLs', () => {
        const result = isUrl('not-a-url', 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('isUuid', () => {
      it('should pass for valid UUIDs', () => {
        const result = isUuid('550e8400-e29b-41d4-a716-446655440000', 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid UUIDs', () => {
        const result = isUuid('not-a-uuid', 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('oneOf', () => {
      it('should pass for values in the list', () => {
        const validator = oneOf(['admin', 'user', 'guest'] as const);
        const result = validator('admin', 'role');
        expect(result.valid).toBe(true);
      });

      it('should fail for values not in the list', () => {
        const validator = oneOf(['admin', 'user', 'guest'] as const);
        const result = validator('superadmin', 'role');
        expect(result.valid).toBe(false);
      });
    });

    describe('pattern', () => {
      it('should pass for matching patterns', () => {
        const validator = pattern(/^[A-Z]+$/);
        const result = validator('ABC', 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail for non-matching patterns', () => {
        const validator = pattern(/^[A-Z]+$/);
        const result = validator('abc', 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('chain', () => {
      it('should chain multiple validators', () => {
        const validator = chain(isString, minLength(3), maxLength(10));
        const result = validator('hello', 'field');
        expect(result.valid).toBe(true);
      });

      it('should fail on first failing validator', () => {
        const validator = chain(isString, minLength(10));
        const result = validator('hi', 'field');
        expect(result.valid).toBe(false);
      });
    });

    describe('optional', () => {
      it('should pass for undefined values', () => {
        const validator = optional(isString);
        const result = validator(undefined, 'field');
        expect(result.valid).toBe(true);
      });

      it('should validate non-undefined values', () => {
        const validator = optional(isString);
        const result = validator('hello', 'field');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Middleware Helpers', () => {
    describe('validateBody', () => {
      it('should create middleware for body validation', () => {
        const schema: ObjectSchema = { name: { validators: [isString], required: true } };
        const middleware = validateBody(schema);

        expect(typeof middleware).toBe('function');
      });
    });

    describe('validateQuery', () => {
      it('should create middleware for query validation', () => {
        const schema: ObjectSchema = { page: { validators: [isInteger], required: false } };
        const middleware = validateQuery(schema);

        expect(typeof middleware).toBe('function');
      });
    });

    describe('validateParams', () => {
      it('should create middleware for params validation', () => {
        const schema: ObjectSchema = { id: { validators: [isString], required: true } };
        const middleware = validateParams(schema);

        expect(typeof middleware).toBe('function');
      });
    });

    describe('validate', () => {
      it('should create middleware with all validation options', () => {
        const options = {
          body: { name: { validators: [isString], required: true } },
          query: { page: { validators: [isInteger], required: false } },
          params: { id: { validators: [isString], required: true } },
        };
        const middleware = validate(options);

        expect(typeof middleware).toBe('function');
      });
    });

    describe('validateField', () => {
      it('should return value when validation passes', () => {
        const validator = jest.fn().mockReturnValue({
          valid: true,
          value: 'test',
        });

        const result = validateField('test', validator, 'name');

        expect(result).toBe('test');
      });

      it('should throw error when validation fails', () => {
        const validationError = new Error('Validation failed');
        const validator = jest.fn().mockReturnValue({
          valid: false,
          error: validationError,
        });

        expect(() => validateField('', validator, 'name')).toThrow(validationError);
      });
    });
  });

  describe('Combined Validation', () => {
    it('should validate all sources together', async () => {
      const bodySchema: ObjectSchema = {
        name: { validators: [isString, minLength(1)], required: true },
      };
      const querySchema: ObjectSchema = {
        page: {
          validators: [isInteger, min(1)],
          required: false,
          transform: (v) => (v === undefined ? undefined : Number(v)),
        },
      };
      const paramsSchema: ObjectSchema = {
        id: { validators: [isString, minLength(1)], required: true },
      };

      const middleware = createValidationMiddleware({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      });
      const request = createMockRequest({
        body: { name: 'test' },
        url: 'http://localhost/api/test?page=1',
      });

      const result = await middleware(request, { id: '123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toEqual({ name: 'test' });
        expect(result.data.query).toBeDefined();
        expect(result.data.params).toEqual({ id: '123' });
      }
    });

    it('should fail on first validation error', async () => {
      const bodySchema: ObjectSchema = {
        name: { validators: [isString, minLength(10)], required: true },
      };
      const querySchema: ObjectSchema = {
        page: { validators: [isInteger, min(1)], required: true },
      };

      const middleware = createValidationMiddleware({
        body: bodySchema,
        query: querySchema,
      });
      const request = createMockRequest({
        body: { name: 'ab' },
        url: 'http://localhost/api/test?page=1',
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
    });
  });

  describe('validateObject', () => {
    it('should return valid result for valid data', () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: true },
        age: { validators: [isNumber], required: true },
      };
      const data = { name: 'John', age: 30 };

      const result = validateObject(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should return errors for invalid data', () => {
      const schema: ObjectSchema = {
        name: { validators: [isString, minLength(3)], required: true },
      };
      const data = { name: 'ab' };

      const result = validateObject(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty schema', () => {
      const schema: ObjectSchema = {};
      const data = { name: 'John' };

      const result = validateObject(data, schema);

      expect(result.isValid).toBe(true);
    });

    it('should handle empty data', () => {
      const schema: ObjectSchema = {
        name: { validators: [isString], required: false },
      };
      const data = {};

      const result = validateObject(data, schema);

      expect(result.isValid).toBe(true);
    });
  });
});
