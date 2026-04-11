import { AppError } from '../AppError';
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

describe('Error module exports', () => {
  describe('AppError classes', () => {
    it('should export AppError', () => {
      expect(AppError).toBeDefined();
      expect(typeof AppError).toBe('function');
    });

    it('should export ValidationError', () => {
      expect(ValidationError).toBeDefined();
      expect(typeof ValidationError).toBe('function');
    });

    it('should export NotFoundError', () => {
      expect(NotFoundError).toBeDefined();
      expect(typeof NotFoundError).toBe('function');
    });

    it('should export AuthenticationError', () => {
      expect(AuthenticationError).toBeDefined();
      expect(typeof AuthenticationError).toBe('function');
    });

    it('should export AuthorizationError', () => {
      expect(AuthorizationError).toBeDefined();
      expect(typeof AuthorizationError).toBe('function');
    });

    it('should export ConflictError', () => {
      expect(ConflictError).toBeDefined();
      expect(typeof ConflictError).toBe('function');
    });

    it('should export RateLimitError', () => {
      expect(RateLimitError).toBeDefined();
      expect(typeof RateLimitError).toBe('function');
    });

    it('should export InternalError', () => {
      expect(InternalError).toBeDefined();
      expect(typeof InternalError).toBe('function');
    });

    it('should export NotImplementedError', () => {
      expect(NotImplementedError).toBeDefined();
      expect(typeof NotImplementedError).toBe('function');
    });
  });

  describe('Error classes functionality', () => {
    it('ValidationError should work correctly', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('NotFoundError should work correctly', () => {
      const error = new NotFoundError('User not found');
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('AuthenticationError should work correctly', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });

    it('AuthorizationError should work correctly', () => {
      const error = new AuthorizationError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });

    it('ConflictError should work correctly', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
    });

    it('RateLimitError should work correctly', () => {
      const error = new RateLimitError('Too many requests');
      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
    });

    it('InternalError should work correctly', () => {
      const error = new InternalError('Internal server error');
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });

    it('NotImplementedError should work correctly', () => {
      const error = new NotImplementedError('Feature not implemented');
      expect(error.message).toBe("Feature 'Feature not implemented' is not implemented yet");
      expect(error.name).toBe('NotImplementedError');
    });
  });
});
