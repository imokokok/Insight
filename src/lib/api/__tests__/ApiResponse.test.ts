import {
  ApiResponseBuilder,
  ApiResponseHandler,
  CacheConfig,
  withCacheHeaders,
  createCachedJsonResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiPaginatedResponse,
} from '../response/ApiResponse';

describe('ApiResponseBuilder', () => {
  describe('success', () => {
    it('should create a success response with data', () => {
      const data = { id: 1, name: 'test' };
      const response = ApiResponseBuilder.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta?.timestamp).toBeDefined();
    });

    it('should include requestId in meta when provided', () => {
      const data = { id: 1 };
      const response = ApiResponseBuilder.success(data, { requestId: 'req-123' });

      expect(response.meta?.requestId).toBe('req-123');
    });

    it('should include additional meta fields', () => {
      const data = { id: 1 };
      const response = ApiResponseBuilder.success(data, {
        requestId: 'req-123',
        customField: 'customValue',
      });

      expect(response.meta?.customField).toBe('customValue');
    });
  });

  describe('error', () => {
    it('should create an error response', () => {
      const response = ApiResponseBuilder.error('NOT_FOUND', 'Resource not found');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toBe('Resource not found');
      expect(response.error.retryable).toBe(false);
    });

    it('should include retryable option', () => {
      const response = ApiResponseBuilder.error('TIMEOUT', 'Request timeout', {
        retryable: true,
      });

      expect(response.error.retryable).toBe(true);
    });

    it('should include details when provided', () => {
      const response = ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid input', {
        details: { field: 'email' },
      });

      expect(response.error.details).toEqual({ field: 'email' });
    });

    it('should include i18nKey when provided', () => {
      const response = ApiResponseBuilder.error('UNAUTHORIZED', 'Not authorized', {
        i18nKey: 'errors.unauthorized',
      });

      expect(response.error.i18nKey).toBe('errors.unauthorized');
    });

    it('should include requestId in meta when provided', () => {
      const response = ApiResponseBuilder.error('ERROR', 'Error', {
        requestId: 'req-456',
      });

      expect(response.meta?.requestId).toBe('req-456');
    });
  });

  describe('paginated', () => {
    it('should create a paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = ApiResponseBuilder.paginated(data, 1, 10, 25);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should calculate totalPages correctly', () => {
      const response = ApiResponseBuilder.paginated([], 1, 10, 100);

      expect(response.pagination.totalPages).toBe(10);
    });

    it('should handle partial pages', () => {
      const response = ApiResponseBuilder.paginated([], 1, 10, 15);

      expect(response.pagination.totalPages).toBe(2);
    });

    it('should use default limit when limit is 0', () => {
      const response = ApiResponseBuilder.paginated([], 1, 0, 100);

      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.totalPages).toBe(10);
    });

    it('should use default limit when limit is negative', () => {
      const response = ApiResponseBuilder.paginated([], 1, -5, 100);

      expect(response.pagination.limit).toBe(10);
    });

    it('should include requestId in meta when provided', () => {
      const response = ApiResponseBuilder.paginated([], 1, 10, 0, {
        requestId: 'req-789',
      });

      expect(response.meta?.requestId).toBe('req-789');
    });
  });
});

describe('ApiResponseHandler', () => {
  describe('json', () => {
    it('should create a JSON response with success data', async () => {
      const data = { id: 1, name: 'test' };
      const response = ApiResponseHandler.json(data);

      expect(response.status).toBe(200);

      const body = (await response.json()) as ApiSuccessResponse<typeof data>;
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it('should use custom status code', () => {
      const response = ApiResponseHandler.json({ created: true }, 201);
      expect(response.status).toBe(201);
    });

    it('should throw error for invalid status code (< 100)', () => {
      expect(() => ApiResponseHandler.json({}, 99)).toThrow('Invalid HTTP status code: 99');
    });

    it('should throw error for invalid status code (>= 600)', () => {
      expect(() => ApiResponseHandler.json({}, 600)).toThrow('Invalid HTTP status code: 600');
    });
  });

  describe('error', () => {
    it('should create an error response', async () => {
      const response = ApiResponseHandler.error('BAD_REQUEST', 'Invalid input', 400);

      expect(response.status).toBe(400);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should throw error for invalid status code', () => {
      expect(() => ApiResponseHandler.error('ERROR', 'Error', 99)).toThrow(
        'Invalid HTTP status code: 99'
      );
    });
  });

  describe('paginated', () => {
    it('should create a paginated response', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = ApiResponseHandler.paginated(data, 1, 10, 25);

      const body = (await response.json()) as ApiPaginatedResponse<typeof data[0]>;
      expect(body.success).toBe(true);
      expect(body.pagination.total).toBe(25);
    });
  });

  describe('created', () => {
    it('should create a 201 response', async () => {
      const data = { id: 1 };
      const response = ApiResponseHandler.created(data);

      expect(response.status).toBe(201);

      const body = (await response.json()) as ApiSuccessResponse<typeof data>;
      expect(body.data).toEqual(data);
    });
  });

  describe('noContent', () => {
    it('should create a 204 response', async () => {
      const response = ApiResponseHandler.noContent();

      expect(response.status).toBe(204);
    });
  });

  describe('badRequest', () => {
    it('should create a 400 response', async () => {
      const response = ApiResponseHandler.badRequest('Invalid input', { field: 'email' });

      expect(response.status).toBe(400);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.details).toEqual({ field: 'email' });
    });
  });

  describe('unauthorized', () => {
    it('should create a 401 response with default message', async () => {
      const response = ApiResponseHandler.unauthorized();

      expect(response.status).toBe(401);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Unauthorized access');
    });

    it('should create a 401 response with custom message', async () => {
      const response = ApiResponseHandler.unauthorized('Token expired');

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Token expired');
    });
  });

  describe('forbidden', () => {
    it('should create a 403 response with default message', async () => {
      const response = ApiResponseHandler.forbidden();

      expect(response.status).toBe(403);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Forbidden');
    });

    it('should create a 403 response with custom message', async () => {
      const response = ApiResponseHandler.forbidden('Admin only');

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Admin only');
    });
  });

  describe('notFound', () => {
    it('should create a 404 response with default message', async () => {
      const response = ApiResponseHandler.notFound();

      expect(response.status).toBe(404);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Resource not found');
    });

    it('should create a 404 response with custom message', async () => {
      const response = ApiResponseHandler.notFound('User not found');

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('User not found');
    });
  });

  describe('conflict', () => {
    it('should create a 409 response', async () => {
      const response = ApiResponseHandler.conflict('Email already exists');

      expect(response.status).toBe(409);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.code).toBe('CONFLICT');
    });
  });

  describe('tooManyRequests', () => {
    it('should create a 429 response with Retry-After header', async () => {
      const response = ApiResponseHandler.tooManyRequests(60);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.retryable).toBe(true);
    });

    it('should use custom message', async () => {
      const response = ApiResponseHandler.tooManyRequests(30, 'Slow down');

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Slow down');
    });
  });

  describe('internalError', () => {
    it('should create a 500 response with default message', async () => {
      const response = ApiResponseHandler.internalError();

      expect(response.status).toBe(500);

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.retryable).toBe(true);
    });

    it('should create a 500 response with custom message', async () => {
      const response = ApiResponseHandler.internalError('Database connection failed');

      const body = (await response.json()) as ApiErrorResponse;
      expect(body.error.message).toBe('Database connection failed');
    });
  });
});

describe('CacheConfig', () => {
  describe('PRICE', () => {
    it('should have correct maxAge and staleWhileRevalidate', () => {
      expect(CacheConfig.PRICE.maxAge).toBe(30);
      expect(CacheConfig.PRICE.staleWhileRevalidate).toBe(60);
    });

    it('should generate correct header', () => {
      expect(CacheConfig.PRICE.header).toBe(
        'public, s-maxage=30, stale-while-revalidate=60'
      );
    });
  });

  describe('HISTORY', () => {
    it('should have correct maxAge and staleWhileRevalidate', () => {
      expect(CacheConfig.HISTORY.maxAge).toBe(300);
      expect(CacheConfig.HISTORY.staleWhileRevalidate).toBe(600);
    });

    it('should generate correct header', () => {
      expect(CacheConfig.HISTORY.header).toBe(
        'public, s-maxage=300, stale-while-revalidate=600'
      );
    });
  });

  describe('SHORT', () => {
    it('should have correct maxAge and staleWhileRevalidate', () => {
      expect(CacheConfig.SHORT.maxAge).toBe(10);
      expect(CacheConfig.SHORT.staleWhileRevalidate).toBe(30);
    });

    it('should generate correct header', () => {
      expect(CacheConfig.SHORT.header).toBe(
        'public, s-maxage=10, stale-while-revalidate=30'
      );
    });
  });

  describe('NONE', () => {
    it('should generate no-store header', () => {
      expect(CacheConfig.NONE.header).toBe('no-store, no-cache, must-revalidate');
    });
  });
});

describe('withCacheHeaders', () => {
  it('should set Cache-Control header on response', () => {
    const mockResponse = {
      headers: {
        set: jest.fn(),
      },
    } as unknown as Response;

    const result = withCacheHeaders(mockResponse as any, CacheConfig.PRICE);

    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'Cache-Control',
      CacheConfig.PRICE.header
    );
    expect(result).toBe(mockResponse);
  });
});

describe('createCachedJsonResponse', () => {
  it('should create response with cache headers', async () => {
    const data = { price: 100 };
    const response = createCachedJsonResponse(data, CacheConfig.PRICE);

    expect(response.headers.get('Cache-Control')).toBe(CacheConfig.PRICE.header);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
  });
});
