import type { X402Config } from '@/lib/api/x402/config';

import { getMppConfig } from '../config';

const X402_ENABLED: X402Config = {
  enabled: true,
  network: 'eip155:84532',
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
  facilitatorCdpAuth: null,
};

function env(values: Record<string, string>): NodeJS.ProcessEnv {
  return { NODE_ENV: 'test', ...values };
}

describe('getMppConfig', () => {
  it('keeps MPP disabled unless the feature flag is exactly true', () => {
    expect(
      getMppConfig(X402_ENABLED, env({ MPP_ENABLED: 'True', MPP_SECRET_KEY: 'x'.repeat(32) }))
    ).toEqual({
      enabled: false,
      secretKey: null,
    });
  });

  it('requires the x402 paid tier to be enabled first', () => {
    expect(() =>
      getMppConfig(
        { ...X402_ENABLED, enabled: false },
        env({ MPP_ENABLED: 'true', MPP_SECRET_KEY: 'x'.repeat(32) })
      )
    ).toThrow('MPP_ENABLED requires the x402 paid tier to be enabled');
  });

  it.each(['', 'x'.repeat(31)])('rejects an absent or short MPP secret key', (secretKey) => {
    expect(() =>
      getMppConfig(X402_ENABLED, env({ MPP_ENABLED: 'true', MPP_SECRET_KEY: secretKey }))
    ).toThrow('MPP_SECRET_KEY must contain at least 32 bytes');
  });

  it('accepts a strong secret key and trims surrounding whitespace', () => {
    const secretKey = 'x'.repeat(32);

    expect(
      getMppConfig(
        X402_ENABLED,
        env({
          MPP_ENABLED: 'true',
          MPP_SECRET_KEY: `  ${secretKey}  `,
        })
      )
    ).toEqual({ enabled: true, secretKey });
  });

  it('counts UTF-8 bytes rather than JavaScript characters', () => {
    expect(() =>
      getMppConfig(
        X402_ENABLED,
        env({
          MPP_ENABLED: 'true',
          MPP_SECRET_KEY: '密'.repeat(10),
        })
      )
    ).toThrow('MPP_SECRET_KEY must contain at least 32 bytes');
  });
});
