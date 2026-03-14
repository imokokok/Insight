export { AppError, type AppErrorDetails, type AppErrorOptions } from './AppError';

export {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  InternalError,
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
