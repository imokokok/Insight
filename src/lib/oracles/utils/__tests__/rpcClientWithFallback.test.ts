/** @jest-environment node */
import {
  getRpcUsage,
  RpcApplicationError,
  RpcClientWithFallback,
  rpcUsageSince,
} from '../rpcClientWithFallback';

const endpoints = ['https://first.invalid/private-key', 'https://second.invalid/private-key'];
const result = (payload: unknown) => ({ ok: true, json: async () => payload }) as Response;
beforeEach(() => {
  global.fetch = jest.fn();
});
const fetchMock = () => global.fetch as jest.Mock;

test.each([-32700, -32600, -32601, -32602, 3])(
  'deterministic RPC error %s stops fallback and leaves the endpoint healthy',
  async (code) => {
    const client = new RpcClientWithFallback({ contextLabel: 'deterministic' });
    fetchMock().mockResolvedValue(result({ error: { code, message: 'invalid request' } }));
    await expect(client.rpcCallWithFallback('1', endpoints, 'eth_call', [])).rejects.toBeInstanceOf(
      RpcApplicationError
    );
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(client.isEndpointHealthy('1', 0)).toBe(true);
  }
);

test('a deterministic contract revert also stops fallback for node-specific error codes', async () => {
  const client = new RpcClientWithFallback();
  fetchMock().mockResolvedValue(
    result({ error: { code: -32000, message: 'execution reverted: unavailable feed' } })
  );
  await expect(client.rpcCallWithFallback('1', endpoints, 'eth_call', [])).rejects.toThrow(
    'execution reverted'
  );
  expect(fetchMock()).toHaveBeenCalledTimes(1);
});

test.each([
  { code: -32005, message: 'rate limit exceeded' },
  { code: -32000, message: 'missing trie node' },
  { code: -32603, message: 'internal error' },
])('transient node error preserves fallback: $message', async (error) => {
  const client = new RpcClientWithFallback();
  fetchMock()
    .mockResolvedValueOnce(result({ error }))
    .mockResolvedValueOnce(result({ result: '0x01' }));
  await expect(client.rpcCallWithFallback('1', endpoints, 'eth_call', [])).resolves.toBe('0x01');
  expect(fetchMock()).toHaveBeenCalledTimes(2);
  expect(client.isEndpointHealthy('1', 0)).toBe(true);
});

test('transport failure still fails over and resource counters contain no endpoints or payloads', async () => {
  const before = getRpcUsage();
  const client = new RpcClientWithFallback({ contextLabel: 'usage-test' });
  fetchMock()
    .mockRejectedValueOnce(new Error('connection refused'))
    .mockResolvedValueOnce(result({ result: 'private-return-value' }));
  await expect(
    client.rpcCallWithFallback('8453', endpoints, 'eth_call', ['private-calldata'])
  ).resolves.toBe('private-return-value');
  expect(client.isEndpointHealthy('8453', 0)).toBe(false);
  expect(rpcUsageSince(before)).toEqual([
    expect.objectContaining({
      context: 'usage-test',
      chain: '8453',
      method: 'eth_call',
      attempts: 2,
      successes: 1,
      failures: 1,
      timeouts: 0,
    }),
  ]);
  expect(JSON.stringify(rpcUsageSince(before))).not.toMatch(/private|https/);
});

test('caller cancellation does not try another endpoint', async () => {
  const controller = new AbortController();
  const client = new RpcClientWithFallback();
  fetchMock().mockImplementation(() => {
    controller.abort();
    throw new DOMException('aborted', 'AbortError');
  });
  await expect(
    client.rpcCallWithFallback('1', endpoints, 'eth_call', [], controller.signal)
  ).rejects.toThrow('aborted');
  expect(fetchMock()).toHaveBeenCalledTimes(1);
});

test('timeout covers a stalled response body and preserves fallback', async () => {
  const before = getRpcUsage();
  const client = new RpcClientWithFallback({ contextLabel: 'body-timeout', requestTimeout: 5 });
  fetchMock()
    .mockImplementationOnce(async (_: unknown, options: RequestInit) => ({
      ok: true,
      json: () =>
        new Promise((_, reject) =>
          options.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true }
          )
        ),
    }))
    .mockResolvedValueOnce(result({ result: '0x01' }));
  await expect(client.rpcCallWithFallback('1', endpoints, 'eth_call', [])).resolves.toBe('0x01');
  expect(fetchMock()).toHaveBeenCalledTimes(2);
  expect(rpcUsageSince(before)).toEqual([
    expect.objectContaining({ attempts: 2, failures: 1, successes: 1, timeouts: 1 }),
  ]);
  expect(client.isEndpointHealthy('1', 0)).toBe(true);
});
