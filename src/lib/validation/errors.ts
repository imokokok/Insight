import { type ZodError } from 'zod';

import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from '@/lib/errors/AppError';

interface ValidationErrorDetails extends AppErrorDetails {
  errors?: Array<{ field: string; message: string }>;
}

export class ZodValidationError extends AppError {
  constructor(
    message: string,
    public readonly zodError: ZodError,
    details?: ValidationErrorDetails
  ) {
    super({
      message,
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: HttpStatusCodes.BAD_REQUEST,
      category: 'validation',
      severity: 'low',
      details,
    });
    this.name = 'ZodValidationError';
  }

  static fromZodError(error: ZodError): ZodValidationError {
    const errors = error.issues.map((issue) => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
    }));

    const message =
      errors.length === 1
        ? `Validation error: ${errors[0].message}`
        : `Validation failed with ${errors.length} errors`;

    return new ZodValidationError(message, error, { errors });
  }

  toResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
      timestamp: Date.now(),
    };
  }
}
