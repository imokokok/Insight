import {
  createResilientFacilitator,
  resetFacilitatorResilienceForTests,
} from '../facilitatorResilience';

const FALLBACK_NETWORKS = ['eip155:8453', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
const FALLBACK_KINDS = FALLBACK_NETWORKS.map((network) => ({
  x402Version: 2,
  scheme: 'exact',
  network,
}));

const GOOD_SUPPORTED = {
  kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }],
  extensions: [],
  signers: {},
};

interface MockResponseInit {
  ok?: boolean;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function mockFetch(
  impl: (url: string, init: RequestInit) => MockResponseInit | Promise<MockResponseInit>
) {
  const fn = jest.fn(async (url: string, init: RequestInit = {}) => {
    const r = await impl(url, init);
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body ?? ''),
      headers: new Map(Object.entries(r.headers ?? {})),
    } as unknown as Response;
  });
  return fn as unknown as jest.MockedFunction<typeof fetch>;
}

describe('createResilientFacilitator', () => {
  let clock: number;
  let now: () => number;

  beforeEach(() => {
    resetFacilitatorResilienceForTests();
    clock = 1_000_000;
    now = () => clock;
  });

  it('caches a successful /supported response and reuses it within the fresh window', async () => {
    const fetchImpl = mockFetch(() => ({ body: GOOD_SUPPORTED }));
    const client = createResilientFacilitator({
      url: 'https://f.example',
      timeoutMs: 5_000,
      cdpAuth: null,
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl,
      now,
    });

    const first = await client.getSupported();
    const second = await client.getSupported();

    expect(first).toEqual(GOOD_SUPPORTED);
    expect(second).toEqual(GOOD_SUPPORTED);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://f.example/supported',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('serves the config-derived fallback immediately on 429 with an empty cache (no 30s retry loop)', async () => {
    const fetchImpl = mockFetch(() => ({ ok: false, status: 429, body: { error: 'slow down' } }));
    const client = createResilientFacilitator({
      url: 'https://f.example',
      timeoutMs: 5_000,
      cdpAuth: null,
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl,
      now,
    });

    const started = Date.now();
    const value = await client.getSupported();
    expect(Date.now() - started).toBeLessThan(1_000);

    expect(value).toEqual({ kinds: FALLBACK_KINDS, extensions: [], signers: {} });
    // Exactly one bounded probe — the core client would have retried 3x with 30s waits.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves stale cache when a later refresh fails inside the stale window', async () => {
    let healthy = true;
    const fetchImpl = mockFetch(() =>
      healthy ? { body: GOOD_SUPPORTED } : { ok: false, status: 503, body: {} }
    );
    const client = createResilientFacilitator({
      url: 'https://f.example',
      timeoutMs: 5_000,
      cdpAuth: null,
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl,
      now,
    });

    await client.getSupported();
    healthy = false;
    clock += 11 * 60_000; // beyond the fresh TTL, inside the 24h stale window

    const value = await client.getSupported();
    expect(value).toEqual(GOOD_SUPPORTED);
  });

  it('does not re-probe upstream during the failure backoff window, then retries', async () => {
    const fetchImpl = mockFetch(() => ({ ok: false, status: 429, body: {} }));
    const client = createResilientFacilitator({
      url: 'https://f.example',
      timeoutMs: 5_000,
      cdpAuth: null,
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl,
      now,
    });

    await client.getSupported();
    clock += 10_000; // inside the 30s backoff
    await client.getSupported();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    clock += 40_000; // beyond the backoff
    await client.getSupported();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back when a 200 response has an unexpected shape', async () => {
    const fetchImpl = mockFetch(() => ({ body: { kinds: 'not-an-array' } }));
    const client = createResilientFacilitator({
      url: 'https://f.example',
      timeoutMs: 5_000,
      cdpAuth: null,
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl,
      now,
    });

    const value = await client.getSupported();
    expect(value).toEqual({ kinds: FALLBACK_KINDS, extensions: [], signers: {} });
  });

  it('attaches a CDP bearer JWT to the /supported probe when cdpAuth is set', async () => {
    const fetchImpl = mockFetch((_url, init) => {
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toMatch(/^Bearer ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./);
      return { body: GOOD_SUPPORTED };
    });
    const client = createResilientFacilitator({
      url: 'https://api.cdp.coinbase.com',
      timeoutMs: 5_000,
      cdpAuth: {
        apiKeyId: 'c816b095-0102-4b4e-ad90-a522a4175df5',
        apiKeySecret:
          'K/O3RFw1POGllQqgTW1Ho3uHdAwxFi2GYMKT6n8+7fVPCa8eem2HmC+O5lWEEA75Snh6xo6lpBRvxr88ju+lJQ==',
      },
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl,
      now,
    });

    await client.getSupported();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('delegates verify to the inner HTTP client with the same URL and timeout', async () => {
    // The inner core client uses global fetch, which the jsdom env lacks.
    global.fetch = jest.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ isValid: true }),
          text: async () => JSON.stringify({ isValid: true }),
          headers: { get: () => null },
        }) as unknown as Response
    ) as unknown as typeof fetch;
    const client = createResilientFacilitator({
      url: 'https://f.example',
      timeoutMs: 5_000,
      cdpAuth: null,
      fallbackKinds: FALLBACK_KINDS,
      fetchImpl: mockFetch(() => ({ body: GOOD_SUPPORTED })),
      now,
    });

    const result = await client.verify(
      { x402Version: 2, scheme: 'exact', network: 'eip155:8453' } as never,
      {
        scheme: 'exact',
        network: 'eip155:8453',
        maxAmountRequired: '20000',
        resource: 'https://oracleinsight.xyz/api/v1/safety/pre-trade',
      } as never
    );
    expect(result).toEqual({ isValid: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://f.example/verify',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
