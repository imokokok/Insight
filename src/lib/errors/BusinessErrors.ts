import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from './AppError';

interface ValidationErrorDetails extends AppErrorDetails {
  field?: string;
  value?: unknown;
  constraints?: Record<string, unknown>;
  errors?: Array<{ field: string; message: string }>;
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationErrorDetails) {
    super({
      message,
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: HttpStatusCodes.BAD_REQUEST,
      category: 'validation',
      severity: 'low',
      details,
    });
  }
}

interface InternalErrorDetails extends AppErrorDetails {
  operation?: string;
  originalError?: string;
  component?: string;
}

export class InternalError extends AppError {
  constructor(message: string, details?: InternalErrorDetails, cause?: Error) {
    super({
      message,
      code: ErrorCodes.INTERNAL_ERROR,
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      category: 'internal',
      severity: 'critical',
      isOperational: false,
      details,
      cause,
    });
  }
}
