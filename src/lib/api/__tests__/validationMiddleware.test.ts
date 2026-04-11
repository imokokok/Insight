import { type NextRequest } from 'next/server';

import {
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validate,
  validateField,
} from '../middleware/validationMiddleware';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../validation', () => ({
  validateObject: jest.fn(),
}));

const { validateObject } = require('../validation');

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
    json: jest.fn().mockResolvedValue(body || {}),
  } as unknown as NextRequest;
}

describe('validationMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createValidationMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createValidationMiddleware({});

      expect(typeof middleware).toBe('function');
    });

    it('should return success when no validation options', async () => {
      const middleware = createValidationMiddleware({});
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should validate body successfully', async () => {
      const schema = { name: { required: true } };
      const body = { name: 'test' };

      validateObject.mockReturnValue({
        valid: true,
        data: body,
      });

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body });

      const result = await middleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toEqual(body);
      }
    });

    it('should return error when body validation fails', async () => {
      const schema = { name: { required: true } };

      validateObject.mockReturnValue({
        valid: false,
        errors: [{ field: 'name', message: 'Required' }],
      });

      const middleware = createValidationMiddleware({ body: schema });
      const request = createMockRequest({ body: {} });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('should handle invalid JSON in body', async () => {
      const schema = { name: { required: true } };
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const middleware = createValidationMiddleware({ body: schema });
      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('should validate query parameters successfully', async () => {
      const schema = { page: { required: false } };

      validateObject.mockReturnValue({
        valid: true,
        data: { page: '1' },
      });

      const middleware = createValidationMiddleware({ query: schema });
      const request = createMockRequest({
        url: 'http://localhost/api/test?page=1',
      });

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should return error when query validation fails', async () => {
      const schema = { page: { required: true } };

      validateObject.mockReturnValue({
        valid: false,
        errors: [{ field: 'page', message: 'Required' }],
      });

      const middleware = createValidationMiddleware({ query: schema });
      const request = createMockRequest({
        url: 'http://localhost/api/test',
      });

      const result = await middleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('should handle multiple query values', async () => {
      const schema = { tags: {} };

      validateObject.mockReturnValue({
        valid: true,
        data: { tags: ['a', 'b'] },
      });

      const middleware = createValidationMiddleware({ query: schema });
      const request = createMockRequest({
        url: 'http://localhost/api/test?tags=a&tags=b',
      });

      await middleware(request);
    });

    it('should validate route params successfully', async () => {
      const schema = { id: { required: true } };
      const params = { id: '123' };

      validateObject.mockReturnValue({
        valid: true,
        data: params,
      });

      const middleware = createValidationMiddleware({ params: schema });
      const request = createMockRequest();

      const result = await middleware(request, params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.params).toEqual(params);
      }
    });

    it('should return error when params validation fails', async () => {
      const schema = { id: { required: true } };

      validateObject.mockReturnValue({
        valid: false,
        errors: [{ field: 'id', message: 'Required' }],
      });

      const middleware = createValidationMiddleware({ params: schema });
      const request = createMockRequest();

      const result = await middleware(request, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
      }
    });

    it('should skip params validation when no params provided', async () => {
      const schema = { id: { required: true } };
      const middleware = createValidationMiddleware({ params: schema });
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.success).toBe(true);
    });

    it('should validate all sources together', async () => {
      const bodySchema = { name: { required: true } };
      const querySchema = { page: {} };
      const paramsSchema = { id: { required: true } };

      validateObject
        .mockReturnValueOnce({ valid: true, data: { name: 'test' } })
        .mockReturnValueOnce({ valid: true, data: { page: '1' } })
        .mockReturnValueOnce({ valid: true, data: { id: '123' } });

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
        expect(result.data.query).toEqual({ page: '1' });
        expect(result.data.params).toEqual({ id: '123' });
      }
    });
  });

  describe('validateBody', () => {
    it('should create middleware for body validation', () => {
      const schema = { name: { required: true } };
      const middleware = validateBody(schema);

      expect(typeof middleware).toBe('function');
    });
  });

  describe('validateQuery', () => {
    it('should create middleware for query validation', () => {
      const schema = { page: {} };
      const middleware = validateQuery(schema);

      expect(typeof middleware).toBe('function');
    });
  });

  describe('validateParams', () => {
    it('should create middleware for params validation', () => {
      const schema = { id: { required: true } };
      const middleware = validateParams(schema);

      expect(typeof middleware).toBe('function');
    });
  });

  describe('validate', () => {
    it('should create middleware with all validation options', () => {
      const options = {
        body: { name: { required: true } },
        query: { page: {} },
        params: { id: { required: true } },
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
