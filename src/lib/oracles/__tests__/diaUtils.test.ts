import { fetchWithTimeout } from '@/lib/oracles/diaUtils';

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('keeps the timeout active while the response body is being read', async () => {
    let requestSignal: AbortSignal | undefined;
    const fetchMock = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal as AbortSignal;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          new Promise((_resolve, reject) => {
            requestSignal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('The operation was aborted', 'AbortError'));
              },
              { once: true }
            );
          }),
      } as Response);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(fetchWithTimeout('https://example.test/data', { timeout: 10 })).rejects.toThrow(
      'Request timeout after 10ms'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestSignal?.aborted).toBe(true);
  });

  it('rejects invalid timeout values before making a request', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(fetchWithTimeout('https://example.test/data', { timeout: 0 })).rejects.toThrow(
      'positive finite number'
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
