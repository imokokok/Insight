import { type NextRequest } from 'next/server';

import { z } from 'zod';

import { validateBodySchema, validateParamsSchema, validateQuerySchema } from '../middleware';

function createMockRequest(
  options: { body?: unknown; query?: Record<string, string> } = {}
): NextRequest {
  const url = new URL('http://localhost/api/test');
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  return {
    url: url.toString(),
    method: 'POST',
    json: jest.fn().mockResolvedValue(options.body ?? {}),
    clone: jest.fn(function (this: NextRequest) {
      return this;
    }),
    headers: new Headers(),
    nextUrl: url,
  } as unknown as NextRequest;
}

describe('validation middleware', () => {
  describe('validateBodySchema', () => {
    const BodySchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    it('should return success with parsed body', async () => {
      const request = createMockRequest({ body: { name: 'Alice', age: 30 } });
      const result = await validateBodySchema(BodySchema)(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body).toEqual({ name: 'Alice', age: 30 });
      }
    });

    it('should return error response for invalid body', async () => {
      const request = createMockRequest({ body: { name: '', age: -1 } });
      const result = await validateBodySchema(BodySchema)(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const body = JSON.parse(await result.response.text());
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for invalid JSON', async () => {
      const request = createMockRequest();
      request.json = jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'));

      const result = await validateBodySchema(BodySchema)(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const body = JSON.parse(await result.response.text());
        expect(body.error.code).toBe('BAD_REQUEST');
      }
    });

    it('should reject GET requests with body', async () => {
      const request = createMockRequest({ body: { name: 'Alice', age: 30 } });
      request.method = 'GET';

      const result = await validateBodySchema(BodySchema)(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(405);
      }
    });
  });

  describe('validateParamsSchema', () => {
    const ParamsSchema = z.object({
      id: z.string().uuid(),
    });

    it('should return success with parsed params', async () => {
      const params = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = await validateParamsSchema(ParamsSchema)({} as NextRequest, params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.params).toEqual(params);
      }
    });

    it('should return error response for invalid params', async () => {
      const result = await validateParamsSchema(ParamsSchema)({} as NextRequest, {
        id: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const body = JSON.parse(await result.response.text());
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('validateQuerySchema', () => {
    const QuerySchema = z.object({
      limit: z.number().positive().max(100),
    });

    it('should return success with parsed query', async () => {
      const request = createMockRequest({ query: { limit: '10' } });
      request.method = 'GET';

      const result = await validateQuerySchema(QuerySchema)(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toEqual({ limit: 10 });
      }
    });

    it('should return error response for invalid query', async () => {
      const request = createMockRequest({ query: { limit: '999' } });
      request.method = 'GET';

      const result = await validateQuerySchema(QuerySchema)(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const body = JSON.parse(await result.response.text());
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
