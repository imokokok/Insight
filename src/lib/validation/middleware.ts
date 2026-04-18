import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { type ZodIssue, type ZodError, type ZodSchema } from 'zod';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('zod-validation-middleware');

// Request methods that should not have a body
const METHODS_WITHOUT_BODY = ['GET', 'HEAD', 'OPTIONS'];

interface ZodValidationResult<T> {
  success: true;
  data: T;
}

interface ZodValidationErrorResult {
  success: false;
  error: ZodError;
  response: NextResponse;
}

type ZodValidationResultType<T> = ZodValidationResult<T> | ZodValidationErrorResult;

interface ZodValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

// Unified error response format
function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      timestamp: Date.now(),
    },
    { status }
  );
}

function formatZodError(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue: ZodIssue) => {
    const field = issue.path.join('.');
    return {
      field: field || 'root',
      message: issue.message,
    };
  });
}

function validateWithZod<T>(schema: ZodSchema<T>, data: unknown): ZodValidationResultType<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodError(result.error);
    logger.debug('Zod validation failed', { errors });

    return {
      success: false,
      error: result.error,
      response: createErrorResponse('VALIDATION_ERROR', 'Validation failed', 400, { errors }),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// Query parameter value type conversion
function convertQueryValue(value: string): string | number | boolean {
  // Try to convert to number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  // Try to convert to boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  // Check request method
  if (METHODS_WITHOUT_BODY.includes(request.method)) {
    return {
      success: false,
      response: createErrorResponse(
        'METHOD_NOT_ALLOWED',
        `${request.method} requests cannot have a body`,
        405
      ),
    };
  }

  try {
    // Clone request to avoid body can only be read once issue
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    const result = validateWithZod(schema, body);

    if (!result.success) {
      return {
        success: false,
        response: result.response,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    logger.debug('Failed to parse request body', { error });
    return {
      success: false,
      response: createErrorResponse('BAD_REQUEST', 'Invalid JSON in request body', 400),
    };
  }
}

function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const { searchParams } = new URL(request.url);
  const queryData: Record<string, unknown> = {};

  searchParams.forEach((value, key) => {
    const existing = queryData[key];
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(convertQueryValue(value));
      } else {
        queryData[key] = [convertQueryValue(String(existing)), convertQueryValue(value)];
      }
    } else {
      queryData[key] = convertQueryValue(value);
    }
  });

  const result = validateWithZod(schema, queryData);

  if (!result.success) {
    return {
      success: false,
      response: result.response,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = validateWithZod(schema, params);

  if (!result.success) {
    return {
      success: false,
      response: result.response,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

function createZodValidationMiddleware<TBody, TQuery, TParams>(options: ZodValidationOptions) {
  return async (
    request: NextRequest,
    params?: Record<string, string>
  ): Promise<{
    success: boolean;
    data?: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    };
    response?: NextResponse;
  }> => {
    const validatedData: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    } = {};

    if (options.body) {
      const result = await validateBody(request, options.body);
      if (!result.success) {
        return result;
      }
      validatedData.body = result.data as TBody;
    }

    if (options.query) {
      const result = validateQuery(request, options.query);
      if (!result.success) {
        return result;
      }
      validatedData.query = result.data as TQuery;
    }

    if (options.params && params) {
      const result = validateParams(params, options.params);
      if (!result.success) {
        return result;
      }
      validatedData.params = result.data as TParams;
    }

    return {
      success: true,
      data: validatedData,
    };
  };
}

export function validateBodySchema<T>(schema: ZodSchema<T>) {
  return createZodValidationMiddleware<T, never, never>({ body: schema });
}

export function validateQuerySchema<T>(schema: ZodSchema<T>) {
  return createZodValidationMiddleware<never, T, never>({ query: schema });
}

function validateParamsSchema<T>(schema: ZodSchema<T>) {
  return createZodValidationMiddleware<never, never, T>({ params: schema });
}

function validate<TBody, TQuery = never, TParams = never>(options: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return createZodValidationMiddleware<TBody, TQuery, TParams>(options);
}

function safeValidate<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

function assertValid<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.parse(data);
  return result;
}
