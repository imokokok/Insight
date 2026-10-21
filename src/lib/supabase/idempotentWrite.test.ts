import { withRetry } from '@/lib/api/retry/enhancedRetry';

import { retryIdempotentSupabaseWrite } from './idempotentWrite';

jest.mock('@/lib/api/retry/enhancedRetry', () => ({ withRetry: jest.fn() }));

const mockedWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

describe('retryIdempotentSupabaseWrite', () => {
  beforeEach(() => {
    mockedWithRetry.mockReset();
  });

  it('configures retries for transient Cloudflare origin failures', async () => {
    const operation = jest.fn().mockResolvedValue('written');
    mockedWithRetry.mockResolvedValue({
      success: true,
      data: 'written',
      attempts: 2,
      totalDuration: 10,
      strategy: 'exponential',
    });

    await expect(retryIdempotentSupabaseWrite(operation, 'test write')).resolves.toBe('written');
    expect(mockedWithRetry).toHaveBeenCalledWith(
      operation,
      'test write',
      expect.objectContaining({
        maxAttempts: 3,
        retryableStatuses: expect.arrayContaining([522, 523, 524]),
      })
    );
  });

  it('preserves the final write error once retries are exhausted', async () => {
    const failure = new Error('Error code 522');
    mockedWithRetry.mockResolvedValue({
      success: false,
      error: failure,
      attempts: 3,
      totalDuration: 10,
      strategy: 'exponential',
    });

    await expect(retryIdempotentSupabaseWrite(jest.fn(), 'test write')).rejects.toBe(failure);
  });
});
