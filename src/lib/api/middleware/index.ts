export {
  createAuthMiddleware,
  requireAuth,
  optionalAuth,
  requireRoles,
  extractAuthContext,
  getUserId,
  type AuthContext,
  type AuthMiddlewareOptions,
  type AuthMiddlewareResult,
} from './authMiddleware';

export {
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validate,
  validateField,
  type ValidationMiddlewareOptions,
  type ValidationMiddlewareResult,
} from './validationMiddleware';

export {
  createLoggingMiddleware,
  logResponse,
  generateRequestId,
  defaultLoggingMiddleware,
  verboseLoggingMiddleware,
  type LoggingMiddlewareOptions,
  type RequestLog,
  type ResponseLog,
} from './loggingMiddleware';

export {
  createErrorMiddleware,
  defaultErrorMiddleware,
  developmentErrorMiddleware,
  withErrorHandling,
  type ErrorMiddlewareOptions,
} from './errorMiddleware';

export {
  createRateLimitMiddleware,
  withRateLimitHeaders,
  strictRateLimit,
  moderateRateLimit,
  lenientRateLimit,
  apiRateLimit,
  clearRateLimitStore,
  type RateLimitMiddlewareOptions,
  type RateLimitMiddlewareResult,
} from './rateLimitMiddleware';
