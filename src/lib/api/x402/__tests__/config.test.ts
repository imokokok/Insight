import {
  getX402Config,
  parseX402Config,
  SOLANA_DEVNET_CAIP2,
  SOLANA_MAINNET_CAIP2,
  eip3009TokenNameForNetwork,
  facilitatorBearerTokenForNetwork,
  facilitatorUrlForNetwork,
  getX402PaymentOptions,
  payToForEvmNetwork,
  tokenDecimalsForNetwork,
  tokenNameForNetwork,
  usdcForNetwork,
} from '../config';

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

  it('maps Monad mainnet to the Circle native USDC contract with its on-chain domain name', () => {
    expect(usdcForNetwork('eip155:143')).toBe('0x754704Bc059F8C67012fEd69BC8A327a5aafb603');
    expect(tokenNameForNetwork('eip155:143')).toBe('USDC');
  });

  it('accepts eip155:143 in X402_EVM_NETWORKS', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_EVM_NETWORKS: 'eip155:8453,eip155:143',
    });
    expect(cfg.evmNetworks).toEqual(['eip155:8453', 'eip155:143']);
    expect(getX402PaymentOptions(cfg).map((option) => option.asset)).toEqual([
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    ]);
  });

  it('uses an explicit EVM recipient per chain while retaining a default recipient', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_EVM_NETWORKS: 'eip155:8453,eip155:42161',
      X402_EVM_PAY_TOS: 'eip155:42161=0xdef0000000000000000000000000000000000002',
    });

    expect(payToForEvmNetwork(cfg, 'eip155:8453')).toBe(BASE_ENV.X402_PAY_TO);
    expect(payToForEvmNetwork(cfg, 'eip155:42161')).toBe(
      '0xdef0000000000000000000000000000000000002'
    );
    expect(getX402PaymentOptions(cfg).map((option) => option.payTo)).toEqual([
      BASE_ENV.X402_PAY_TO,
      '0xdef0000000000000000000000000000000000002',
    ]);
  });

  it('can enable EVM x402 from explicit per-chain recipients without a default recipient', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_PAY_TO: '',
      X402_EVM_NETWORKS: 'eip155:8453,eip155:42161',
      X402_EVM_PAY_TOS:
        'eip155:8453=0xabc0000000000000000000000000000000000001,eip155:42161=0xdef0000000000000000000000000000000000002',
    });

    expect(cfg.enabled).toBe(true);
    expect(cfg.evmEnabled).toBe(true);
    expect(getX402PaymentOptions(cfg).map((option) => option.payTo)).toEqual([
      '0xabc0000000000000000000000000000000000001',
      '0xdef0000000000000000000000000000000000002',
    ]);
  });

  it('rejects malformed, duplicate, and incomplete EVM recipient maps', () => {
    expect(() =>
      parseX402Config({ ...BASE_ENV, X402_EVM_PAY_TOS: 'eip155:8453=not-an-address' })
    ).toThrow();
    expect(() =>
      parseX402Config({
        ...BASE_ENV,
        X402_EVM_PAY_TOS:
          'eip155:8453=0xabc0000000000000000000000000000000000001,eip155:8453=0xdef0000000000000000000000000000000000002',
      })
    ).toThrow(/duplicate/);
    expect(() =>
      parseX402Config({
        ...BASE_ENV,
        X402_PAY_TO: '',
        X402_EVM_NETWORKS: 'eip155:8453,eip155:42161',
        X402_EVM_PAY_TOS: 'eip155:8453=0xabc0000000000000000000000000000000000001',
      })
    ).toThrow(/no recipient/);
  });

  it('maps BNB Smart Chain to the bridged USDC contract with the AEON mandate domain', () => {
    expect(usdcForNetwork('eip155:56')).toBe('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');
    expect(tokenNameForNetwork('eip155:56')).toBe('USD Coin');
    expect(tokenDecimalsForNetwork('eip155:56')).toBe(18);
    expect(() => eip3009TokenNameForNetwork('eip155:56')).toThrow(/no EIP-3009/);
  });

  it('converts the micro-USDC amount to 18-decimal atomic units for eip155:56', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_EVM_NETWORKS: 'eip155:8453,eip155:56',
    });
    const bnb = getX402PaymentOptions(cfg).find((option) => option.network === 'eip155:56');
    expect(bnb).toBeDefined();
    expect(bnb?.amountAtomic).toBe('20000000000000000'); // 0.02 USDC at 18 decimals
    expect(bnb?.tokenName).toBe('USD Coin');
    const base = getX402PaymentOptions(cfg).find((option) => option.network === 'eip155:8453');
    expect(base?.amountAtomic).toBe('20000'); // unchanged 6-decimal grid
  });

  it('scales MCP credit overrides onto the 18-decimal grid for eip155:56', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_EVM_NETWORKS: 'eip155:8453,eip155:56',
    });
    // 1 credit = $0.004 → 4000 micro-units canonical.
    const bnb = getX402PaymentOptions(cfg, '4000').find((option) => option.network === 'eip155:56');
    expect(bnb?.amountAtomic).toBe('4000000000000000');
  });

  it('defaults X402_BNB_ASSETS to usdc only', () => {
    const cfg = parseX402Config({ ...BASE_ENV });
    expect(cfg.bnbAssets).toEqual(['usdc']);
  });

  it('emits a BNB USDT option only when X402_BNB_ASSETS opts in', () => {
    const base = parseX402Config({ ...BASE_ENV, X402_EVM_NETWORKS: 'eip155:56' });
    const baseOptions = getX402PaymentOptions(base).filter(
      (option) => option.network === 'eip155:56'
    );
    expect(baseOptions).toHaveLength(1);
    expect(baseOptions[0]?.asset).toBe('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');

    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_EVM_NETWORKS: 'eip155:56',
      X402_BNB_ASSETS: 'usdc,usdt',
    });
    expect(cfg.bnbAssets).toEqual(['usdc', 'usdt']);
    const bnb = getX402PaymentOptions(cfg).filter((option) => option.network === 'eip155:56');
    expect(bnb).toHaveLength(2);
    expect(bnb[0]?.asset).toBe('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');
    expect(bnb[0]?.tokenName).toBe('USD Coin');
    expect(bnb[1]?.asset).toBe('0x55d398326f99059fF775485246999027B3197955');
    expect(bnb[1]?.tokenName).toBe('Tether USD');
    // Both Binance-Peg tokens share the 18-decimal grid and pay-to.
    expect(bnb[1]?.amountAtomic).toBe(bnb[0]?.amountAtomic);
    expect(bnb[1]?.payTo).toBe(bnb[0]?.payTo);
  });

  it('rejects unknown X402_BNB_ASSETS entries and keeps usdc first', () => {
    expect(() => parseX402Config({ ...BASE_ENV, X402_BNB_ASSETS: 'usdt,usdc' })).not.toThrow();
    const cfg = parseX402Config({ ...BASE_ENV, X402_BNB_ASSETS: 'usdt,usdc' });
    expect(cfg.bnbAssets).toEqual(['usdc', 'usdt']);
    expect(() => parseX402Config({ ...BASE_ENV, X402_BNB_ASSETS: 'usd1' })).toThrow(
      /unsupported assets/
    );
    expect(() => parseX402Config({ ...BASE_ENV, X402_BNB_ASSETS: 'usdt,,usdc' })).toThrow(
      /without empty entries/
    );
  });

  describe('per-network facilitator URLs', () => {
    it('defaults to an empty override map', () => {
      const cfg = parseX402Config({ ...BASE_ENV });
      expect(cfg.facilitatorUrls).toEqual({});
    });

    it('parses network=url pairs', () => {
      const cfg = parseX402Config({
        ...BASE_ENV,
        X402_FACILITATOR_URLS: 'eip155:143=https://x402-facilitator.molandak.org',
      });
      expect(cfg.facilitatorUrls).toEqual({
        'eip155:143': 'https://x402-facilitator.molandak.org',
      });
    });

    it('defaults Solana mainnet to PayAI even when a legacy generic map exists', () => {
      const cfg = parseX402Config({
        ...BASE_ENV,
        X402_SOLANA_ENABLED: 'true',
        X402_SOLANA_NETWORK: SOLANA_MAINNET_CAIP2,
        X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
        X402_FACILITATOR_URLS: `${SOLANA_MAINNET_CAIP2}=https://solana.example.com`,
      });
      expect(facilitatorUrlForNetwork(cfg, 'eip155:84532')).toBe('https://x402.org/facilitator');
      expect(facilitatorUrlForNetwork(cfg, SOLANA_MAINNET_CAIP2)).toBe(
        'https://facilitator.payai.network'
      );
    });

    it('allows an explicit dedicated Solana facilitator to override the PayAI default', () => {
      const cfg = parseX402Config({
        ...BASE_ENV,
        X402_SOLANA_ENABLED: 'true',
        X402_SOLANA_NETWORK: SOLANA_MAINNET_CAIP2,
        X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
        X402_FACILITATOR_URLS: `${SOLANA_MAINNET_CAIP2}=https://legacy.example.com`,
        X402_SOLANA_FACILITATOR_URL: 'https://solana.example.com',
      });

      expect(facilitatorUrlForNetwork(cfg, SOLANA_MAINNET_CAIP2)).toBe(
        'https://solana.example.com'
      );
    });

    it('rejects a non-HTTPS dedicated Solana facilitator', () => {
      expect(() =>
        parseX402Config({ ...BASE_ENV, X402_SOLANA_FACILITATOR_URL: 'http://solana.example.com' })
      ).toThrow(/X402_SOLANA_FACILITATOR_URL/);
    });

    it('parses an opaque per-network Bearer token without losing base64 padding', () => {
      const cfg = parseX402Config({
        ...BASE_ENV,
        X402_SOLANA_ENABLED: 'true',
        X402_SOLANA_NETWORK: SOLANA_MAINNET_CAIP2,
        X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
        X402_FACILITATOR_URLS: `${SOLANA_MAINNET_CAIP2}=https://solana.example.com`,
        X402_FACILITATOR_BEARER_TOKENS: `${SOLANA_MAINNET_CAIP2}=unit-test-token==`,
      });

      expect(facilitatorBearerTokenForNetwork(cfg, SOLANA_MAINNET_CAIP2)).toBe('unit-test-token==');
    });

    it('rejects malformed, non-https, unknown-network, and duplicate entries', () => {
      const env = { ...BASE_ENV };
      expect(() => parseX402Config({ ...env, X402_FACILITATOR_URLS: 'no-equals-sign' })).toThrow(
        /network=url/
      );
      expect(() =>
        parseX402Config({
          ...env,
          X402_FACILITATOR_URLS: 'eip155:143=http://x402-facilitator.molandak.org',
        })
      ).toThrow(/valid https URL/);
      expect(() =>
        parseX402Config({ ...env, X402_FACILITATOR_URLS: 'eip155:999=https://x.example.com' })
      ).toThrow();
      expect(() =>
        parseX402Config({
          ...env,
          X402_FACILITATOR_URLS:
            'eip155:143=https://a.example.com,eip155:143=https://b.example.com',
        })
      ).toThrow(/duplicate/);
    });
  });

  it('enables Solana Devnet x402 without requiring an EVM recipient', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_PAY_TO: '',
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_DEVNET_CAIP2,
      X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
    });

    expect(cfg.enabled).toBe(true);
    expect(cfg.evmEnabled).toBe(false);
    expect(cfg.solana).toEqual({
      network: SOLANA_DEVNET_CAIP2,
      payTo: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
      usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amountAtomic: '20000',
      priceUsd: 0.02,
    });
  });

  it('can keep a configured EVM recipient inactive while enabling Solana', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_EVM_ENABLED: 'false',
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_DEVNET_CAIP2,
      X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
    });

    expect(cfg.enabled).toBe(true);
    expect(cfg.evmEnabled).toBe(false);
    expect(cfg.payTo).toBe('0xAbC0000000000000000000000000000000000001');
    expect(getX402PaymentOptions(cfg).map((option) => option.family)).toEqual(['svm']);
  });

  it('keeps EVM and Solana payment options independent', () => {
    const cfg = parseX402Config({
      ...BASE_ENV,
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_MAINNET_CAIP2,
      X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
      X402_SOLANA_PRICE_USD: '0.03',
    });

    expect(cfg.enabled).toBe(true);
    expect(cfg.evmEnabled).toBe(true);
    expect(cfg.solana?.network).toBe(SOLANA_MAINNET_CAIP2);
    expect(cfg.solana?.usdcMint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(cfg.solana?.amountAtomic).toBe('30000');
    expect(cfg.amountAtomic).toBe('20000');
    expect(getX402PaymentOptions(cfg)).toEqual([
      {
        family: 'evm',
        network: 'eip155:84532',
        payTo: '0xAbC0000000000000000000000000000000000001',
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        amountAtomic: '20000',
        tokenName: 'USDC',
      },
      {
        family: 'svm',
        network: SOLANA_MAINNET_CAIP2,
        payTo: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amountAtomic: '30000',
      },
    ]);
  });

  it('requires a valid Solana receiving wallet when the Solana option is enabled', () => {
    expect(() =>
      parseX402Config({ ...BASE_ENV, X402_SOLANA_ENABLED: 'true', X402_SOLANA_PAY_TO: '' })
    ).toThrow(/requires X402_SOLANA_PAY_TO/);
    expect(() =>
      parseX402Config({ ...BASE_ENV, X402_SOLANA_ENABLED: 'true', X402_SOLANA_PAY_TO: '0x1234' })
    ).toThrow(/valid 32-byte Solana public key/);
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

    it('requires CDP credentials when any per-network facilitator uses CDP', () => {
      expect(() =>
        parseX402Config({
          ...BASE_ENV,
          X402_FACILITATOR_URLS: 'eip155:143=https://api.cdp.coinbase.com/platform/v2/x402',
        })
      ).toThrow(/CDP requires authenticated/);
    });
  });

  describe('static facilitator Bearer auth', () => {
    const SOLANA_ENV = {
      ...BASE_ENV,
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_MAINNET_CAIP2,
      X402_SOLANA_PAY_TO: 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX',
      X402_FACILITATOR_URLS: `${SOLANA_MAINNET_CAIP2}=https://facilitator.daydreams.systems`,
    };

    it('ignores a legacy generic Daydreams Solana mapping in favor of PayAI', () => {
      const cfg = parseX402Config(SOLANA_ENV);
      expect(facilitatorUrlForNetwork(cfg, SOLANA_MAINNET_CAIP2)).toBe(
        'https://facilitator.payai.network'
      );
    });

    it('requires and accepts a server-only credential for an explicit Daydreams override', () => {
      expect(() =>
        parseX402Config({
          ...SOLANA_ENV,
          X402_SOLANA_FACILITATOR_URL: 'https://facilitator.daydreams.systems',
        })
      ).toThrow(/Daydreams facilitator/);

      const cfg = parseX402Config({
        ...SOLANA_ENV,
        X402_SOLANA_FACILITATOR_URL: 'https://facilitator.daydreams.systems',
        X402_FACILITATOR_BEARER_TOKENS: `${SOLANA_MAINNET_CAIP2}=daydreams-unit-token`,
      });

      expect(facilitatorBearerTokenForNetwork(cfg, SOLANA_MAINNET_CAIP2)).toBe(
        'daydreams-unit-token'
      );
    });

    it('rejects malformed static credentials before they can reach an HTTP header', () => {
      expect(() =>
        parseX402Config({
          ...BASE_ENV,
          X402_FACILITATOR_BEARER_TOKEN: 'Bearer token with spaces',
        })
      ).toThrow(/without whitespace/);
    });
  });
});
