import { type HTTPAdapter } from '@x402/core/server';

import { parseX402Config, SOLANA_DEVNET_CAIP2 } from '../config';
import { resetFacilitatorResilienceForTests } from '../facilitatorResilience';
import {
  BAZAAR_SERVICE_METADATA,
  buildX402HttpServer,
  resetX402HttpServerForTests,
} from '../resourceServer';

const PAY_TO = 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX';
const FEE_PAYER = '11111111111111111111111111111111';
const REFRESHED_FEE_PAYER = 'PEAxftCwr8ZcYKESZSL24zSMMScCD8sLFVauLz2uBw6';
const BLOCKHASH = '11111111111111111111111111111111';
const REFRESHED_BLOCKHASH = 'PEAxftCwr8ZcYKESZSL24zSMMScCD8sLFVauLz2uBw6';
const PAYAI_FACILITATOR_URL = 'https://facilitator.payai.network';

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

describe('x402 SVM resource-server registration', () => {
  const originalFetch = global.fetch;
  const testGlobal = global as typeof globalThis & {
    structuredClone?: <T>(value: T) => T;
  };
  const originalStructuredClone = testGlobal.structuredClone;

  beforeEach(() => {
    resetX402HttpServerForTests();
    resetFacilitatorResilienceForTests();
    // Jest's jsdom environment omits Node's structuredClone, while the
    // x402 response builder uses it only to clone JSON-compatible quotes.
    testGlobal.structuredClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalStructuredClone === undefined) delete testGlobal.structuredClone;
    else testGlobal.structuredClone = originalStructuredClone;
  });

  it('pins the server RPC blockhash into the Solana 402 quote', async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'https://facilitator.example/supported') {
        return Response.json({
          kinds: [
            {
              x402Version: 2,
              scheme: 'exact',
              network: SOLANA_DEVNET_CAIP2,
              extra: { feePayer: FEE_PAYER },
            },
          ],
          extensions: [],
          signers: {},
        });
      }
      if (url === 'https://rpc.example/solana') {
        return Response.json({
          jsonrpc: '2.0',
          id: '1',
          result: {
            context: { slot: 1 },
            value: { blockhash: BLOCKHASH, lastValidBlockHeight: 123 },
          },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_EVM_ENABLED: 'false',
      X402_SOLANA_ENABLED: 'true',
      X402_SOLANA_NETWORK: SOLANA_DEVNET_CAIP2,
      X402_SOLANA_PAY_TO: PAY_TO,
      X402_SOLANA_RPC_URL: 'https://rpc.example/solana',
      X402_SOLANA_FACILITATOR_URL: 'https://facilitator.example',
    });
    const server = await buildX402HttpServer(cfg);
    const result = await server.processHTTPRequest({
      adapter: new TestRequestAdapter(),
      path: '/api/v1/safety/pre-trade',
      method: 'GET',
    });

    expect(result.type).toBe('payment-error');
    if (result.type !== 'payment-error') throw new Error('expected a payment quote');

    const encoded = result.response.headers['PAYMENT-REQUIRED'];
    expect(encoded).toBeDefined();
    const quote = JSON.parse(Buffer.from(encoded ?? '', 'base64url').toString('utf8')) as {
      accepts: Array<{ network: string; extra?: Record<string, string> }>;
      resource?: Record<string, unknown>;
    };
    const solana = quote.accepts.find((entry) => entry.network === SOLANA_DEVNET_CAIP2);

    expect(solana?.extra).toMatchObject({
      feePayer: FEE_PAYER,
      recentBlockhash: BLOCKHASH,
      lastValidBlockHeight: '123',
    });
    expect(quote.resource).toMatchObject(BAZAAR_SERVICE_METADATA);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://rpc.example/solana',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('refreshes a facilitator-advertised blockhash for every Solana quote', async () => {
    let supportedCalls = 0;
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url !== 'https://facilitator.example/supported') {
        throw new Error(`unexpected fetch: ${url}`);
      }
      supportedCalls += 1;
      return Response.json({
        kinds: [
          {
            x402Version: 2,
            scheme: 'exact',
            network: SOLANA_DEVNET_CAIP2,
            extra: {
              feePayer: supportedCalls === 1 ? FEE_PAYER : REFRESHED_FEE_PAYER,
              recentBlockhash: supportedCalls === 1 ? BLOCKHASH : REFRESHED_BLOCKHASH,
              lastValidBlockHeight: supportedCalls === 1 ? '123' : '456',
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

    expect(supportedCalls).toBe(2);
    expect(solana?.extra).toMatchObject({
      feePayer: REFRESHED_FEE_PAYER,
      recentBlockhash: REFRESHED_BLOCKHASH,
      lastValidBlockHeight: '456',
    });
  });

  it('refreshes a PayAI hint when the initial SVM kind retains only its fee payer', async () => {
    let supportedCalls = 0;
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url !== `${PAYAI_FACILITATOR_URL}/supported`) {
        throw new Error(`unexpected fetch: ${url}`);
      }
      supportedCalls += 1;
      return Response.json({
        kinds: [
          {
            x402Version: 2,
            scheme: 'exact',
            network: SOLANA_DEVNET_CAIP2,
            extra:
              supportedCalls === 1
                ? { feePayer: FEE_PAYER }
                : {
                    feePayer: REFRESHED_FEE_PAYER,
                    recentBlockhash: REFRESHED_BLOCKHASH,
                    lastValidBlockHeight: '456',
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
      X402_SOLANA_FACILITATOR_URL: PAYAI_FACILITATOR_URL,
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

    expect(supportedCalls).toBe(2);
    expect(solana?.extra).toMatchObject({
      feePayer: REFRESHED_FEE_PAYER,
      recentBlockhash: REFRESHED_BLOCKHASH,
      lastValidBlockHeight: '456',
    });
  });
});
