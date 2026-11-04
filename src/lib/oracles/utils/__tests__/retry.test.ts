import { withOracleRetry } from '../retry';

describe('withOracleRetry cancellation', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not start another external attempt after cancellation during backoff', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const operation = jest.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          controller.signal.addEventListener(
            'abort',
            () => reject(new Error('temporary network failure')),
            { once: true }
          );
        })
    );

    const pending = withOracleRetry(
      operation,
      'deadline-test',
      { maxAttempts: 3, baseDelay: 10, maxDelay: 10, timeout: 100 },
      controller.signal
    );
    await Promise.resolve();
    controller.abort(new Error('request deadline exceeded'));

    await expect(pending).rejects.toThrow('request deadline exceeded');
    await jest.advanceTimersByTimeAsync(100);

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
