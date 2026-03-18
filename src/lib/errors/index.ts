export { AppError, type AppErrorDetails, type AppErrorOptions } from './AppError';

export {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  InternalError,
  NotImplementedError,
  type ValidationErrorDetails,
  type NotFoundErrorDetails,
  type AuthenticationErrorDetails,
  type AuthorizationErrorDetails,
  type ConflictErrorDetails,
  type RateLimitErrorDetails,
  type InternalErrorDetails,
} from './BusinessErrors';

export {
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  type OracleErrorDetails,
  type PriceFetchErrorDetails,
  type UnsupportedChainErrorDetails,
  type UnsupportedSymbolErrorDetails,
} from './OracleError';

export {
  errorToResponse,
  handleError,
  isAppError,
  isOperationalError,
  type ErrorResponse,
} from './errorToResponse';

export {
  errorRecovery,
  errorReporting,
  useErrorRecovery,
  createRetryableFetch,
  ErrorReportingService,
  type RetryConfig,
  type ErrorLogEntry,
  type ErrorContext,
  type ErrorReport,
} from './errorRecovery';
