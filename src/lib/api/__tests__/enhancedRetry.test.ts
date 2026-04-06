import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  EnhancedRetryManager,
  createRetryManager,
  withRetry,
  createRetryableFetch,
  retryStrategies,
  defaultEnhancedRetryConfig,
} from '../retry/enhancedRetry';

describe('Enhanced Retry System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('EnhancedRetryManager', () => {
    it('should succeed on first attempt', async () => {
      const manager = new EnhancedRetryManager();
      const operation = vi.fn().mockResolvedValue('success');

      const result = await manager.execute(operation, 'test-operation');

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 3,
        baseDelay: 100,
        strategy: 'fixed',
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const promise = manager.execute(operation, 'test-operation');

      // Fast-forward through delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 3,
        baseDelay: 100,
        strategy: 'fixed',
      });

      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const promise = manager.execute(operation, 'test-operation');

      // Fast-forward through all delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toBeDefined();
    });

    it('should use exponential backoff strategy', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 4,
        baseDelay: 100,
        backoffMultiplier: 2,
        strategy: 'exponential',
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValue('success');

      const promise = manager.execute(operation, 'test-operation');

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Second retry after 200ms
      await vi.advanceTimersByTimeAsync(200);
      // Third retry after 400ms
      await vi.advanceTimersByTimeAsync(400);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(4);
    });

    it('should not retry non-retryable errors', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 3,
        retryableStatuses: [500, 502, 503],
      });

      const error = new Error('Bad request');
      (error as Error & { statusCode: number }).statusCode = 400;

      const operation = vi.fn().mockRejectedValue(error);

      const result = await manager.execute(operation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect timeout', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 2,
        timeout: 100,
      });

      const operation = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200, 'success')));

      const result = await manager.execute(operation, 'test-operation');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });

    it('should trigger callbacks correctly', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 3,
        baseDelay: 100,
        strategy: 'fixed',
      });

      const onRetry = vi.fn();
      const onSuccess = vi.fn();
      const onFailure = vi.fn();

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValue('success');

      const promise = manager.execute(operation, 'test-operation', {
        onRetry,
        onSuccess,
        onFailure,
      });

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onFailure).not.toHaveBeenCalled();
    });

    it('should trigger onFailure callback on final failure', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 2,
        baseDelay: 100,
        strategy: 'fixed',
      });

      const onFailure = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const promise = manager.execute(operation, 'test-operation', {
        onFailure,
      });

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(onFailure).toHaveBeenCalledTimes(1);
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
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 3,
        circuitBreakerResetTime: 60000,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Error'));

      // First 3 failures should trigger circuit open
      await manager.execute(operation, 'test');
      await manager.execute(operation, 'test');
      await manager.execute(operation, 'test');

      // Circuit should be open now
      const result = await manager.execute(operation, 'test');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker is OPEN');
      expect(result.attempts).toBe(0);
    });

    it('should report circuit breaker state', async () => {
      const manager = new EnhancedRetryManager({
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
      });

      expect(manager.getCircuitBreakerState()).toBe('CLOSED');

      const operation = vi.fn().mockRejectedValue(new Error('Error'));
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

  describe('withRetry', () => {
    it('should execute operation with retry', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success');

      await withRetry(operation, 'test', {
        maxAttempts: 2,
        baseDelay: 100,
        strategy: 'fixed',
      });

      await vi.advanceTimersByTimeAsync(100);

      // Result might not be immediately available due to async nature
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('createRetryableFetch', () => {
    it('should create a retryable fetch function', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const retryableFetch = createRetryableFetch(mockFetch, {
        maxAttempts: 2,
        baseDelay: 100,
        strategy: 'fixed',
      });

      const promise = retryableFetch('https://api.example.com/data');
      await vi.advanceTimersByTimeAsync(100);

      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });

    it('should throw after all retries exhausted', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const retryableFetch = createRetryableFetch(mockFetch, {
        maxAttempts: 2,
        baseDelay: 100,
        strategy: 'fixed',
      });

      await expect(retryableFetch('https://api.example.com/data')).rejects.toThrow(
        'Fetch failed after retries'
      );
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

  describe('Retry Strategies', () => {
    it('should use fixed delay for fixed strategy', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 3,
        baseDelay: 100,
        strategy: 'fixed',
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success');

      const promise = manager.execute(operation, 'test');

      // Both retries should use the same delay
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.success).toBe(true);
    });

    it('should use linear delay for linear strategy', async () => {
      const manager = new EnhancedRetryManager({
        maxAttempts: 4,
        baseDelay: 100,
        strategy: 'linear',
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success');

      const promise = manager.execute(operation, 'test');

      // Linear delays: 100ms, 200ms, 300ms
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(300);

      const result = await promise;
      expect(result.success).toBe(true);
    });
  });
});
