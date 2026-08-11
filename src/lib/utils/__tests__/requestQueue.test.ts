import { RequestQueue } from '../requestQueue';

describe('RequestQueue', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the execute result and records completion', async () => {
    const queue = new RequestQueue({ maxConcurrency: 1 });
    const result = await queue.add(async () => 7);
    expect(result).toBe(7);
    expect(queue.getStats().completed).toBe(1);
    expect(queue.getStats().running).toBe(0);
  });

  it('rejects immediately when the abort signal is already aborted', async () => {
    const queue = new RequestQueue({ maxConcurrency: 1 });
    const controller = new AbortController();
    controller.abort();
    await expect(
      queue.add(() => Promise.resolve(1), { abortSignal: controller.signal })
    ).rejects.toThrow('Request aborted');
  });

  it('does not double-count when a request times out while still running', async () => {
    jest.useFakeTimers();
    const queue = new RequestQueue({ maxConcurrency: 2, defaultTimeout: 100 });

    let resolveExecute!: (value: number) => void;
    const execute = new Promise<number>((resolve) => {
      resolveExecute = resolve;
    });

    const promise = queue.add(() => execute, { timeout: 100 });

    // Fire the timeout before the underlying work settles.
    jest.advanceTimersByTime(150);
    await expect(promise).rejects.toThrow('Request timeout');

    // Now the late work settles — executeRequest must NOT re-count it, and
    // `running` must not be decremented a second time (which would underflow
    // and let the queue breach maxConcurrency).
    resolveExecute(42);
    jest.advanceTimersByTime(1);
    await Promise.resolve();

    const stats = queue.getStats();
    expect(stats.completed).toBe(0);
    expect(stats.failed).toBe(1);
    expect(stats.running).toBe(0);
  });

  it('keeps the concurrency slot free after a timeout so new work runs', async () => {
    jest.useFakeTimers();
    const queue = new RequestQueue({ maxConcurrency: 1, defaultTimeout: 100 });

    let resolveExecute!: (value: number) => void;
    const execute = new Promise<number>((resolve) => {
      resolveExecute = resolve;
    });

    const timedOut = queue.add(() => execute, { timeout: 100 });
    jest.advanceTimersByTime(150);
    await expect(timedOut).rejects.toThrow('Request timeout');

    const later = queue.add(async () => 99, { timeout: 100 });
    const result = await later;
    expect(result).toBe(99);
    expect(queue.getStats().completed).toBe(1);

    // Late settle of the timed-out request must not re-count it.
    resolveExecute(42);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(queue.getStats().completed).toBe(1);
  });
});
