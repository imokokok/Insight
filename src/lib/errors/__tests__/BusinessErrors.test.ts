import { ValidationError, InternalError } from '../BusinessErrors';

describe('ValidationError', () => {
  it('should create validation error with default values', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it('should include details when provided', () => {
    const details = { field: 'email', value: 'invalid', constraints: { format: 'email' } };
    const error = new ValidationError('Invalid email', details);

    expect(error.details).toEqual(details);
  });
});

describe('InternalError', () => {
  it('should create internal error with default values', () => {
    const error = new InternalError('Internal server error');

    expect(error.message).toBe('Internal server error');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });

  it('should include operation details when provided', () => {
    const details = { operation: 'database_query', originalError: 'Connection timeout' };
    const error = new InternalError('Database error', details);

    expect(error.details).toEqual(details);
  });

  it('should include cause when provided', () => {
    const cause = new Error('Original error');
    const error = new InternalError('Wrapped error', {}, cause);

    expect(error.cause).toBe(cause);
  });
});
