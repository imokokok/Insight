import { withRetry } from './enhancedRetry';

jest.mock('@/lib/monitoring', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  normalizeError: (error: unknown) =>
    error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error'),
}));

describe('withRetry', () => {
  it('retries a Cloudflare status expressed as an error code', async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('Supabase upstream response: Error code 522'))
      .mockResolvedValueOnce('persisted');

    const result = await withRetry(operation, 'test-retry-error-code-522', {
      maxAttempts: 2,
      baseDelay: 0,
      maxDelay: 0,
      retryableStatuses: [522],
      timeout: 1_000,
    });

    expect(result).toMatchObject({ success: true, data: 'persisted', attempts: 2 });
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
