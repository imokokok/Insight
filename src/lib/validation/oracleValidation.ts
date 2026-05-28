import { type ZodSchema } from 'zod';

import { createLogger } from '@/lib/utils/logger';

import { ZodValidationError } from './errors';

const logger = createLogger('oracle-validation');

export type SafeValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ZodValidationError };

export function validateOracleData<T>(schema: ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const error = ZodValidationError.fromZodError(result.error);
    const contextMessage = context ? ` in ${context}` : '';
    logger.error(`Oracle data validation failed${contextMessage}`, error, {
      issues: result.error.issues,
    });
    throw error;
  }

  return result.data;
}

export function safeValidateOracleData<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): SafeValidationResult<T> {
  try {
    const validatedData = validateOracleData(schema, data, context);
    return { ok: true, data: validatedData };
  } catch (error) {
    if (error instanceof ZodValidationError) {
      logger.warn(`Oracle data validation failed${context ? ` in ${context}` : ''}`, {
        error,
      });
      return { ok: false, error };
    }
    logger.error(
      `Unexpected error during oracle data validation${context ? ` in ${context}` : ''}`,
      error instanceof Error ? error : undefined,
      {
        errorMessage: error instanceof Error ? error.message : String(error),
      }
    );
    throw error;
  }
}
