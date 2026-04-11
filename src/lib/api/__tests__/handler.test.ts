import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createGetHandler,
  createPostHandler,
  createPutHandler,
  createPatchHandler,
  createDeleteHandler,
  createCrudHandlers,
  withMiddleware,
  type ApiHandlerContext,
  type ApiHandler,
  type MiddlewareConfig,
  type CreateApiHandlerOptions,
} from '../handler';

jest.mock('../middleware', () => ({
  createAuthMiddleware: jest.fn(),
  createValidationMiddleware: jest.fn(),
  createLoggingMiddleware: jest.fn(),
  createErrorMiddleware: jest.fn(),
  createRateLimitMiddleware: jest.fn(),
  logResponse: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const {
  createAuthMiddleware,
  createValidationMiddleware,
  createLoggingMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  logResponse,
} = require('../middleware');

function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}): NextRequest {
  const { method = 'GET', url = 'http://localhost/api/test', headers = {}, body } = options;

  const mockRequest = {
    method,
    url,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body || {}),
    text: jest.fn().mockResolvedValue(''),
    clone: jest.fn().mockReturnThis(),
  } as unknown as NextRequest;

  return mockRequest;
}

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockErrorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    const mockErrorMiddleware = jest.fn().mockReturnValue(mockErrorResponse);
    createErrorMiddleware.mockReturnValue(mockErrorMiddleware);
  });

  describe('createApiHandler', () => {
    it('should create a handler function', () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const handler = createApiHandler(mockHandler);

      expect(typeof handler).toBe('function');
    });

    it('should call handler with request and context', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createApiHandler(mockHandler);
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(mockHandler).toHaveBeenCalledWith(request, expect.objectContaining({
        requestId: expect.any(String),
      }));
    });

    it('should generate unique request IDs', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createApiHandler(mockHandler);
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });
      await handler(request, { params: Promise.resolve({}) });

      const calls = mockHandler.mock.calls;
      expect(calls[0][1].requestId).not.toBe(calls[1][1].requestId);
    });

    it('should use logging middleware for request ID when configured', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      createLoggingMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        requestId: 'log-request-id',
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: { logging: true },
      });
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(mockHandler).toHaveBeenCalledWith(request, expect.objectContaining({
        requestId: 'log-request-id',
      }));
    });

    it('should apply auth middleware when configured', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      createAuthMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: true,
        context: { userId: 'user-123' },
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: { auth: true },
      });
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(createAuthMiddleware).toHaveBeenCalledWith({ required: true });
      expect(mockHandler).toHaveBeenCalledWith(request, expect.objectContaining({
        auth: { userId: 'user-123' },
      }));
    });

    it('should return 401 when auth middleware fails', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const mockResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      createAuthMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: false,
        response: mockResponse,
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: { auth: true },
      });
      const request = createMockRequest();

      const result = await handler(request, { params: Promise.resolve({}) });

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
      expect(logResponse).toHaveBeenCalledWith(expect.any(String), 401, expect.any(Number));
    });

    it('should apply auth middleware with options object', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      createAuthMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: true,
        context: { userId: 'user-123' },
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: {
          auth: { required: true, roles: ['admin'] },
        },
      });
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(createAuthMiddleware).toHaveBeenCalledWith({ required: true, roles: ['admin'] });
    });

    it('should apply validation middleware when configured', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const validatedData = { body: { name: 'test' } };
      createValidationMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: true,
        data: validatedData,
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: {
          validation: { body: { name: { required: true } } },
        },
      });
      const request = createMockRequest();
      const params = { id: '123' };

      await handler(request, { params: Promise.resolve(params) });

      expect(createValidationMiddleware).toHaveBeenCalledWith({ body: { name: { required: true } } });
      expect(mockHandler).toHaveBeenCalledWith(request, expect.objectContaining({
        validated: validatedData,
      }));
    });

    it('should return 400 when validation middleware fails', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const mockResponse = NextResponse.json({ error: 'Validation failed' }, { status: 400 });
      createValidationMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: false,
        response: mockResponse,
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: { validation: { body: {} } },
      });
      const request = createMockRequest();

      const result = await handler(request, { params: Promise.resolve({}) });

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result.status).toBe(400);
      expect(logResponse).toHaveBeenCalledWith(expect.any(String), 400, expect.any(Number));
    });

    it('should apply rate limit middleware when configured', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      createRateLimitMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: true,
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: { rateLimit: true },
      });
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(createRateLimitMiddleware).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should return 429 when rate limit is exceeded', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const mockResponse = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      createRateLimitMiddleware.mockReturnValue(jest.fn().mockResolvedValue({
        success: false,
        response: mockResponse,
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: { rateLimit: true },
      });
      const request = createMockRequest();

      const result = await handler(request, { params: Promise.resolve({}) });

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result.status).toBe(429);
      expect(logResponse).toHaveBeenCalledWith(expect.any(String), 429, expect.any(Number));
    });

    it('should handle errors with error middleware', async () => {
      const error = new Error('Test error');
      const mockHandler: ApiHandler = jest.fn().mockRejectedValue(error);
      const mockErrorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      const mockErrorMiddleware = jest.fn().mockReturnValue(mockErrorResponse);
      createErrorMiddleware.mockReturnValue(mockErrorMiddleware);

      const handler = createApiHandler(mockHandler);
      const request = createMockRequest();

      const result = await handler(request, { params: Promise.resolve({}) });

      expect(mockErrorMiddleware).toHaveBeenCalledWith(error, expect.any(String));
      expect(result.status).toBe(500);
      expect(logResponse).toHaveBeenCalledWith(expect.any(String), 500, expect.any(Number));
    });

    it('should call custom error handler when provided', async () => {
      const error = new Error('Test error');
      const mockHandler: ApiHandler = jest.fn().mockRejectedValue(error);
      const customErrorResponse = NextResponse.json({ error: 'Custom error' }, { status: 400 });
      const onError = jest.fn().mockResolvedValue(customErrorResponse);

      const handler = createApiHandler(mockHandler, { onError });
      const request = createMockRequest();

      const result = await handler(request, { params: Promise.resolve({}) });

      expect(onError).toHaveBeenCalledWith(error, expect.objectContaining({
        requestId: expect.any(String),
      }));
      expect(result.status).toBe(400);
    });

    it('should fallback to error middleware when custom error handler throws', async () => {
      const error = new Error('Test error');
      const mockHandler: ApiHandler = jest.fn().mockRejectedValue(error);
      const handlerError = new Error('Handler error');
      const onError = jest.fn().mockRejectedValue(handlerError);
      const mockErrorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      const mockErrorMiddleware = jest.fn().mockReturnValue(mockErrorResponse);
      createErrorMiddleware.mockReturnValue(mockErrorMiddleware);

      const handler = createApiHandler(mockHandler, { onError });
      const request = createMockRequest();

      const result = await handler(request, { params: Promise.resolve({}) });

      expect(mockErrorMiddleware).toHaveBeenCalledWith(error, expect.any(String));
      expect(result.status).toBe(500);
    });

    it('should log response on success', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true }, { status: 200 })
      );

      const handler = createApiHandler(mockHandler);
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(logResponse).toHaveBeenCalledWith(
        expect.any(String),
        200,
        expect.any(Number)
      );
    });

    it('should apply middlewares in correct order', async () => {
      const order: string[] = [];
      const mockHandler: ApiHandler = jest.fn().mockImplementation(async () => {
        order.push('handler');
        return NextResponse.json({ success: true });
      });

      createLoggingMiddleware.mockReturnValue(jest.fn().mockResolvedValue({ requestId: 'test-id' }));
      createRateLimitMiddleware.mockReturnValue(jest.fn().mockImplementation(async () => {
        order.push('rateLimit');
        return { success: true };
      }));
      createAuthMiddleware.mockReturnValue(jest.fn().mockImplementation(async () => {
        order.push('auth');
        return { success: true, context: { userId: 'test' } };
      }));
      createValidationMiddleware.mockReturnValue(jest.fn().mockImplementation(async () => {
        order.push('validation');
        return { success: true, data: {} };
      }));

      const handler = createApiHandler(mockHandler, {
        middlewares: {
          logging: true,
          rateLimit: true,
          auth: true,
          validation: { body: {} },
        },
      });
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(order).toEqual(['rateLimit', 'auth', 'validation', 'handler']);
    });
  });

  describe('HTTP method handlers', () => {
    it('createGetHandler should create a GET handler', () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createGetHandler(mockHandler);

      expect(typeof handler).toBe('function');
    });

    it('createPostHandler should create a POST handler', () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createPostHandler(mockHandler);

      expect(typeof handler).toBe('function');
    });

    it('createPutHandler should create a PUT handler', () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createPutHandler(mockHandler);

      expect(typeof handler).toBe('function');
    });

    it('createPatchHandler should create a PATCH handler', () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createPatchHandler(mockHandler);

      expect(typeof handler).toBe('function');
    });

    it('createDeleteHandler should create a DELETE handler', () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const handler = createDeleteHandler(mockHandler);

      expect(typeof handler).toBe('function');
    });

    it('all method handlers should accept options', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      createAuthMiddleware.mockReturnValue({
        success: true,
        context: { userId: 'test' },
      });

      const handler = createGetHandler(mockHandler, {
        middlewares: { auth: true },
      });
      const request = createMockRequest();

      await handler(request, { params: Promise.resolve({}) });

      expect(createAuthMiddleware).toHaveBeenCalled();
    });
  });

  describe('createCrudHandlers', () => {
    it('should create CRUD handlers object', () => {
      const handlers = createCrudHandlers({});

      expect(handlers).toHaveProperty('GET');
      expect(handlers).toHaveProperty('POST');
      expect(handlers).toHaveProperty('PUT');
      expect(handlers).toHaveProperty('PATCH');
      expect(handlers).toHaveProperty('DELETE');
    });

    it('should create handlers for provided operations', () => {
      const listHandler = jest.fn().mockResolvedValue(NextResponse.json([]));
      const getHandler = jest.fn().mockResolvedValue(NextResponse.json({}));
      const createHandler = jest.fn().mockResolvedValue(NextResponse.json({}));
      const updateHandler = jest.fn().mockResolvedValue(NextResponse.json({}));
      const deleteHandler = jest.fn().mockResolvedValue(NextResponse.json({}));

      const handlers = createCrudHandlers({
        list: listHandler,
        get: getHandler,
        create: createHandler,
        update: updateHandler,
        delete: deleteHandler,
      });

      expect(handlers.GET).toBeDefined();
      expect(handlers.POST).toBeDefined();
      expect(handlers.PUT).toBeDefined();
      expect(handlers.PATCH).toBeDefined();
      expect(handlers.DELETE).toBeDefined();
    });

    it('should not create handlers for undefined operations', () => {
      const handlers = createCrudHandlers({
        list: jest.fn().mockResolvedValue(NextResponse.json([])),
      });

      expect(handlers.GET).toBeDefined();
      expect(handlers.POST).toBeUndefined();
      expect(handlers.PUT).toBeUndefined();
      expect(handlers.DELETE).toBeUndefined();
    });

    it('should pass options to all handlers', async () => {
      createAuthMiddleware.mockReturnValue({
        success: true,
        context: { userId: 'test' },
      });

      const handlers = createCrudHandlers(
        {
          list: jest.fn().mockResolvedValue(NextResponse.json([])),
          create: jest.fn().mockResolvedValue(NextResponse.json({})),
        },
        { middlewares: { auth: true } }
      );

      const request = createMockRequest();

      if (handlers.GET) {
        await handlers.GET(request, { params: Promise.resolve({}) });
      }
      if (handlers.POST) {
        await handlers.POST(request, { params: Promise.resolve({}) });
      }

      expect(createAuthMiddleware).toHaveBeenCalledTimes(2);
    });

    it('should use same update handler for PUT and PATCH', () => {
      const updateHandler = jest.fn().mockResolvedValue(NextResponse.json({}));

      const handlers = createCrudHandlers({
        update: updateHandler,
      });

      expect(handlers.PUT).toBeDefined();
      expect(handlers.PATCH).toBeDefined();
    });
  });

  describe('withMiddleware', () => {
    it('should apply middlewares in order', async () => {
      const order: string[] = [];
      const mockHandler: ApiHandler = jest.fn().mockImplementation(async () => {
        order.push('handler');
        return NextResponse.json({ success: true });
      });

      const middleware1 = jest.fn().mockImplementation(async () => {
        order.push('middleware1');
      });
      const middleware2 = jest.fn().mockImplementation(async () => {
        order.push('middleware2');
      });

      const wrappedHandler = withMiddleware(mockHandler, middleware1, middleware2);
      const request = createMockRequest();
      const context: ApiHandlerContext = { requestId: 'test-id' };

      await wrappedHandler(request, context);

      expect(order).toEqual(['middleware1', 'middleware2', 'handler']);
    });

    it('should return response from middleware if provided', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const middlewareResponse = NextResponse.json({ blocked: true }, { status: 403 });

      const blockingMiddleware = jest.fn().mockResolvedValue(middlewareResponse);

      const wrappedHandler = withMiddleware(mockHandler, blockingMiddleware);
      const request = createMockRequest();
      const context: ApiHandlerContext = { requestId: 'test-id' };

      const result = await wrappedHandler(request, context);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result.status).toBe(403);
    });

    it('should continue to next middleware if no response returned', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const middleware1 = jest.fn().mockResolvedValue(undefined);
      const middleware2 = jest.fn().mockResolvedValue(undefined);

      const wrappedHandler = withMiddleware(mockHandler, middleware1, middleware2);
      const request = createMockRequest();
      const context: ApiHandlerContext = { requestId: 'test-id' };

      await wrappedHandler(request, context);

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should pass request and context to middlewares', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const middleware = jest.fn().mockResolvedValue(undefined);

      const wrappedHandler = withMiddleware(mockHandler, middleware);
      const request = createMockRequest();
      const context: ApiHandlerContext = { requestId: 'test-id' };

      await wrappedHandler(request, context);

      expect(middleware).toHaveBeenCalledWith(request, context);
    });

    it('should work with no middlewares', async () => {
      const mockHandler: ApiHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));

      const wrappedHandler = withMiddleware(mockHandler);
      const request = createMockRequest();
      const context: ApiHandlerContext = { requestId: 'test-id' };

      const result = await wrappedHandler(request, context);

      expect(mockHandler).toHaveBeenCalled();
      expect(result.status).toBe(200);
    });
  });

  describe('ApiResponseBuilder export', () => {
    it('should export ApiResponseBuilder', () => {
      const { ApiResponseBuilder } = require('../handler');

      expect(ApiResponseBuilder).toBeDefined();
      expect(typeof ApiResponseBuilder.success).toBe('function');
      expect(typeof ApiResponseBuilder.error).toBe('function');
    });
  });
});
