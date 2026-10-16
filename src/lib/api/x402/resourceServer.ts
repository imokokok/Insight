import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { ExactSvmScheme } from '@x402/svm/exact/server';

import { createCdpAuthHeaders } from './cdpAuth';
import {
  type X402Config,
  type X402NetworkId,
  X402_MCP_ROUTE,
  X402_PRE_TRADE_ROUTE,
  getX402PaymentOptions,
} from './config';

/**
 * Lazily-built singleton around the official x402 Foundation v2 server stack
 * (`@x402/core/server` plus the configured EVM and SVM exact schemes), wired
 * to the pre-trade and MCP routes.
 *
 * `initialize()` performs a facilitator `getSupported()` round-trip; the
 * singleton keeps that cost off the request path.
 */

let cached: x402HTTPResourceServer | null = null;
let cachedKey = '';

/**
 * Bazaar discovery metadata (Agentic.Market / CDP indexing). Declared once and
 * embedded in every 402 quote so facilitators can catalog the endpoint after
 * the first settled payment. The input example mirrors the required query
 * params of `PreTradeQuerySchema`; the output example mirrors the top-level
 * fields of `PreTradeSafetyResult` that a paid caller actually consumes.
 * Exported for tests.
 */
export const BAZAAR_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  // No `method` here: the config type omits it and the registered
  // bazaarResourceServerExtension injects GET from each request context.
  input: {
    asset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
  },
  inputSchema: {
    type: 'object',
    properties: {
      asset: { type: 'string', description: 'Asset symbol, e.g. ETH, BTC, USDC' },
      chainId: { type: 'number', description: 'Chain ID, e.g. 1=Ethereum, 0=chain-agnostic' },
      action: {
        type: 'string',
        enum: ['swap', 'borrow', 'lend', 'liquidate', 'repay'],
        description: 'Type of DeFi operation',
      },
      tradeAmountUsd: { type: 'number', description: 'Trade size in USD' },
      targetProviders: {
        type: 'string',
        description: 'Comma-separated list of oracle providers to restrict the check to',
      },
      protocolId: {
        type: 'string',
        description: 'Optional lending protocol id to evaluate against (e.g. aave-v3-ethereum)',
      },
      schemaVersion: {
        type: 'number',
        enum: [1, 2, 3],
        description:
          'Attestation schema version: 1 (default, 11-field), 2 (26-field, CAIP-19 + quorum gate), ' +
          'or 3 (27-field: v2 + the signed independence threshold, so the gate is self-verifying)',
      },
      destinationAsset: {
        type: 'string',
        description: 'Optional destination asset symbol (v2 binds it as destinationAssetId)',
      },
    },
    required: ['asset', 'chainId', 'action', 'tradeAmountUsd'],
  },
  output: {
    example: {
      verdict: 'PASS',
      consensusPrice: 3124.5,
      maxDeviationPct: 0.42,
      manipulationRiskScore: 0.08,
      crossProviderAgreement: 0.998,
      recommendedMaxPositionUsd: 95000,
      staleDataRisk: false,
      participantCount: 5,
    },
  },
});

function acceptsFor(cfg: X402Config, amountOverride?: string) {
  return getX402PaymentOptions(cfg, amountOverride).map((option) => ({
    scheme: 'exact',
    network: option.network,
    payTo: option.payTo,
    // Use a deterministic atomic amount; the accepted mint is network-specific.
    price: { asset: option.asset, amount: option.amountAtomic },
    maxTimeoutSeconds: cfg.maxTimeoutSeconds,
    // EIP-712 metadata only applies to the EVM transferWithAuthorization flow.
    ...(option.family === 'evm' && option.tokenName
      ? { extra: { name: option.tokenName, version: '2' } }
      : {}),
  }));
}

function routeConfigFor(cfg: X402Config) {
  return {
    description:
      'Pre-trade safety check: oracle-immune-system verdict for one trade, with verifiable EIP-712 attestation support. BLOCK verdicts are complete checks and are charged.',
    mimeType: 'application/json',
    accepts: acceptsFor(cfg),
    extensions: BAZAAR_DISCOVERY_EXTENSION,
    x402Version: 2,
  };
}

/**
 * Bazaar discovery metadata for the MCP endpoint. The resource is a JSON-RPC
 * POST, so the input example is a `tools/call` invocation rather than query
 * params. Exported for tests.
 */
export const BAZAAR_MCP_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  input: {
    name: 'pre_trade_safety_check',
    arguments: {
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 1000,
    },
  },
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'MCP tool name, e.g. pre_trade_safety_check' },
      arguments: { type: 'object', description: 'Tool arguments object' },
    },
    required: ['name'],
  },
  output: {
    example: {
      content: [
        {
          type: 'text',
          text: '{"verdict":"PASS","consensusPrice":3124.5,"maxDeviationPct":0.42}',
        },
      ],
    },
  },
});

function mcpRouteConfigFor(cfg: X402Config, amountAtomic: string) {
  return {
    description:
      'MCP tools/call over JSON-RPC (streamable HTTP): pay-per-call access to the Insight oracle tool catalog for x402 agents without an API key. Price scales with the tool metering class (C1..C4).',
    mimeType: 'application/json',
    accepts: acceptsFor(cfg, amountAtomic),
    extensions: BAZAAR_MCP_DISCOVERY_EXTENSION,
    x402Version: 2,
  };
}

export interface X402ServerDeps {
  facilitatorUrl: string;
  facilitatorTimeoutMs: number;
}

/**
 * Build (once per config) and initialize the HTTP resource server for the
 * pre-trade route. Exported for tests; production callers use
 * {@link getX402HttpServer}.
 */
/** CDP host that requires authenticated verify/settle (see cdpAuth.ts). */
const CDP_FACILITATOR_HOST = 'api.cdp.coinbase.com';

/**
 * Build one HTTP facilitator client per distinct facilitator URL needed by
 * the configured payment options. Networks inherit `cfg.facilitatorUrl`
 * unless `cfg.facilitatorUrls[network]` overrides them (e.g. Monad mainnet
 * routes to the Monad facilitator because CDP does not serve it). CDP
 * bearer-JWT auth is attached only to the client whose URL points at the CDP
 * host; third-party facilitators need none.
 */
function buildFacilitatorClients(
  cfg: X402Config,
  deps?: Partial<X402ServerDeps>
): HTTPFacilitatorClient[] {
  const timeoutMs = deps?.facilitatorTimeoutMs ?? cfg.facilitatorTimeoutMs;
  const urls = new Set<string>();
  const options = getX402PaymentOptions(cfg);
  if (deps?.facilitatorUrl) {
    // Test hook: force every network onto one facilitator.
    urls.add(deps.facilitatorUrl);
  } else if (options.length === 0) {
    urls.add(cfg.facilitatorUrl);
  } else {
    for (const option of options) {
      urls.add(cfg.facilitatorUrls?.[option.network as X402NetworkId] ?? cfg.facilitatorUrl);
    }
  }

  return [...urls].map((url) => {
    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      // Malformed URLs throw later via the facilitator client itself.
    }
    const isCdp = host === CDP_FACILITATOR_HOST;
    return new HTTPFacilitatorClient({
      url,
      timeoutMs,
      // CDP facilitator requires per-request Bearer JWTs; others need none.
      ...(isCdp && cfg.facilitatorCdpAuth
        ? { createAuthHeaders: createCdpAuthHeaders(cfg.facilitatorCdpAuth) }
        : {}),
    });
  });
}

export async function buildX402HttpServer(
  cfg: X402Config,
  deps?: Partial<X402ServerDeps>,
  options?: { mcpAmountAtomic?: string }
): Promise<x402HTTPResourceServer> {
  const facilitators = buildFacilitatorClients(cfg, deps);

  const server = new x402ResourceServer(facilitators);
  const paymentOptions = getX402PaymentOptions(cfg);
  if (paymentOptions.some((option) => option.family === 'evm')) {
    const networks = new Set(
      paymentOptions.filter((option) => option.family === 'evm').map((option) => option.network)
    );
    for (const network of networks) server.register(network, new ExactEvmScheme());
  }
  if (paymentOptions.some((option) => option.family === 'svm')) {
    const networks = new Set(
      paymentOptions.filter((option) => option.family === 'svm').map((option) => option.network)
    );
    for (const network of networks) server.register(network, new ExactSvmScheme());
  }
  // Enriches the declared discovery extension with the actual HTTP method and
  // query params from each request context before the 402 goes out.
  server.registerExtension(bazaarResourceServerExtension);

  const httpServer = new x402HTTPResourceServer(server, {
    [X402_PRE_TRADE_ROUTE]: routeConfigFor(cfg),
    [X402_MCP_ROUTE]: mcpRouteConfigFor(cfg, options?.mcpAmountAtomic ?? cfg.amountAtomic),
  });
  await httpServer.initialize();

  const unsupportedNetworks = paymentOptions
    .filter((option) => !server.getSupportedKind(2, option.network, 'exact'))
    .map((option) => option.network);
  if (unsupportedNetworks.length > 0) {
    throw new Error(
      `X402_FACILITATOR_URL does not advertise x402 v2 exact support for: ${unsupportedNetworks.join(', ')}. Check its /supported endpoint and X402_EVM_NETWORKS/X402_SOLANA_NETWORK.`
    );
  }

  return httpServer;
}

/**
 * Get the process-wide initialized HTTP resource server, rebuilding it if the
 * x402 config changed (e.g. between testnet and mainnet deploys).
 */
export async function getX402HttpServer(cfg: X402Config): Promise<x402HTTPResourceServer> {
  const key = JSON.stringify({
    options: getX402PaymentOptions(cfg),
    f: cfg.facilitatorUrl,
    u: cfg.facilitatorUrls,
    c: cfg.facilitatorCdpAuth ? 'cdp' : 'none',
  });
  if (cached && cachedKey === key) {
    return cached;
  }
  const built = await buildX402HttpServer(cfg);
  cached = built;
  cachedKey = key;
  return built;
}

/** Test-only: drop the singleton so the next call rebuilds it. */
export function resetX402HttpServerForTests(): void {
  cached = null;
  cachedKey = '';
  mcpCache.clear();
}

/**
 * Per-price MCP HTTP server cache. Tool calls are priced by metering class
 * (C1..C4 → 4 distinct USDC amounts), and each x402HTTPResourceServer bakes
 * its 402 quote amounts in at construction time — so one instance per price
 * is kept warm instead of paying a facilitator `getSupported()` round trip
 * per request.
 */
const mcpCache = new Map<string, x402HTTPResourceServer>();

/**
 * Get (or build) an initialized HTTP resource server whose `/api/mcp` route
 * quotes `amountAtomic` USDC for a tools/call. The pre-trade route on the
 * same instance always carries the default configured amount, which is
 * irrelevant to MCP callers.
 */
export async function getMcpX402HttpServer(
  cfg: X402Config,
  amountAtomic: string
): Promise<x402HTTPResourceServer> {
  const key = JSON.stringify({
    options: getX402PaymentOptions(cfg, amountAtomic),
    f: cfg.facilitatorUrl,
    u: cfg.facilitatorUrls,
    c: cfg.facilitatorCdpAuth ? 'cdp' : 'none',
  });
  const hit = mcpCache.get(key);
  if (hit) {
    return hit;
  }
  const built = await buildX402HttpServer(cfg, undefined, { mcpAmountAtomic: amountAtomic });
  mcpCache.set(key, built);
  return built;
}
