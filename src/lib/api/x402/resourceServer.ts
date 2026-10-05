import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';

import { type X402Config, X402_PRE_TRADE_ROUTE, usdcForNetwork } from './config';

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

function routeConfigFor(cfg: X402Config) {
  return {
    description:
      'Pre-trade safety check: oracle-immune-system verdict for one trade, with verifiable EIP-712 attestation support. BLOCK verdicts are complete checks and are charged.',
    mimeType: 'application/json',
    accepts: [
      {
        scheme: 'exact',
        network: cfg.network,
        payTo: cfg.payTo,
        // Deterministic AssetAmount instead of a "$x.yy" money string: no
        // server-side USD→asset resolution, the wire amount is fixed here.
        price: { asset: usdcForNetwork(cfg.network), amount: cfg.amountAtomic },
        maxTimeoutSeconds: cfg.maxTimeoutSeconds,
        extra: { name: 'USDC', version: '2' },
      },
    ],
    extensions: BAZAAR_DISCOVERY_EXTENSION,
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
  deps?: Partial<X402ServerDeps>
): Promise<x402HTTPResourceServer> {
  const facilitator = new HTTPFacilitatorClient({
    url: deps?.facilitatorUrl ?? cfg.facilitatorUrl,
    timeoutMs: deps?.facilitatorTimeoutMs ?? cfg.facilitatorTimeoutMs,
  });

  const server = new x402ResourceServer(facilitator);
  server.register(cfg.network, new ExactEvmScheme());
  // Enriches the declared discovery extension with the actual HTTP method and
  // query params from each request context before the 402 goes out.
  server.registerExtension(bazaarResourceServerExtension);

  const httpServer = new x402HTTPResourceServer(server, {
    [X402_PRE_TRADE_ROUTE]: routeConfigFor(cfg),
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
}
