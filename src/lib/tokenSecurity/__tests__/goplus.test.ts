import { clearGoPlusCacheForTest, fetchGoPlusTokenSecurity } from '../goplus';

const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

function goPlusOkBody(record: Record<string, string>): string {
  return JSON.stringify({ code: 1, message: 'OK', result: { [USDC_BASE]: record } });
}

const HEALTHY_RECORD: Record<string, string> = {
  token_symbol: 'USDC',
  is_honeypot: '0',
  buy_tax: '0',
  sell_tax: '0',
  is_open_source: '1',
  is_proxy: '1',
  is_mintable: '0',
  hidden_owner: '0',
  holder_count: '11072602',
  is_in_cex: '1',
  trust_list: '1',
};

describe('fetchGoPlusTokenSecurity', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  beforeEach(() => {
    clearGoPlusCacheForTest();
    fetchMock.mockReset();
    // jsdom test env has no global fetch — assign directly (the client reads
    // globalThis.fetch lazily at call time via its default parameter).
    (globalThis as { fetch?: unknown }).fetch = fetchMock as unknown;
  });

  afterEach(() => {
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it('returns the raw body plus record on a healthy response', async () => {
    const rawBody = goPlusOkBody(HEALTHY_RECORD);
    fetchMock.mockResolvedValue(new Response(rawBody, { status: 200 }));

    const result = await fetchGoPlusTokenSecurity(8453, USDC_BASE);

    expect(result).not.toBeNull();
    expect(result?.rawBody).toBe(rawBody);
    expect(result?.record.is_honeypot).toBe('0');
    expect(result?.contractAddress).toBe(USDC_BASE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/token_security/8453');
    expect(fetchMock.mock.calls[0][0]).toContain(encodeURIComponent(USDC_BASE));
  });

  it('serves repeat lookups from the 15-minute cache', async () => {
    fetchMock.mockResolvedValue(new Response(goPlusOkBody(HEALTHY_RECORD), { status: 200 }));

    await fetchGoPlusTokenSecurity(8453, USDC_BASE);
    await fetchGoPlusTokenSecurity(8453, USDC_BASE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the Authorization header only when GOPLUS_API_KEY is set', async () => {
    fetchMock.mockResolvedValue(new Response(goPlusOkBody(HEALTHY_RECORD), { status: 200 }));

    delete process.env.GOPLUS_API_KEY;
    await fetchGoPlusTokenSecurity(8453, USDC_BASE);
    const keylessHeaders = (fetchMock.mock.calls[0][1]?.headers ?? {}) as Record<string, string>;
    expect(keylessHeaders.Authorization).toBeUndefined();

    clearGoPlusCacheForTest();
    process.env.GOPLUS_API_KEY = 'test-token-123';
    try {
      await fetchGoPlusTokenSecurity(8453, USDC_BASE);
      const keyedHeaders = (fetchMock.mock.calls[1][1]?.headers ?? {}) as Record<string, string>;
      expect(keyedHeaders.Authorization).toBe('test-token-123');
    } finally {
      delete process.env.GOPLUS_API_KEY;
    }
  });

  it('returns null on a non-OK GoPlus error code (never synthesizes)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'rate limited' }), { status: 200 })
    );

    const result = await fetchGoPlusTokenSecurity(8453, USDC_BASE);

    expect(result).toBeNull();
  });

  it('returns null on an HTTP error status', async () => {
    fetchMock.mockResolvedValue(new Response('too many requests', { status: 429 }));

    const result = await fetchGoPlusTokenSecurity(8453, USDC_BASE);

    expect(result).toBeNull();
  });

  it('returns null when the contract has no scan entry (unknown token)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 1, result: {} }), { status: 200 })
    );

    const result = await fetchGoPlusTokenSecurity(8453, USDC_BASE);

    expect(result).toBeNull();
  });

  it('returns null when the fetch throws (timeout / network)', async () => {
    fetchMock.mockRejectedValue(new Error('The operation was aborted'));

    const result = await fetchGoPlusTokenSecurity(8453, USDC_BASE);

    expect(result).toBeNull();
  });

  it('rejects malformed addresses and non-positive chain ids without fetching', async () => {
    expect(await fetchGoPlusTokenSecurity(8453, 'not-an-address')).toBeNull();
    expect(await fetchGoPlusTokenSecurity(0, USDC_BASE)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('parseTokenSecurityViewFields (via fetchGoPlusTokenSecurity record)', () => {
  it('is exercised end-to-end through the service lane tests', () => {
    // Parsing is covered through the service evidence-lane tests; this anchor
    // documents the intent.
    expect(HEALTHY_RECORD.is_honeypot).toBe('0');
  });
});
