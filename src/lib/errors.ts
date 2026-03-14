export {
  AppError,
  type AppErrorDetails,
  type AppErrorOptions,
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
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  type OracleErrorDetails,
  type PriceFetchErrorDetails,
  type UnsupportedChainErrorDetails,
  type UnsupportedSymbolErrorDetails,
  errorToResponse,
  handleError,
  isAppError,
  isOperationalError,
  type ErrorResponse,
} from './errors/index';

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
