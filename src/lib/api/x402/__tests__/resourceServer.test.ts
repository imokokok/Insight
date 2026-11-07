import { type HTTPAdapter } from '@x402/core/server';

import mcpToolCatalog from '@/mcp/tools/generatedCatalog.json';

import {
  X402_REST_PAYMENT_SCOPE_BY_PATH,
  x402ConfigForPaymentScope,
  X402_PAYMENT_SCOPE,
} from '../capabilityPayment';
import {
  getX402PaymentOptions,
  parseX402Config,
  SOLANA_DEVNET_CAIP2,
  X402_BASE_LENDING_GUARD_ROUTE,
  X402_BASE_PERP_GUARD_ROUTE,
  X402_BNB_PERP_GUARD_ROUTE,
  X402_EXECUTION_PREFLIGHT_ROUTE,
  X402_HYPERLIQUID_PERP_GUARD_ROUTE,
  X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE,
  X402_MONAD_LENDING_GUARD_ROUTE,
  X402_MONAD_PERP_GUARD_ROUTE,
  X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE,
  X402_PAID_REST_ROUTE_PATHS,
  X402_ORACLE_WATCH_WINDOW_ROUTE,
  X402_POSITION_LIFECYCLE_ROUTE,
  X402_PRE_TRADE_ROUTE,
  X402_PREDICTION_GUARD_ROUTE,
  X402_SETTLEMENT_EVIDENCE_GRADE_ROUTE,
  X402_ORACLE_CONFIG_SNAPSHOT_ROUTE,
  X402_SOLANA_LENDING_GUARD_ROUTE,
  X402_SOLANA_PERP_GUARD_ROUTE,
  X402_SOLANA_SWAP_GUARD_ROUTE,
  X402_SWAP_INTENT_ROUTE,
} from '../config';
import { resetFacilitatorResilienceForTests } from '../facilitatorResilience';
import {
  BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME,
  BAZAAR_SERVICE_METADATA,
  bazaarMcpDiscoveryExtensionFor,
  buildX402HttpServer,
  MCP_INDEXER_QUOTE_TOOL,
  resetX402HttpServerForTests,
} from '../resourceServer';

const PAY_TO = 'seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX';
const FEE_PAYER = '11111111111111111111111111111111';
const REFRESHED_FEE_PAYER = 'PEAxftCwr8ZcYKESZSL24zSMMScCD8sLFVauLz2uBw6';
const BLOCKHASH = '11111111111111111111111111111111';
const REFRESHED_BLOCKHASH = 'PEAxftCwr8ZcYKESZSL24zSMMScCD8sLFVauLz2uBw6';
const PAYAI_FACILITATOR_URL = 'https://facilitator.payai.network';
const UVD_FACILITATOR_URL = 'https://facilitator.ultravioletadao.xyz';
const EVM_PAY_TO = '0xAbC0000000000000000000000000000000000001';

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

class McpTestRequestAdapter implements HTTPAdapter {
  getHeader(): string | undefined {
    return undefined;
  }

  getMethod(): string {
    return 'POST';
  }

  getPath(): string {
    return '/api/mcp';
  }

  getUrl(): string {
    return 'https://oracleinsight.example/api/mcp';
  }

  getAcceptHeader(): string {
    return 'application/json';
  }

  getUserAgent(): string {
    return 'jest';
  }

  getQueryParams(): Record<string, string> {
    return {};
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

  it('builds a HyperEVM quote only after UVD advertises x402 v2 exact support', async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === `${UVD_FACILITATOR_URL}/supported`) {
        return Response.json({
          kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:999' }],
          extensions: [],
          signers: {},
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_PAY_TO: EVM_PAY_TO,
      X402_EVM_NETWORKS: 'eip155:999',
      X402_FACILITATOR_URLS: `eip155:999=${UVD_FACILITATOR_URL}`,
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
    ) as { accepts: Array<Record<string, unknown>> };
    expect(quote.accepts.find((entry) => entry.network === 'eip155:999')).toMatchObject({
      amount: '20000',
      asset: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
      network: 'eip155:999',
      payTo: EVM_PAY_TO,
      scheme: 'exact',
      extra: { name: 'USDC', version: '2' },
    });
  });

  it('returns a real 402 quote for every registered REST route (no no-route regressions)', async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      if (String(input) !== 'https://facilitator.example/supported') {
        throw new Error(`unexpected fetch: ${String(input)}`);
      }
      return Response.json({
        kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }],
        extensions: [],
        signers: {},
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_EVM_NETWORKS: 'eip155:8453',
      X402_PAY_TO: EVM_PAY_TO,
      X402_FACILITATOR_URL: 'https://facilitator.example',
    });
    const server = await buildX402HttpServer(cfg);

    // (path, method, expected amount in atomic units) for every paid REST
    // surface a keyless agent can hit. A route missing from the resource-server
    // map would return the defensive no-quote 402 instead of a real quote.
    // The completeness assertion below keeps this list in sync with
    // X402_REST_PAYMENT_SCOPE_BY_PATH so a new scope-mapped route cannot ship
    // unregistered again (that regression shipped once: #400's two guards).
    const routes = [
      { path: X402_PRE_TRADE_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_EXECUTION_PREFLIGHT_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_BASE_LENDING_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_BASE_PERP_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_HYPERLIQUID_PERP_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_MONAD_LENDING_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_MONAD_PERP_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_SOLANA_LENDING_GUARD_ROUTE, method: 'POST', amount: '20000' },
      { path: X402_SOLANA_SWAP_GUARD_ROUTE, method: 'POST', amount: '20000' },
      { path: X402_SOLANA_PERP_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_BNB_PERP_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_PREDICTION_GUARD_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_SETTLEMENT_EVIDENCE_GRADE_ROUTE, method: 'POST', amount: '20000' },
      { path: X402_ORACLE_CONFIG_SNAPSHOT_ROUTE, method: 'POST', amount: '500000' },
      { path: X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE, method: 'POST', amount: '20000' },
      { path: X402_SWAP_INTENT_ROUTE, method: 'GET', amount: '20000' },
      { path: X402_ORACLE_WATCH_WINDOW_ROUTE, method: 'POST', amount: '500000' },
      { path: X402_POSITION_LIFECYCLE_ROUTE, method: 'POST', amount: '550000' },
    ];

    // Every chain-scoped route registered in the payment-scope map must have a
    // paid quote in the resource-server route map.
    const listedPaths = new Set(routes.map((route) => route.path));
    for (const scopePath of Object.keys(X402_REST_PAYMENT_SCOPE_BY_PATH)) {
      expect(listedPaths).toContain(scopePath);
    }

    // The quote-verified surface must equal the canonical paid REST route
    // list in config.ts in both directions. buildX402HttpServer already
    // refuses to boot on drift; this keeps the hand-written quote table
    // (methods + expected amounts) from silently lagging that list.
    expect(listedPaths).toEqual(new Set<string>(X402_PAID_REST_ROUTE_PATHS));

    for (const route of routes) {
      const result = await server.processHTTPRequest({
        adapter: new TestRequestAdapter(),
        path: route.path,
        method: route.method,
      });
      expect(result.type).toBe('payment-error');
      if (result.type !== 'payment-error') throw new Error(`expected a quote for ${route.path}`);
      const quote = JSON.parse(
        Buffer.from(result.response.headers['PAYMENT-REQUIRED'] ?? '', 'base64url').toString('utf8')
      ) as { accepts: Array<Record<string, unknown>> };
      expect(quote.accepts.length).toBeGreaterThan(0);
      expect(quote.accepts[0]).toMatchObject({ network: 'eip155:8453', amount: route.amount });
    }
  });

  it('puts the Base Swap Guard Bazaar tool contract in its paid MCP quote', async () => {
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      if (String(input) !== 'https://facilitator.example/supported') {
        throw new Error(`unexpected fetch: ${String(input)}`);
      }
      return Response.json({
        kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }],
        extensions: [],
        signers: {},
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_NETWORK: 'eip155:999',
      X402_EVM_NETWORKS: 'eip155:999',
      X402_PAY_TO: EVM_PAY_TO,
      X402_FACILITATOR_URL: 'https://facilitator.example',
    });
    const baseConfig = x402ConfigForPaymentScope(cfg, X402_PAYMENT_SCOPE.base);
    if (!baseConfig) throw new Error('expected Base payment scope to be enabled');
    const server = await buildX402HttpServer(baseConfig, undefined, {
      mcpAmountAtomic: '20000',
      mcpDiscoveryToolName: BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME,
    });
    const result = await server.processHTTPRequest({
      adapter: new McpTestRequestAdapter(),
      path: '/api/mcp',
      method: 'POST',
    });

    expect(result.type).toBe('payment-error');
    if (result.type !== 'payment-error') throw new Error('expected a payment quote');
    const quote = JSON.parse(
      Buffer.from(result.response.headers['PAYMENT-REQUIRED'] ?? '', 'base64url').toString('utf8')
    ) as {
      accepts: Array<Record<string, unknown>>;
      resource?: { description?: string };
      extensions?: { bazaar?: { info?: { input?: Record<string, unknown> } } };
    };

    expect(quote.accepts).toEqual([
      expect.objectContaining({
        amount: '20000',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        network: 'eip155:8453',
        payTo: EVM_PAY_TO,
        scheme: 'exact',
        extra: { name: 'USD Coin', version: '2' },
      }),
    ]);
    expect(quote.resource?.description).toContain(
      'AI-agent Swap Guard (Base mainnet and BNB Smart Chain)'
    );
    expect(quote.extensions?.bazaar?.info?.input).toMatchObject({
      type: 'mcp',
      toolName: BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME,
      transport: 'streamable-http',
    });
  });

  describe('per-tool MCP discovery declarations', () => {
    const catalog = mcpToolCatalog as Array<{ name: string }>;

    function declaredToolName(toolName: string): string {
      const extension = bazaarMcpDiscoveryExtensionFor(toolName);
      const bazaar = extension.bazaar as unknown as {
        info: { input: { toolName: string } };
      };
      return bazaar.info.input.toolName;
    }

    it('declares exactly the 16 catalog tools, each once and none legacy', () => {
      expect(catalog).toHaveLength(16);
      const declared = catalog.map((tool) => declaredToolName(tool.name));
      expect(new Set(declared).size).toBe(16);
      expect(new Set(declared)).toEqual(new Set(catalog.map((tool) => tool.name)));
      expect(declared).not.toContain('pre_trade_safety_check');
      expect(declared).not.toContain('prepare_base_agent_swap_guard');
    });

    it('names a real catalog tool for a bare GET indexer quote', () => {
      expect(catalog.some((tool) => tool.name === MCP_INDEXER_QUOTE_TOOL)).toBe(true);
      expect(declaredToolName(MCP_INDEXER_QUOTE_TOOL)).toBe(MCP_INDEXER_QUOTE_TOOL);
    });
  });

  it('registers the scheme for every advertised amount when a floor excludes the default price', async () => {
    // Regression for the `X402_NETWORK_MIN_AMOUNT=eip155:999=10000` outage:
    // the default route amount (2000 micro-USDC) is below the floor, while the
    // MCP tool price (20000) is above it. Registering schemes from the default
    // amount alone left eip155:999 unregistered and the SDK threw
    // `RouteConfigurationError: No scheme implementation registered for exact`.
    const fetchMock = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url !== 'https://facilitator.example/supported') {
        throw new Error(`unexpected fetch: ${url}`);
      }
      return Response.json({
        kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:999' }],
        extensions: [],
        signers: {},
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const cfg = parseX402Config({
      X402_ENABLED: 'true',
      X402_PAY_TO: EVM_PAY_TO,
      X402_PRICE_USD: '0.002',
      X402_EVM_NETWORKS: 'eip155:999',
      X402_FACILITATOR_URL: 'https://facilitator.example',
      X402_NETWORK_MIN_AMOUNT: 'eip155:999=10000',
    });
    expect(getX402PaymentOptions(cfg)).toEqual([]);

    const server = await buildX402HttpServer(cfg, undefined, { mcpAmountAtomic: '20000' });
    const result = await server.processHTTPRequest({
      adapter: new McpTestRequestAdapter(),
      path: '/api/mcp',
      method: 'POST',
    });

    expect(result.type).toBe('payment-error');
    if (result.type !== 'payment-error') throw new Error('expected a payment quote');
    const quote = JSON.parse(
      Buffer.from(result.response.headers['PAYMENT-REQUIRED'] ?? '', 'base64url').toString('utf8')
    ) as { accepts: Array<Record<string, unknown>> };
    expect(quote.accepts).toEqual([
      expect.objectContaining({ network: 'eip155:999', amount: '20000', scheme: 'exact' }),
    ]);
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
