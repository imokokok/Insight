import { type NextRequest, NextResponse } from 'next/server';

import { type ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

const logger = createLogger('validation-middleware');

interface FieldSchema {
  validators: Array<(value: unknown, field: string) => ValidatorResult>;
  required?: boolean;
  transform?: (value: unknown) => unknown;
}

interface ObjectSchema {
  [key: string]: FieldSchema;
}

interface ValidatorResult {
  valid: boolean;
  value?: unknown;
  error?: ValidationError;
}

interface ValidateObjectResult {
  isValid: boolean;
  data: Record<string, unknown>;
  errors: Array<{ field: string; message: string }>;
}

function validateObject(data: Record<string, unknown>, schema: ObjectSchema): ValidateObjectResult {
  const errors: Array<{ field: string; message: string }> = [];
  const result: Record<string, unknown> = {};

  for (const [key, fieldSchema] of Object.entries(schema)) {
    let value = data[key];

    if (value === undefined || value === null) {
      if (fieldSchema.required) {
        errors.push({ field: key, message: `${key} is required` });
        continue;
      }
      continue;
    }

    if (fieldSchema.transform) {
      value = fieldSchema.transform(value);
    }

    for (const validator of fieldSchema.validators) {
      const validatorResult = validator(value, key);
      if (!validatorResult.valid) {
        errors.push({
          field: key,
          message: validatorResult.error?.message || `Validation failed for ${key}`,
        });
        break;
      }
      value = validatorResult.value;
    }

    if (errors.length === 0 || errors[errors.length - 1]?.field !== key) {
      result[key] = value;
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? { ...data, ...result } : data,
    errors,
  };
}

export type { ObjectSchema, FieldSchema, ValidatorResult };

export interface ValidationMiddlewareOptions {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
}

type ValidationMiddlewareResult =
  | {
      success: true;
      data: {
        body?: Record<string, unknown>;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
      };
    }
  | { success: false; response: NextResponse };

export function createValidationMiddleware(options: ValidationMiddlewareOptions) {
  return async (
    request: NextRequest,
    params?: Record<string, string>
  ): Promise<ValidationMiddlewareResult> => {
    const validatedData: {
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    } = {};

    if (options.body) {
      try {
        const body = await request.json();
        const result = validateObject(body, options.body);

        if (!result.isValid) {
          logger.debug('Body validation failed', { errors: result.errors });
          return {
            success: false,
            response: NextResponse.json(
              ApiResponseBuilder.error('VALIDATION_ERROR', 'Request body validation failed', {
                details: { errors: result.errors },
              }),
              { status: 400 }
            ),
          };
        }

        validatedData.body = result.data;
      } catch (error) {
        logger.debug('Failed to parse request body', { error });
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('BAD_REQUEST', 'Invalid JSON in request body'),
            { status: 400 }
          ),
        };
      }
    }

    if (options.query) {
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

      const result = validateObject(queryData, options.query);

      if (!result.isValid) {
        logger.debug('Query validation failed', { errors: result.errors });
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Query parameters validation failed', {
              details: { errors: result.errors },
            }),
            { status: 400 }
          ),
        };
      }

      validatedData.query = result.data;
    }

    if (options.params && params) {
      const result = validateObject(params, options.params);

      if (!result.isValid) {
        logger.debug('Params validation failed', { errors: result.errors });
        return {
          success: false,
          response: NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Route parameters validation failed', {
              details: { errors: result.errors },
            }),
            { status: 400 }
          ),
        };
      }

      validatedData.params = result.data;
    }

    return { success: true, data: validatedData };
  };
}

export function validateBody(schema: ObjectSchema) {
  return createValidationMiddleware({ body: schema });
}

export function validateQuery(schema: ObjectSchema) {
  return createValidationMiddleware({ query: schema });
}

export function validateParams(schema: ObjectSchema) {
  return createValidationMiddleware({ params: schema });
}

export function validate(schema: ValidationMiddlewareOptions) {
  return createValidationMiddleware(schema);
}

export function validateField<T>(
  value: unknown,
  validator: (
    value: unknown,
    field: string
  ) => { valid: boolean; value?: unknown; error?: ValidationError },
  field: string
): T {
  const result = validator(value, field);
  if (!result.valid) {
    throw result.error;
  }
  return result.value as T;
}
