import { getX402Config, parseX402Config, usdcForNetwork } from '../config';

const BASE_ENV = {
  X402_ENABLED: 'true',
  X402_PAY_TO: '0xAbC0000000000000000000000000000000000001',
  X402_NETWORK: 'eip155:84532',
  X402_PRICE_USD: '0.02',
} as NodeJS.ProcessEnv;

describe('x402 config', () => {
  it('is disabled when the kill switch is off, even with a valid payTo', () => {
    const cfg = getX402Config({ ...BASE_ENV, X402_ENABLED: 'false' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.payTo).toBe('0xAbC0000000000000000000000000000000000001');
  });

  it('is disabled when payTo is left empty (deployment not yet armed)', () => {
    const cfg = getX402Config({ ...BASE_ENV, X402_PAY_TO: '' });
    expect(cfg.enabled).toBe(false);
    // Amount is still deterministic so arming later cannot drift.
    expect(cfg.amountAtomic).toBe('20000');
  });

  it('is enabled with the flag and a valid address', () => {
    const cfg = getX402Config(BASE_ENV);
    expect(cfg.enabled).toBe(true);
    expect(cfg.network).toBe('eip155:84532');
    expect(cfg.amountAtomic).toBe('20000');
    expect(cfg.facilitatorUrl).toBe('https://x402.org/facilitator');
  });

  it('defaults to testnet config when network is unset', () => {
    const cfg = parseX402Config({ X402_ENABLED: 'true', X402_PAY_TO: '' });
    expect(cfg.network).toBe('eip155:84532');
    expect(usdcForNetwork(cfg.network)).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  });

  it('every supported network USDC address is a well-formed 20-byte address', () => {
    for (const network of ['eip155:84532', 'eip155:8453'] as const) {
      expect(usdcForNetwork(network)).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('rejects a malformed payTo instead of silently disarming', () => {
    expect(() => parseX402Config({ ...BASE_ENV, X402_PAY_TO: '0x1234' })).toThrow();
    expect(() => parseX402Config({ ...BASE_ENV, X402_PAY_TO: 'not-an-address' })).toThrow();
  });

  it('rejects a non-positive price', () => {
    expect(() => parseX402Config({ ...BASE_ENV, X402_PRICE_USD: '0' })).toThrow();
    expect(() => parseX402Config({ ...BASE_ENV, X402_PRICE_USD: '-1' })).toThrow();
    expect(() => parseX402Config({ ...BASE_ENV, X402_PRICE_USD: 'abc' })).toThrow();
  });

  it('maps mainnet to the canonical Base USDC contract', () => {
    expect(usdcForNetwork('eip155:8453')).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  });

  describe('CDP facilitator auth', () => {
    it('defaults to no auth for the x402.org facilitator', () => {
      const cfg = parseX402Config({ ...BASE_ENV });
      expect(cfg.facilitatorCdpAuth).toBeNull();
    });

    it('parses CDP credentials when both key id and secret are set', () => {
      const cfg = parseX402Config({
        ...BASE_ENV,
        X402_FACILITATOR_URL: 'https://api.cdp.coinbase.com/platform/v2/x402',
        X402_CDP_API_KEY_ID: 'c816b095-0102-4b4e-ad90-a522a4175df5',
        X402_CDP_API_KEY_SECRET: 'test-secret',
      });
      expect(cfg.facilitatorCdpAuth).toEqual({
        apiKeyId: 'c816b095-0102-4b4e-ad90-a522a4175df5',
        apiKeySecret: 'test-secret',
      });
    });

    it('throws when only one of the two CDP variables is set', () => {
      expect(() => parseX402Config({ ...BASE_ENV, X402_CDP_API_KEY_ID: 'some-id' })).toThrow(
        /must be set together/
      );
      expect(() =>
        parseX402Config({ ...BASE_ENV, X402_CDP_API_KEY_SECRET: 'some-secret' })
      ).toThrow(/must be set together/);
    });

    it('throws when the facilitator URL is CDP but credentials are missing', () => {
      expect(() =>
        parseX402Config({
          ...BASE_ENV,
          X402_FACILITATOR_URL: 'https://api.cdp.coinbase.com/platform/v2/x402',
        })
      ).toThrow(/CDP requires authenticated/);
    });
  });
});
