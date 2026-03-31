import type { NextRequest, NextResponse } from 'next/server';

import { type ZodIssue, type ZodError, type ZodSchema } from 'zod';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('zod-validation-middleware');

export interface ZodValidationResult<T> {
  success: true;
  data: T;
}

export interface ZodValidationError {
  success: false;
  error: ZodError;
  response: NextResponse;
}

export type ZodValidationResultType<T> = ZodValidationResult<T> | ZodValidationError;

export interface ZodValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
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

export function validateWithZod<T>(
  schema: ZodSchema<T>,
  data: unknown
): ZodValidationResultType<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodError(result.error);
    logger.debug('Zod validation failed', { errors });

    return {
      success: false,
      error: result.error,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: { errors },
          },
          timestamp: Date.now(),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
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
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid JSON in request body',
          },
          timestamp: Date.now(),
        },
        { status: 400 }
      ),
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
        existing.push(value);
      } else {
        queryData[key] = [existing, value];
      }
    } else {
      queryData[key] = value;
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

export function createZodValidationMiddleware<TBody, TQuery, TParams>(
  options: ZodValidationOptions
) {
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

export function validateParamsSchema<T>(schema: ZodSchema<T>) {
  return createZodValidationMiddleware<never, never, T>({ params: schema });
}

export function validate<TBody, TQuery = never, TParams = never>(options: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return createZodValidationMiddleware<TBody, TQuery, TParams>(options);
}

export function safeValidate<T>(schema: ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

export function assertValid<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.parse(data);
  return result;
}
