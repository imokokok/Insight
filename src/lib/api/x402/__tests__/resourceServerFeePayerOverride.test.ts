import { type HTTPAdapter } from '@x402/core/server';

import { parseX402Config, SOLANA_DEVNET_CAIP2 } from '../config';
import { buildX402HttpServer, resetX402HttpServerForTests } from '../resourceServer';

const PAY_TO = 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX';
const FEE_PAYER = '11111111111111111111111111111111';
const OVERRIDE_FEE_PAYER = 'PEAxftCwr8ZcYKESZSL24zSMMScCD8sLFVauLz2uBw6';
const BLOCKHASH = '11111111111111111111111111111111';

class TestRequestAdapter implements HTTPAdapter {
  getHeader(): string | undefined {
    return undefined;
  }

  getMethod(): string {
    return 'GET';
  }

  getPath(): string {
    return '/api/v1/safety/pre-trade';
  }

  getUrl(): string {
    return 'https://oracleinsight.example/api/v1/safety/pre-trade';
  }

  getAcceptHeader(): string {
    return 'application/json';
  }

  getUserAgent(): string {
    return 'jest';
  }

  getQueryParams(): Record<string, string> {
    return {
      asset: 'ETH',
      chainId: '1',
      action: 'swap',
      tradeAmountUsd: '1000',
    };
  }
}

describe('x402 Solana fee payer override', () => {
  const originalFetch = global.fetch;
  const testGlobal = global as typeof globalThis & {
    structuredClone?: <T>(value: T) => T;
  };
  const originalStructuredClone = testGlobal.structuredClone;

  beforeEach(() => {
    resetX402HttpServerForTests();
    // Jest's jsdom environment omits Node's structuredClone, while the
    // x402 response builder uses it only to clone JSON-compatible quotes.
    testGlobal.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalStructuredClone === undefined) delete testGlobal.structuredClone;
    else testGlobal.structuredClone = originalStructuredClone;
  });

  it('overrides the facilitator-advertised fee payer when X402_SOLANA_FEE_PAYER is set', async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url !== 'https://facilitator.example/supported') {
        throw new Error(`unexpected fetch: ${url}`);
      }
      return Response.json({
        kinds: [
          {
            x402Version: 2,
            scheme: 'exact',
            network: SOLANA_DEVNET_CAIP2,
            extra: {
              feePayer: FEE_PAYER,
              recentBlockhash: BLOCKHASH,
              lastValidBlockHeight: '123',
            },
          },
        ],
        extensions: [],
        signers: {},
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_EVM_ENABLED: 'false',
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_DEVNET_CAIP2,
      X402_SOLANA_PAY_TO: PAY_TO,
      X402_SOLANA_FACILITATOR_URL: 'https://facilitator.example',
      X402_SOLANA_FEE_PAYER: OVERRIDE_FEE_PAYER,
    });
    const server = await buildX402HttpServer(cfg);
    const result = await server.processHTTPRequest({
      adapter: new TestRequestAdapter(),
      path: '/api/v1/safety/pre-trade',
      method: 'GET',
    });

    expect(result.type).toBe('payment-error');
    if (result.type !== 'payment-error') throw new Error('expected a payment quote');
    const quote = JSON.parse(
      Buffer.from(result.response.headers['PAYMENT-REQUIRED'] ?? '', 'base64url').toString('utf8')
    ) as { accepts: Array<{ network: string; extra?: Record<string, string> }> };
    const solana = quote.accepts.find((entry) => entry.network === SOLANA_DEVNET_CAIP2);

    expect(solana?.extra).toMatchObject({
      feePayer: OVERRIDE_FEE_PAYER,
      recentBlockhash: BLOCKHASH,
      lastValidBlockHeight: '123',
    });
  });

  it('rejects an invalid X402_SOLANA_FEE_PAYER value', () => {
    expect(() =>
      parseX402Config({
        X402_ENABLED: 'true',
        X402_EVM_ENABLED: 'false',
        X402_SOLANA_ENABLED: 'true',
        X402_SOLANA_PAY_TO: PAY_TO,
        X402_SOLANA_FEE_PAYER: 'not-a-base58-key!!',
      })
    ).toThrow(/X402_SOLANA_FEE_PAYER/);
  });
});
