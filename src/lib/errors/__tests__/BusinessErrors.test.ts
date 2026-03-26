import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  InternalError,
  NotImplementedError,
} from '../BusinessErrors';

describe('ValidationError', () => {
  it('should create validation error with default values', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.i18nKey).toBe('errors.validation');
    expect(error.isOperational).toBe(true);
  });

  it('should include details when provided', () => {
    const details = { field: 'email', value: 'invalid', constraints: { format: 'email' } };
    const error = new ValidationError('Invalid email', details);

    expect(error.details).toEqual(details);
  });

  it('should use custom i18nKey when provided', () => {
    const error = new ValidationError('Invalid input', {}, 'custom.validation');

    expect(error.i18nKey).toBe('custom.validation');
  });
});

describe('NotFoundError', () => {
  it('should create not found error with default values', () => {
    const error = new NotFoundError('User not found');

    expect(error.message).toBe('User not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.i18nKey).toBe('errors.notFound');
  });

  it('should include resource details when provided', () => {
    const details = { resource: 'User', identifier: '123' };
    const error = new NotFoundError('User not found', details);

    expect(error.details).toEqual(details);
  });
});

describe('AuthenticationError', () => {
  it('should create authentication error with default values', () => {
    const error = new AuthenticationError('Invalid credentials');

    expect(error.message).toBe('Invalid credentials');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.i18nKey).toBe('errors.authentication');
  });

  it('should include reason when provided', () => {
    const details = { reason: 'Token expired' };
    const error = new AuthenticationError('Authentication failed', details);

    expect(error.details).toEqual(details);
  });
});

describe('AuthorizationError', () => {
  it('should create authorization error with default values', () => {
    const error = new AuthorizationError('Access denied');

    expect(error.message).toBe('Access denied');
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.i18nKey).toBe('errors.authorization');
  });

  it('should include resource and action details when provided', () => {
    const details = { resource: 'User', action: 'delete', requiredPermission: 'admin' };
    const error = new AuthorizationError('Access denied', details);

    expect(error.details).toEqual(details);
  });
});

describe('ConflictError', () => {
  it('should create conflict error with default values', () => {
    const error = new ConflictError('Resource already exists');

    expect(error.message).toBe('Resource already exists');
    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.i18nKey).toBe('errors.conflict');
  });

  it('should include conflicting value when provided', () => {
    const details = { resource: 'User', conflictingValue: 'existing@email.com' };
    const error = new ConflictError('Email already exists', details);

    expect(error.details).toEqual(details);
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error with default values', () => {
    const error = new RateLimitError('Too many requests');

    expect(error.message).toBe('Too many requests');
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.i18nKey).toBe('errors.rateLimit');
  });

  it('should include retryAfter when provided', () => {
    const details = { retryAfter: 60, limit: 100, remaining: 0 };
    const error = new RateLimitError('Rate limit exceeded', details);

    expect(error.retryAfter).toBe(60);
    expect(error.details).toEqual(details);
  });

  it('should handle undefined retryAfter', () => {
    const error = new RateLimitError('Rate limit exceeded');

    expect(error.retryAfter).toBeUndefined();
  });
});

describe('InternalError', () => {
  it('should create internal error with default values', () => {
    const error = new InternalError('Internal server error');

    expect(error.message).toBe('Internal server error');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.i18nKey).toBe('errors.internal');
    expect(error.isOperational).toBe(false);
  });

  it('should include operation details when provided', () => {
    const details = { operation: 'database_query', originalError: 'Connection timeout' };
    const error = new InternalError('Database error', details);

    expect(error.details).toEqual(details);
  });

  it('should include cause when provided', () => {
    const cause = new Error('Original error');
    const error = new InternalError('Wrapped error', {}, undefined, cause);

    expect(error.cause).toBe(cause);
  });
});

describe('NotImplementedError', () => {
  it('should create not implemented error', () => {
    const error = new NotImplementedError('Feature not implemented');

    expect(error.message).toBe('Feature not implemented');
    expect(error.name).toBe('NotImplementedError');
  });

  it('should be instance of Error', () => {
    const error = new NotImplementedError('Test');

    expect(error).toBeInstanceOf(Error);
  });
});
