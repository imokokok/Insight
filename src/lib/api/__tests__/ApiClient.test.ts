import { ApiClient, ApiError, DEFAULT_TIMEOUT } from '../client/ApiClient';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create an ApiError with all properties', () => {
      const error = new ApiError({
        code: 'TEST_ERROR',
        message: 'Test error message',
        statusCode: 400,
        details: { field: 'test' },
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
    });

    it('should create an ApiError without details', () => {
      const error = new ApiError({
        code: 'SIMPLE_ERROR',
        message: 'Simple error',
        statusCode: 500,
      });

      expect(error.details).toBeUndefined();
    });
  });

  describe('fromError', () => {
    it('should return the same ApiError if input is already an ApiError', () => {
      const originalError = new ApiError({
        code: 'ORIGINAL',
        message: 'Original error',
        statusCode: 404,
      });

      const result = ApiError.fromError(originalError);

      expect(result).toBe(originalError);
    });

    it('should convert Error to ApiError', () => {
      const error = new Error('Something went wrong');
      const result = ApiError.fromError(error);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Something went wrong');
      expect(result.statusCode).toBe(500);
    });

    it('should handle non-Error inputs', () => {
      const result = ApiError.fromError('string error');

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unknown error occurred');
      expect(result.statusCode).toBe(500);
    });

    it('should handle null input', () => {
      const result = ApiError.fromError(null);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unknown error occurred');
    });

    it('should handle undefined input', () => {
      const result = ApiError.fromError(undefined);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unknown error occurred');
    });
  });
});

describe('ApiClient', () => {
  let client: ApiClient;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    client = new ApiClient({
      baseURL: 'https://api.example.com',
      defaultTimeout: 5000,
      defaultHeaders: { 'X-Custom-Header': 'test' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      const defaultClient = new ApiClient();

      expect(defaultClient).toBeDefined();
    });

    it('should use provided baseURL', () => {
      const clientWithBase = new ApiClient({ baseURL: 'https://test.com' });
      expect(clientWithBase).toBeDefined();
    });

    it('should use default timeout when not provided', () => {
      const clientDefaultTimeout = new ApiClient();
      expect(clientDefaultTimeout).toBeDefined();
    });
  });

  describe('request interceptors', () => {
    it('should add and apply request interceptors', async () => {
      const interceptor = jest.fn((config) => ({
        ...config,
        headers: { ...config.headers, 'X-Intercepted': 'true' },
      }));

      client.addRequestInterceptor(interceptor);

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
    });

    it('should apply multiple request interceptors in order', async () => {
      const order: string[] = [];

      client.addRequestInterceptor((config) => {
        order.push('first');
        return config;
      });

      client.addRequestInterceptor((config) => {
        order.push('second');
        return config;
      });

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await client.get('/test');

      expect(order).toEqual(['first', 'second']);
    });
  });

  describe('response interceptors', () => {
    it('should add and apply response interceptors', async () => {
      const interceptor = jest.fn((response) => response);

      client.addResponseInterceptor(interceptor);

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
    });

    it('should apply async response interceptors', async () => {
      const interceptor = jest.fn(async (response) => {
        return response;
      });

      client.addResponseInterceptor(interceptor);

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should make GET request', async () => {
      const result = await client.get('/users');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.data).toEqual({ success: true });
    });

    it('should make POST request with data', async () => {
      const data = { name: 'test' };
      await client.post('/users', data);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make PUT request with data', async () => {
      const data = { name: 'updated' };
      await client.put('/users/1', data);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/users/1');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('response handling', () => {
    it('should return data with meta information', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await client.get('/test');

      expect(result.data).toEqual({ id: 1, name: 'test' });
      expect(result.meta.timestamp).toBeDefined();
      expect(result.meta.source).toBe('api');
      expect(result.meta.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should throw ApiError for non-ok responses', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not found', code: 'NOT_FOUND' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await expect(client.get('/not-found')).rejects.toThrow(ApiError);
    });

    it('should include error details in ApiError', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: { field: 'email' },
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      try {
        await client.get('/validate');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).details).toEqual({ field: 'email' });
      }
    });

    it('should handle JSON parse errors in error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Invalid JSON', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      try {
        await client.get('/error');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Unknown error');
      }
    });

    it('should throw ApiError for timeout', async () => {
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init.signal as AbortSignal;
            if (signal) {
              signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const timeoutClient = new ApiClient({
        baseURL: 'https://api.example.com',
        defaultTimeout: 10,
      });

      await expect(timeoutClient.get('/slow')).rejects.toThrow(ApiError);
    });
  });

  describe('custom config', () => {
    it('should use custom timeout from config', async () => {
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init.signal as AbortSignal;
            if (signal) {
              signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      await expect(client.get('/slow', { timeout: 10 })).rejects.toThrow(ApiError);
    });

    it('should use custom headers from config', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
        })
      );

      await client.get('/test', {
        headers: { 'X-Request-Header': 'value' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-Header': 'value',
          }),
        })
      );
    });

    it('should use custom signal from config', async () => {
      const controller = new AbortController();
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
        })
      );

      await client.get('/test', { signal: controller.signal });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });

    it('should use custom cache from config', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
        })
      );

      await client.get('/test', { cache: 'no-store' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });
  });
});

describe('DEFAULT_TIMEOUT', () => {
  it('should be 30000ms', () => {
    expect(DEFAULT_TIMEOUT).toBe(30000);
  });
});

describe('apiClient instance', () => {
  it('should be exported', async () => {
    const { apiClient } = await import('../client/ApiClient');
    expect(apiClient).toBeDefined();
    expect(apiClient).toBeInstanceOf(ApiClient);
  });
});
