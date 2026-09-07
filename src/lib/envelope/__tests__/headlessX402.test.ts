import {
  HEADLESS_X402_AMOUNT_ATOMIC,
  HEADLESS_X402_NETWORK,
  HEADLESS_X402_PAY_TO,
  HEADLESS_X402_USDC,
  getHeadlessRequestHeaders,
  getHeadlessStatusFetch,
  selectHeadlessOptionAPayment,
} from '@/lib/envelope/headlessX402';

const OPTION_A = {
  scheme: 'exact',
  network: HEADLESS_X402_NETWORK,
  asset: HEADLESS_X402_USDC,
  amount: HEADLESS_X402_AMOUNT_ATOMIC,
  payTo: HEADLESS_X402_PAY_TO,
  maxTimeoutSeconds: 60,
  extra: { name: 'USD Coin', version: '2' },
};

describe('selectHeadlessOptionAPayment', () => {
  it('accepts only the exact published v2 Option A terms', () => {
    expect(selectHeadlessOptionAPayment(2, [OPTION_A])).toEqual([OPTION_A]);
  });

  it.each([
    ['legacy protocol', 1, OPTION_A],
    ['wrong scheme', 2, { ...OPTION_A, scheme: 'upto' }],
    ['wrong network', 2, { ...OPTION_A, network: 'eip155:84532' as const }],
    ['wrong asset', 2, { ...OPTION_A, asset: '0x0000000000000000000000000000000000000001' }],
    ['wrong recipient', 2, { ...OPTION_A, payTo: '0x0000000000000000000000000000000000000001' }],
    ['higher amount', 2, { ...OPTION_A, amount: '1001' }],
  ])('rejects %s', (_label, version, requirement) => {
    expect(selectHeadlessOptionAPayment(version, [requirement])).toEqual([]);
  });
});

describe('Headless authentication configuration', () => {
  const originalEnabled = process.env.HEADLESS_X402_ENABLED;
  const originalPrivateKey = process.env.HEADLESS_X402_PRIVATE_KEY;
  const originalApiKey = process.env.HEADLESS_ORACLE_API_KEY;

  afterEach(() => {
    if (originalEnabled === undefined) delete process.env.HEADLESS_X402_ENABLED;
    else process.env.HEADLESS_X402_ENABLED = originalEnabled;
    if (originalPrivateKey === undefined) delete process.env.HEADLESS_X402_PRIVATE_KEY;
    else process.env.HEADLESS_X402_PRIVATE_KEY = originalPrivateKey;
    if (originalApiKey === undefined) delete process.env.HEADLESS_ORACLE_API_KEY;
    else process.env.HEADLESS_ORACLE_API_KEY = originalApiKey;
  });

  it('uses native fetch unless real payment is explicitly enabled', () => {
    delete process.env.HEADLESS_X402_ENABLED;
    const baseFetch = jest.fn() as unknown as typeof fetch;
    expect(getHeadlessStatusFetch(baseFetch)).toBe(baseFetch);
  });

  it('fails closed when payment is enabled without a dedicated payer key', () => {
    process.env.HEADLESS_X402_ENABLED = 'true';
    delete process.env.HEADLESS_X402_PRIVATE_KEY;
    expect(() => getHeadlessStatusFetch(jest.fn() as unknown as typeof fetch)).toThrow(
      'HEADLESS_X402_PRIVATE_KEY is required'
    );
  });

  it('handles an exact v2 402 by signing and retrying with PAYMENT-SIGNATURE', async () => {
    process.env.HEADLESS_X402_ENABLED = 'true';
    // Public Anvil/Hardhat test key. It never holds production funds.
    process.env.HEADLESS_X402_PRIVATE_KEY =
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const url = 'https://headlessoracle.com/v5/status?mic=XNYS';
    const paymentRequired = {
      x402Version: 2,
      resource: { url, description: 'Headless market state', mimeType: 'application/json' },
      accepts: [OPTION_A],
    };
    const baseFetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(paymentRequired)).toString('base64'),
          },
        })
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const paidFetch = getHeadlessStatusFetch(baseFetch as unknown as typeof fetch);
    const response = await paidFetch(url);

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
    const retriedRequest = baseFetch.mock.calls[1]?.[0] as Request;
    expect(retriedRequest.headers.get('PAYMENT-SIGNATURE')).toBeTruthy();
  });

  it('adds the bridge key only when configured', () => {
    delete process.env.HEADLESS_ORACLE_API_KEY;
    expect(getHeadlessRequestHeaders()).toEqual({ accept: 'application/json' });

    process.env.HEADLESS_ORACLE_API_KEY = 'ho_bridge_test';
    expect(getHeadlessRequestHeaders()).toEqual({
      accept: 'application/json',
      'X-Oracle-Key': 'ho_bridge_test',
    });
  });
});
