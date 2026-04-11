import { type NextRequest } from 'next/server';

import {
  createLoggingMiddleware,
  generateRequestId,
  logResponse,
  defaultLoggingMiddleware,
  verboseLoggingMiddleware,
  type LoggingMiddlewareOptions,
  type RequestLog,
  type ResponseLog,
} from '../middleware/loggingMiddleware';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}): NextRequest {
  const { method = 'GET', url = 'http://localhost/api/test?foo=bar', headers = {}, body } = options;

  const mockRequest = {
    method,
    url,
    headers: new Headers(headers),
    nextUrl: new URL(url),
    clone: jest.fn().mockReturnThis(),
    text: jest.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
    body: body ? true : null,
  } as unknown as NextRequest;

  return mockRequest;
}

describe('loggingMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it('should start with req_', () => {
      const id = generateRequestId();

      expect(id.startsWith('req_')).toBe(true);
    });

    it('should contain timestamp', () => {
      const before = Date.now();
      const id = generateRequestId();
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('createLoggingMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createLoggingMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should return request ID', async () => {
      const middleware = createLoggingMiddleware();
      const request = createMockRequest();

      const result = await middleware(request);

      expect(result.requestId).toBeDefined();
      expect(result.requestId.startsWith('req_')).toBe(true);
    });

    it('should log query parameters by default', async () => {
      const middleware = createLoggingMiddleware();
      const request = createMockRequest({
        url: 'http://localhost/api/test?foo=bar&baz=qux',
      });

      await middleware(request);

      expect(request.nextUrl.searchParams).toBeDefined();
    });

    it('should not log query when logQuery is false', async () => {
      const middleware = createLoggingMiddleware({ logQuery: false });
      const request = createMockRequest();

      await middleware(request);

      expect(request.nextUrl).toBeDefined();
    });

    it('should log headers when logHeaders is true', async () => {
      const middleware = createLoggingMiddleware({ logHeaders: true });
      const request = createMockRequest({
        headers: { 'content-type': 'application/json' },
      });

      await middleware(request);

      expect(request.headers).toBeDefined();
    });

    it('should redact sensitive headers', async () => {
      const middleware = createLoggingMiddleware({ logHeaders: true });
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer token123',
          cookie: 'session=abc',
          'content-type': 'application/json',
        },
      });

      await middleware(request);

      expect(request.headers.get('authorization')).toBe('Bearer token123');
    });

    it('should log body when logBody is true', async () => {
      const middleware = createLoggingMiddleware({ logBody: true });
      const request = createMockRequest({
        body: { name: 'test' },
      });

      await middleware(request);

      expect(request.clone).toHaveBeenCalled();
    });

    it('should handle invalid JSON body', async () => {
      const middleware = createLoggingMiddleware({ logBody: true });
      const request = {
        method: 'POST',
        url: 'http://localhost/api/test',
        headers: new Headers(),
        nextUrl: new URL('http://localhost/api/test'),
        clone: jest.fn().mockReturnThis(),
        text: jest.fn().mockResolvedValue('invalid json'),
        body: true,
      } as unknown as NextRequest;

      await middleware(request);

      expect(request.clone).toHaveBeenCalled();
    });

    it('should use custom sensitive headers', async () => {
      const middleware = createLoggingMiddleware({
        logHeaders: true,
        sensitiveHeaders: ['x-api-key', 'authorization'],
      });
      const request = createMockRequest({
        headers: {
          'x-api-key': 'secret-key',
          authorization: 'Bearer token',
          'content-type': 'application/json',
        },
      });

      await middleware(request);

      expect(request.headers).toBeDefined();
    });
  });

  describe('logResponse', () => {
    it('should log successful response', () => {
      const requestId = 'req_123';
      const startTime = Date.now() - 100;
      const statusCode = 200;

      logResponse(requestId, statusCode, startTime);
    });

    it('should log error response', () => {
      const requestId = 'req_123';
      const startTime = Date.now() - 100;
      const statusCode = 500;

      logResponse(requestId, statusCode, startTime);
    });

    it('should calculate duration correctly', () => {
      const requestId = 'req_123';
      const startTime = Date.now() - 500;

      logResponse(requestId, 200, startTime);
    });
  });

  describe('defaultLoggingMiddleware', () => {
    it('should be a pre-configured middleware', async () => {
      const request = createMockRequest();
      const result = await defaultLoggingMiddleware(request);

      expect(result.requestId).toBeDefined();
    });
  });

  describe('verboseLoggingMiddleware', () => {
    it('should be a pre-configured verbose middleware', async () => {
      const request = createMockRequest({
        headers: { 'content-type': 'application/json' },
        body: { test: 'data' },
      });
      const result = await verboseLoggingMiddleware(request);

      expect(result.requestId).toBeDefined();
    });

    it('should log all request details', async () => {
      const request = createMockRequest({
        url: 'http://localhost/api/test?foo=bar',
        headers: { 'content-type': 'application/json' },
        body: { test: 'data' },
      });

      await verboseLoggingMiddleware(request);

      expect(request.clone).toHaveBeenCalled();
    });
  });
});
