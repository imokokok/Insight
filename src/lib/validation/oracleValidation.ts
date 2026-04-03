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

export function isValidOracleData<T>(schema: ZodSchema<T>, data: unknown): boolean {
  const result = schema.safeParse(data);
  return result.success;
}

export function logValidationWarning(
  provider: string,
  symbol: string,
  issues: Array<{ field: string; message: string }>
): void {
  logger.warn(`Data validation warning for ${provider}:${symbol}`, {
    provider,
    symbol,
    issues,
    timestamp: Date.now(),
  });
}
