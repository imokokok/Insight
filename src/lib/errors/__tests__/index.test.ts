import { AppError } from '../AppError';
import { ValidationError, InternalError } from '../BusinessErrors';
import {
  OracleClientError,
  PriceFetchError,
  UnsupportedChainError,
  UnsupportedSymbolError,
  OracleProviderError,
} from '../OracleError';

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

    it('should export InternalError', () => {
      expect(InternalError).toBeDefined();
      expect(typeof InternalError).toBe('function');
    });

    it('should export OracleClientError', () => {
      expect(OracleClientError).toBeDefined();
      expect(typeof OracleClientError).toBe('function');
    });

    it('should export PriceFetchError', () => {
      expect(PriceFetchError).toBeDefined();
      expect(typeof PriceFetchError).toBe('function');
    });

    it('should export UnsupportedChainError', () => {
      expect(UnsupportedChainError).toBeDefined();
      expect(typeof UnsupportedChainError).toBe('function');
    });

    it('should export UnsupportedSymbolError', () => {
      expect(UnsupportedSymbolError).toBeDefined();
      expect(typeof UnsupportedSymbolError).toBe('function');
    });

    it('should export OracleProviderError', () => {
      expect(OracleProviderError).toBeDefined();
      expect(typeof OracleProviderError).toBe('function');
    });
  });

  describe('Error classes functionality', () => {
    it('ValidationError should work correctly', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('InternalError should work correctly', () => {
      const error = new InternalError('Internal server error');
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });

    it('OracleProviderError should work correctly', () => {
      const error = new OracleProviderError('Fetch failed', 'redstone', 'NETWORK_ERROR');
      expect(error.message).toBe('Fetch failed');
      expect(error.provider).toBe('redstone');
      expect(error.errorCode).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.code).toBe('REDSTONE_ERROR');
    });

    it('OracleProviderError should use config for severity and retryable', () => {
      const retryableError = new OracleProviderError('Test', 'chainlink', 'AGGREGATOR_OFFLINE');
      expect(retryableError.retryable).toBe(true);
      expect(retryableError.severity).toBe('high');

      const nonRetryableError = new OracleProviderError('Test', 'pyth', 'INVALID_PRICE');
      expect(nonRetryableError.retryable).toBe(false);
      expect(nonRetryableError.severity).toBe('critical');
    });

    it('OracleProviderError should fallback for unknown error codes', () => {
      const error = new OracleProviderError('Test', 'redstone', 'UNKNOWN_CODE');
      expect(error.retryable).toBe(true);
      expect(error.severity).toBe('medium');
    });

    it('PriceFetchError should work correctly', () => {
      const error = new PriceFetchError('Price fetch failed', { retryable: true });
      expect(error.message).toBe('Price fetch failed');
      expect(error.retryable).toBe(true);
    });
  });
});
