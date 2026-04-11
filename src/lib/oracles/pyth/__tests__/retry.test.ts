import { sleep, withRetry } from '../retry';

import type { RetryConfig } from '../../pythConstants';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('retry', () => {
  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('should resolve immediately for 0ms', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('withRetry', () => {
    const defaultConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    };

    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, defaultConfig, 'testOperation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, defaultConfig, 'testOperation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation, defaultConfig, 'testOperation')).rejects.toThrow(
        'Persistent failure'
      );

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use default config when not provided', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, undefined, 'testOperation');

      expect(result).toBe('success');
    });

    it('should use default operation name when not provided', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, defaultConfig);

      expect(result).toBe('success');
    });

    it('should apply exponential backoff', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const start = Date.now();
      await withRetry(operation, { ...defaultConfig, baseDelay: 50 }, 'testOperation');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelay', async () => {
      const config: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 10,
        maxDelay: 50,
        backoffMultiplier: 10,
      };

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const start = Date.now();
      await withRetry(operation, config, 'testOperation');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(200);
    });

    it('should handle non-Error thrown values', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(withRetry(operation, defaultConfig, 'testOperation')).rejects.toThrow(
        'string error'
      );
    });

    it('should handle single attempt config', async () => {
      const config: RetryConfig = {
        maxAttempts: 1,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
      };

      const operation = jest.fn().mockRejectedValue(new Error('Failure'));

      await expect(withRetry(operation, config, 'testOperation')).rejects.toThrow('Failure');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should work with async operations that return undefined', async () => {
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await withRetry(operation, defaultConfig, 'testOperation');

      expect(result).toBeUndefined();
    });

    it('should work with async operations that return objects', async () => {
      const expectedObject = { key: 'value' };
      const operation = jest.fn().mockResolvedValue(expectedObject);

      const result = await withRetry(operation, defaultConfig, 'testOperation');

      expect(result).toEqual(expectedObject);
    });

    it('should work with async operations that return arrays', async () => {
      const expectedArray = [1, 2, 3];
      const operation = jest.fn().mockResolvedValue(expectedArray);

      const result = await withRetry(operation, defaultConfig, 'testOperation');

      expect(result).toEqual(expectedArray);
    });
  });
});
