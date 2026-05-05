import { type ZodSchema } from 'zod';

import { createLogger } from '@/lib/utils/logger';

import { ZodValidationError } from './errors';

const logger = createLogger('oracle-validation');

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
): T | null {
  try {
    return validateOracleData(schema, data, context);
  } catch (error) {
    logger.warn(`Oracle data validation failed, returning null${context ? ` in ${context}` : ''}`, {
      error,
    });
    return null;
  }
}
