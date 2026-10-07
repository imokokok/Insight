import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';

import { createCdpAuthHeaders } from './cdpAuth';
import {
  type X402Config,
  X402_MCP_ROUTE,
  X402_PRE_TRADE_ROUTE,
  tokenNameForNetwork,
  usdcForNetwork,
} from './config';

/**
 * Lazily-built singleton around the official x402 Foundation v2 server stack
 * (`@x402/core/server` + `@x402/evm/exact/server`), wired to the pre-trade
 * route. The packages are already in the dependency tree (the Headless Oracle
 * client uses their client-side counterparts), so no new install is required.
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

function acceptsFor(cfg: X402Config, amountAtomic: string) {
  return [
    {
      scheme: 'exact',
      network: cfg.network,
      payTo: cfg.payTo,
      // Deterministic AssetAmount instead of a "$x.yy" money string: no
      // server-side USD→asset resolution, the wire amount is fixed here.
      price: { asset: usdcForNetwork(cfg.network), amount: amountAtomic },
      maxTimeoutSeconds: cfg.maxTimeoutSeconds,
      // EIP-712 domain name must match the token contract exactly, and it
      // DIFFERS per network: Base mainnet USDC's domain name is "USD Coin",
      // Base Sepolia's is "USDC" (both version "2"). A wrong name makes the
      // facilitator reject with invalid_exact_evm_token_name_mismatch.
      extra: { name: tokenNameForNetwork(cfg.network), version: '2' },
    },
  ];
}

function routeConfigFor(cfg: X402Config) {
  return {
    description:
      'Pre-trade safety check: oracle-immune-system verdict for one trade, with verifiable EIP-712 attestation support. BLOCK verdicts are complete checks and are charged.',
    mimeType: 'application/json',
    accepts: acceptsFor(cfg, cfg.amountAtomic),
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
export async function buildX402HttpServer(
  cfg: X402Config,
  deps?: Partial<X402ServerDeps>,
  options?: { mcpAmountAtomic?: string }
): Promise<x402HTTPResourceServer> {
  const cdpAuth = cfg.facilitatorCdpAuth;
  const facilitator = new HTTPFacilitatorClient({
    url: deps?.facilitatorUrl ?? cfg.facilitatorUrl,
    timeoutMs: deps?.facilitatorTimeoutMs ?? cfg.facilitatorTimeoutMs,
    // CDP facilitator requires per-request Bearer JWTs; x402.org needs none.
    ...(cdpAuth ? { createAuthHeaders: createCdpAuthHeaders(cdpAuth) } : {}),
  });

  const server = new x402ResourceServer(facilitator);
  server.register(cfg.network, new ExactEvmScheme());
  // Enriches the declared discovery extension with the actual HTTP method and
  // query params from each request context before the 402 goes out.
  server.registerExtension(bazaarResourceServerExtension);

  const httpServer = new x402HTTPResourceServer(server, {
    [X402_PRE_TRADE_ROUTE]: routeConfigFor(cfg),
    [X402_MCP_ROUTE]: mcpRouteConfigFor(cfg, options?.mcpAmountAtomic ?? cfg.amountAtomic),
  });
  await httpServer.initialize();
  return httpServer;
}

/**
 * Get the process-wide initialized HTTP resource server, rebuilding it if the
 * x402 config changed (e.g. between testnet and mainnet deploys).
 */
export async function getX402HttpServer(cfg: X402Config): Promise<x402HTTPResourceServer> {
  const key = JSON.stringify({
    n: cfg.network,
    p: cfg.payTo,
    a: cfg.amountAtomic,
    f: cfg.facilitatorUrl,
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
    n: cfg.network,
    p: cfg.payTo,
    a: amountAtomic,
    f: cfg.facilitatorUrl,
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
