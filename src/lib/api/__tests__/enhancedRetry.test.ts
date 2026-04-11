import {
  EnhancedRetryManager,
  createRetryManager,
  retryStrategies,
  defaultEnhancedRetryConfig,
} from '../retry/enhancedRetry';

describe('Enhanced Retry System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('EnhancedRetryManager', () => {
    it('should succeed on first attempt', async () => {
      const manager = new EnhancedRetryManager();
      const operation = jest.fn().mockResolvedValue('success');

      const result = await manager.execute(operation, 'test-operation');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 2,
        baseDelay: 0,
        strategy: 'fixed',
      });

      const networkError = new Error('Network error: ECONNREFUSED');
      const operation = jest.fn().mockRejectedValue(networkError);

      const result = await manager.execute(operation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.error).toBeDefined();
    });

    it('should not retry non-retryable errors', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 3,
        retryableStatuses: [500, 502, 503],
      });

      const error = new Error('Bad request') as Error & { statusCode: number };
      error.statusCode = 400;

      const operation = jest.fn().mockRejectedValue(error);

      const result = await manager.execute(operation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should update config dynamically', () => {
      const manager = new EnhancedRetryManager({ maxAttempts: 3 });

      expect(manager.getConfig().maxAttempts).toBe(3);

      manager.updateConfig({ maxAttempts: 5 });

      expect(manager.getConfig().maxAttempts).toBe(5);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 1,
        baseDelay: 0,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 3,
        circuitBreakerResetTime: 60000,
      });

      const operation = jest.fn().mockRejectedValue(new Error('Error'));

      await manager.execute(operation, 'test');
      await manager.execute(operation, 'test');
      await manager.execute(operation, 'test');

      const result = await manager.execute(operation, 'test');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker is OPEN');
      expect(result.attempts).toBe(0);
    });

    it('should report circuit breaker state', async () => {
      const manager = new EnhancedRetryManager({
        baseDelay: 0,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
      });

      expect(manager.getCircuitBreakerState()).toBe('CLOSED');

      const operation = jest.fn().mockRejectedValue(new Error('Error'));
      await manager.execute(operation, 'test');
      await manager.execute(operation, 'test');

      expect(manager.getCircuitBreakerState()).toBe('OPEN');
    });
  });

  describe('createRetryManager', () => {
    it('should create a new retry manager with custom config', () => {
      const manager = createRetryManager({
        maxAttempts: 5,
        strategy: 'linear',
      });

      expect(manager).toBeInstanceOf(EnhancedRetryManager);
      expect(manager.getConfig().maxAttempts).toBe(5);
      expect(manager.getConfig().strategy).toBe('linear');
    });
  });

  describe('retryStrategies', () => {
    it('should have fast strategy', () => {
      expect(retryStrategies.fast).toEqual({
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        strategy: 'fixed',
      });
    });

    it('should have standard strategy', () => {
      expect(retryStrategies.standard).toEqual(defaultEnhancedRetryConfig);
    });

    it('should have aggressive strategy', () => {
      expect(retryStrategies.aggressive.maxAttempts).toBe(5);
      expect(retryStrategies.aggressive.strategy).toBe('exponential');
    });

    it('should have gentle strategy', () => {
      expect(retryStrategies.gentle.maxAttempts).toBe(2);
      expect(retryStrategies.gentle.strategy).toBe('linear');
    });

    it('should have jitter strategy', () => {
      expect(retryStrategies.jitter.strategy).toBe('decorrelated-jitter');
    });
  });
});
