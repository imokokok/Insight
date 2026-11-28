import { getSupraDataService } from '@/lib/oracles/services/supraDataService';

jest.mock('supra-oracle-sdk', () => ({
  __esModule: true,
  default: class MockSupraOracleClient {
    getOracleData(pairIndexes: number[]) {
      return (this as unknown as { getProof: (indexes: number[]) => Promise<string> }).getProof(
        pairIndexes
      );
    }
  },
}));

describe('Supra DORA transport cancellation', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('aborts the underlying proof request when the caller cancels', async () => {
    let requestSignal: AbortSignal | undefined;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const fetchMock = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal as AbortSignal;
      markStarted();
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener(
          'abort',
          () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          },
          { once: true }
        );
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const controller = new AbortController();
    const pending = getSupraDataService().fetchLatestPrices([1], controller.signal);
    await started;
    controller.abort();

    await expect(pending).rejects.toThrow(/abort/i);
    expect(requestSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
