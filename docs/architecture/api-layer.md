# API Layer Architecture

> Backend API design and implementation for the Insight platform

## Table of Contents

- [Overview](#overview)
- [Route Structure](#route-structure)
- [Middleware Design](#middleware-design)
- [Error Handling](#error-handling)
- [Validation Logic](#validation-logic)
- [Response Handling](#response-handling)

## Overview

Insight's API layer is built on Next.js App Router Route Handlers, adopting a layered architecture design:

```mermaid
graph TB
    subgraph API["API Layer Architecture"]
        A[Route Handler] --> B[Middleware]
        B --> C[Validation]
        C --> D[Business Logic]
        D --> E[Response Formatter]
    end

    subgraph ErrorHandling["Error Handling"]
        F[AppError]
        G[ErrorMiddleware]
        H[ErrorResponse]
    end

    D --> F
    F --> G
    G --> E
```

### Design Principles

1. **Single Responsibility**: Each route handles only one resource
2. **Unified Response Format**: All APIs return a unified response structure
3. **Complete Error Handling**: Layered error handling and logging
4. **Input Validation**: All inputs are strictly validated
5. **Caching Strategy**: Reasonable HTTP cache header settings

## Directory Structure

```
src/lib/api/
├── client/                 # API client
│   ├── ApiClient.ts       # API client implementation
│   ├── ApiError.ts        # API error class
│   ├── index.ts           # Export entry
│   └── types.ts           # Type definitions
├── middleware/            # Middleware
│   ├── authMiddleware.ts       # Authentication middleware
│   ├── errorMiddleware.ts      # Error handling middleware
│   ├── rateLimitMiddleware.ts  # Rate limiting middleware
│   ├── validationMiddleware.ts # Validation middleware
│   ├── loggingMiddleware.ts   # Logging middleware
│   └── index.ts               # Export entry
├── versioning/            # API versioning
│   ├── constants.ts       # Version constants
│   ├── middleware.ts      # Version middleware
│   └── index.ts           # Export entry
├── response/               # Response formatting
│   ├── ApiResponse.ts     # Response builder
│   └── index.ts           # Export entry
├── validation/            # Validation logic
│   ├── schemas.ts         # Zod validation schemas
│   ├── validators.ts      # Custom validators
│   └── index.ts           # Export entry
├── handler.ts            # Route handler function
├── oracleHandlers.ts     # Oracle-related handlers
└── utils.ts              # Utility functions
```

## Route Structure

### Directory Organization

```
src/app/api/
├── oracles/
│   ├── [provider]/
│   │   └── route.ts          # GET /api/oracles/[provider]
│   └── route.ts              # GET/POST /api/oracles
├── alerts/
│   ├── [id]/
│   │   └── route.ts          # GET/PUT/DELETE /api/alerts/[id]
│   ├── events/
│   │   ├── [id]/
│   │   │   └── acknowledge/
│   │   │       └── route.ts  # POST /api/alerts/events/[id]/acknowledge
│   │   └── route.ts          # GET /api/alerts/events
│   ├── batch/
│   │   └── route.ts          # POST /api/alerts/batch
│   └── route.ts              # GET/POST /api/alerts
├── favorites/
│   ├── [id]/
│   │   └── route.ts          # GET/PUT/DELETE /api/favorites/[id]
│   └── route.ts              # GET/POST/DELETE /api/favorites
├── auth/
│   ├── callback/
│   │   └── route.ts          # GET /api/auth/callback
│   ├── delete-account/
│   │   └── route.ts          # POST /api/auth/delete-account
│   └── profile/
│       └── route.ts          # GET/PUT /api/auth/profile
├── prices/
│   └── route.ts              # GET /api/prices
└── health/
    └── route.ts              # GET /api/health
```

## Middleware Design

### Middleware Overview

| Middleware           | File Location                                    | Function                              |
| -------------------- | ------------------------------------------------ | ------------------------------------- |
| authMiddleware       | `src/lib/api/middleware/authMiddleware.ts`       | JWT authentication, role verification |
| errorMiddleware      | `src/lib/api/middleware/errorMiddleware.ts`      | Unified error handling                |
| rateLimitMiddleware  | `src/lib/api/middleware/rateLimitMiddleware.ts`  | Request rate limiting                 |
| validationMiddleware | `src/lib/api/middleware/validationMiddleware.ts` | Input validation                      |
| loggingMiddleware    | `src/lib/api/middleware/loggingMiddleware.ts`    | Request logging                       |

### Middleware Exports

```typescript
// src/lib/api/middleware/index.ts
export {
  createAuthMiddleware,
  getUserId,
  type AuthContext,
  type AuthMiddlewareOptions,
} from './authMiddleware';

export {
  createValidationMiddleware,
  validate,
  type ValidationMiddlewareOptions,
} from './validationMiddleware';

export {
  createLoggingMiddleware,
  logResponse,
  type LoggingMiddlewareOptions,
} from './loggingMiddleware';

export {
  createErrorMiddleware,
  defaultErrorMiddleware,
  type ErrorMiddlewareOptions,
} from './errorMiddleware';

export { createRateLimitMiddleware, type RateLimitMiddlewareOptions } from './rateLimitMiddleware';
```

### 1. Authentication Middleware (authMiddleware)

```typescript
// src/lib/api/middleware/authMiddleware.ts
export interface AuthContext {
  userId: string;
  email?: string;
  role?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
}

export type AuthMiddlewareResult =
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse };

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const { required = true, roles = [] } = options;

  return async (request: NextRequest): Promise<AuthMiddlewareResult> => {
    const authContext = await extractAuthContext(request);

    if (!authContext) {
      if (required) {
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('UNAUTHORIZED', 'Authentication required', {
              i18nKey: 'errors.authentication',
            }),
            { status: 401 }
          ),
        };
      }
      return { success: true, context: { userId: '' } };
    }

    if (roles.length > 0) {
      const userRole = authContext.role;
      if (!userRole || !roles.includes(userRole)) {
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('FORBIDDEN', 'Insufficient permissions', {
              i18nKey: 'errors.authorization',
              details: { requiredRoles: roles },
            }),
            { status: 403 }
          ),
        };
      }
    }

    return { success: true, context: authContext };
  };
}

export const requireAuth = createAuthMiddleware({ required: true });
export const optionalAuth = createAuthMiddleware({ required: false });

export function requireRoles(...roles: string[]) {
  return createAuthMiddleware({ required: true, roles });
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  const authContext = await extractAuthContext(request);
  return authContext?.userId ?? null;
}
```

**Core Functions:**

- `extractAuthContext` - Extract authentication info from request headers
- `createAuthMiddleware` - Create authentication middleware
- `requireAuth` - Require authentication
- `optionalAuth` - Optional authentication
- `requireRoles` - Role verification

### 2. Error Handling Middleware (errorMiddleware)

```typescript
// src/lib/api/middleware/errorMiddleware.ts
export interface ErrorMiddlewareOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
}

export function createErrorMiddleware(options: ErrorMiddlewareOptions = {}) {
  const { includeStackTrace = false, logErrors = true } = options;

  return async (error: unknown, requestId?: string): Promise<NextResponse> => {
    if (logErrors) {
      if (isAppError(error)) {
        logger.error(`AppError: ${error.code} - ${error.message}`, error as Error, {
          statusCode: error.statusCode,
          details: error.details,
          requestId,
        });
      } else if (error instanceof Error) {
        logger.error('Unhandled error', error, { requestId });
      }
    }

    if (isAppError(error)) {
      const response = errorToResponse(error);
      if (requestId) {
        const body = await response.json();
        return NextResponse.json(
          { ...body, meta: { ...body.meta, requestId } },
          { status: response.status, headers: response.headers }
        );
      }
      return response;
    }

    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON in request body', { requestId }),
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const isNetworkError =
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout');

      const response = ApiResponseBuilder.error('INTERNAL_ERROR', error.message, {
        retryable: isNetworkError,
        requestId,
      });

      return NextResponse.json(response, { status: 500 });
    }

    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', 'An unexpected error occurred', {
        retryable: true,
        requestId,
      }),
      { status: 500 }
    );
  };
}

export const defaultErrorMiddleware = createErrorMiddleware();
export const developmentErrorMiddleware = createErrorMiddleware({
  includeStackTrace: true,
  logErrors: true,
});
```

**Core Functions:**

- Automatic error classification (AppError, SyntaxError, NetworkError)
- Error logging
- Error response formatting
- Request ID tracking

### 3. Rate Limiting Middleware (rateLimitMiddleware)

```typescript
// src/lib/api/middleware/rateLimitMiddleware.ts
export interface RateLimitMiddlewareOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (request: NextRequest, retryAfter: number) => NextResponse;
  preset?: 'strict' | 'moderate' | 'lenient' | 'api';
}

export type RateLimitMiddlewareResult =
  | { success: true; remaining: number; resetTime: number }
  | { success: false; response: NextResponse };

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions = {}) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = defaultKeyGenerator,
    handler = defaultRateLimitHandler,
  } = options;

  return async (request: NextRequest): Promise<RateLimitMiddlewareResult> => {
    const key = keyGenerator(request);
    const now = Date.now();
    const resetTime = now + windowMs;

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime });
      return { success: true, remaining: maxRequests - 1, resetTime };
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { success: false, response: handler(request, retryAfter) };
    }

    entry.count++;
    return { success: true, remaining: maxRequests - entry.count, resetTime };
  };
}

// Preset rate limit configurations
export const strictRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 20,
});

export const moderateRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 60,
});

export const lenientRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 200,
});

export const apiRateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 100,
});
```

**Core Functions:**

- In-memory rate limit storage
- Custom keyGenerator (default based on IP and path)
- Preset rate limit configurations (strict, moderate, lenient, api)
- Rate limit response headers (Retry-After, X-RateLimit-\*)

### 4. Validation Middleware (validationMiddleware)

```typescript
// src/lib/api/middleware/validationMiddleware.ts
export interface ValidationMiddlewareOptions {
  body?: z.Schema;
  query?: z.Schema;
  params?: z.Schema;
}

export function createValidationMiddleware(options: ValidationMiddlewareOptions) {
  return async (
    request: NextRequest
  ): Promise<{ success: true } | { success: false; response: NextResponse }> => {
    if (options.body && request.method !== 'GET') {
      const body = await request.json().catch(() => null);
      const result = options.body.safeParse(body);
      if (!result.success) {
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid request body', {
              details: result.error.errors,
            }),
            { status: 400 }
          ),
        };
      }
    }

    if (options.query) {
      const query = Object.fromEntries(request.nextUrl.searchParams);
      const result = options.query.safeParse(query);
      if (!result.success) {
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid query parameters', {
              details: result.error.errors,
            }),
            { status: 400 }
          ),
        };
      }
    }

    return { success: true };
  };
}

export function validate(schema: z.Schema) {
  return createValidationMiddleware({ body: schema });
}
```

### 5. Logging Middleware (loggingMiddleware)

```typescript
// src/lib/api/middleware/loggingMiddleware.ts
export interface LoggingMiddlewareOptions {
  logRequest?: boolean;
  logResponse?: boolean;
  logError?: boolean;
}

export function createLoggingMiddleware(options: LoggingMiddlewareOptions = {}) {
  const { logRequest = true, logResponse = true, logError = true } = options;

  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    const start = Date.now();

    if (logRequest) {
      logger.info(`Request: ${request.method} ${request.url}`, {
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
      });
    }

    try {
      const response = await handler(request);
      const duration = Date.now() - start;

      if (logResponse) {
        logger.info(`Response: ${response.status} (${duration}ms)`, {
          requestId,
          status: response.status,
          duration,
        });
      }

      response.headers.set('x-request-id', requestId);
      return response;
    } catch (error) {
      const duration = Date.now() - start;

      if (logError) {
        logger.error(
          `Error: ${error instanceof Error ? error.message : String(error)} (${duration}ms)`,
          {
            requestId,
            duration,
            error: error instanceof Error ? error.stack : String(error),
          }
        );
      }

      throw error;
    }
  };
}
```

### Middleware Composition

```typescript
// Compose multiple middleware
export const GET = withErrorHandler(
  withLogging(
    withRateLimit(
      withAuth(async (request, { user }) => {
        // Handler logic
      }),
      { limit: 100, window: 60 }
    )
  )
);
```

## API Versioning

```typescript
// src/lib/api/versioning/middleware.ts
export function withVersionHeaders(response: NextResponse, version: string): NextResponse {
  response.headers.set('X-API-Version', version);
  return response;
}
```

## Error Handling

### Error Class Hierarchy

```typescript
// src/lib/errors/index.ts
export interface AppErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  isOperational?: boolean;
  details?: Record<string, unknown>;
  cause?: Error;
}

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super({
      message: `${resource}${id ? ` with id "${id}"` : ''} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super({
      message,
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, options?: { cause?: Error }) {
    super({
      message,
      code: 'DATABASE_ERROR',
      statusCode: 500,
      isOperational: false,
      cause: options?.cause,
    });
  }
}
```

## Response Handling

### ApiResponseBuilder

```typescript
// src/lib/api/response/ApiResponse.ts
export class ApiResponseBuilder {
  static success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
    return {
      data,
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }

  static error(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): ApiResponse<null> {
    return {
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: Date.now(),
      },
    };
  }
}

export function createJsonResponse<T>(
  data: T,
  options?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(ApiResponseBuilder.success(data), {
    status: options?.status || 200,
    headers: options?.headers,
  });
}

export function createCachedJsonResponse<T>(data: T, cacheConfig: CacheConfig): NextResponse {
  const response = ApiResponseBuilder.success(data);

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': `public, max-age=${cacheConfig.maxAge}${
        cacheConfig.staleWhileRevalidate
          ? `, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`
          : ''
      }`,
    },
  });
}

export function createPaginatedResponse<T>(
  items: T[],
  pagination: { page: number; pageSize: number; totalItems: number }
): NextResponse {
  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);

  return NextResponse.json({
    data: {
      items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
    },
    meta: {
      timestamp: Date.now(),
    },
  });
}
```

### Response Examples

```typescript
// Success response (200 OK)
{
  "data": {
    "provider": "chainlink",
    "symbol": "BTC",
    "price": 45000.50,
    "timestamp": 1704067200000
  },
  "meta": {
    "timestamp": 1704067200000
  }
}

// Error response (400 Bad Request)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Symbol is required",
    "details": { "field": "symbol" }
  },
  "meta": {
    "timestamp": 1704067200000
  }
}

// Paginated response (200 OK)
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "meta": {
    "timestamp": 1704067200000
  }
}
```

## Best Practices

### 1. Route Design

```typescript
// ✅ Use RESTful naming
GET    /api/oracles              # Get all oracles
GET    /api/oracles/chainlink    # Get Chainlink data
POST   /api/alerts               # Create alert
DELETE /api/alerts/123           # Delete specific alert

// ❌ Avoid using verbs
/getOracles                    # Not recommended
/createAlert                   # Not recommended
```

### 2. Status Code Usage

| Status Code               | Usage                   |
| ------------------------- | ----------------------- |
| 200 OK                    | Success                 |
| 201 Created               | Created successfully    |
| 204 No Content            | Deleted successfully    |
| 400 Bad Request           | Request parameter error |
| 401 Unauthorized          | Not authenticated       |
| 403 Forbidden             | No permission           |
| 404 Not Found             | Resource not found      |
| 429 Too Many Requests     | Rate limited            |
| 500 Internal Server Error | Server error            |

### 3. Caching Strategy

```typescript
// Static data - long cache
return createCachedJsonResponse(data, {
  maxAge: 3600,
  staleWhileRevalidate: 86400,
});

// Dynamic data - short cache
return createCachedJsonResponse(data, {
  maxAge: 30,
  staleWhileRevalidate: 60,
});
```

### 4. Security

```typescript
// ✅ Always validate input
const validation = validatePriceQuery({ symbol, chain });
if (!validation.valid) {
  return createErrorResponse('VALIDATION_ERROR', validation.errors.join(', '), 400);
}

// ✅ Use parameterized queries
const { data, error } = await supabase
  .from('prices')
  .select('*')
  .eq('symbol', symbol) // Parameterized
  .single();
```

## Client API Usage Conventions

### apiClient Usage Guide

Client code should use `apiClient` uniformly for API calls instead of directly using `fetch` or `axios`.

#### Basic Usage

```typescript
import { apiClient } from '@/lib/api';

// GET request
const response = await apiClient.get<OracleData>('/api/oracles/chainlink');
const data = response.data;

// POST request
const createResponse = await apiClient.post<Alert>('/api/alerts', {
  symbol: 'BTC',
  condition_type: 'above',
  target_value: 50000,
});

// PUT request
const updateResponse = await apiClient.put<Alert>('/api/alerts/123', {
  target_value: 55000,
});

// DELETE request
await apiClient.delete('/api/alerts/123');
```

#### Configuration Options

```typescript
import { apiClient } from '@/lib/api';

// With cache configuration
const response = await apiClient.get<PricesResponse>('/api/prices', {
  cache: 'no-store',
});

// With timeout configuration
const response = await apiClient.get<OracleData>('/api/oracles/chainlink', {
  timeout: 5000,
});

// With custom headers
const response = await apiClient.get<UserData>('/api/user', {
  headers: {
    'X-Custom-Header': 'value',
  },
});

// With abort signal
const controller = new AbortController();
const response = await apiClient.get<OracleData>('/api/oracles/chainlink', {
  signal: controller.signal,
});
// Cancel request
controller.abort();
```

#### Using with React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useOracleData(provider: string) {
  return useQuery({
    queryKey: ['oracles', provider],
    queryFn: async () => {
      const response = await apiClient.get<OracleData>(`/api/oracles/${provider}`);
      return response.data;
    },
    staleTime: 30000,
  });
}
```

#### Error Handling

```typescript
import { apiClient, ApiError } from '@/lib/api';

try {
  const response = await apiClient.get<OracleData>('/api/oracles/chainlink');
  return response.data;
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.code} - ${error.message}`);
    console.error(`Status: ${error.statusCode}`);
    console.error(`Details:`, error.details);
  }
  throw error;
}
```

### When to Use apiClient vs Direct fetch

| Scenario                              | Recommended Approach      | Reason                              |
| ------------------------------------- | ------------------------- | ----------------------------------- |
| Client component calling internal API | `apiClient`               | Unified error handling, type safety |
| Client hooks calling internal API     | `apiClient`               | Unified error handling, type safety |
| Server API route calling external API | Direct `fetch`            | Server doesn't need client wrapper  |
| Server service calling external API   | Direct `fetch` or `axios` | Server-specific requirements        |

### Migration Example

#### Before Migration (using fetch directly)

```typescript
export function useOracleData(params: OracleDataParams = {}) {
  return useQuery({
    queryKey: oracleKeys.list(params),
    queryFn: async () => {
      const url = params.provider ? `/api/oracles/${params.provider}` : '/api/oracles';
      const response = await fetch(url);
      if (!response.ok) {
        throw new PriceFetchError('Failed to fetch oracle data', {
          provider: params.provider,
          retryable: true,
        });
      }
      return response.json();
    },
  });
}
```

#### After Migration (using apiClient)

```typescript
import { apiClient } from '@/lib/api';

export function useOracleData(params: OracleDataParams = {}) {
  return useQuery({
    queryKey: oracleKeys.list(params),
    queryFn: async () => {
      const url = params.provider ? `/api/oracles/${params.provider}` : '/api/oracles';
      try {
        const response = await apiClient.get<OracleData | OracleData[]>(url);
        return response.data;
      } catch (error) {
        throw new PriceFetchError('Failed to fetch oracle data', {
          provider: params.provider,
          retryable: true,
        });
      }
    },
  });
}
```

### apiClient Features

1. **Unified Error Handling**: Automatically converts HTTP errors to `ApiError`
2. **Type Safety**: Supports generic type parameters
3. **Request/Response Interceptors**: Supports custom interceptors
4. **Configuration Support**: Supports `cache`, `timeout`, `signal`, etc.
5. **Metadata Return**: Response includes `timestamp` and `source` metadata
