export interface AppErrorDetails {
  [key: string]: unknown;
}

export interface AppErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  isOperational?: boolean;
  details?: AppErrorDetails;
  i18nKey?: string;
  cause?: Error;
}

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: AppErrorDetails;
  public readonly i18nKey?: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.i18nKey = options.i18nKey;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      details: this.details,
      i18nKey: this.i18nKey,
    };
  }

  toApiResponse(): { error: { code: string; message: string; retryable: boolean; details?: AppErrorDetails } } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: !this.isOperational,
        details: this.details,
      },
    };
  }
}
