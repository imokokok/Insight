import {
  x402HTTPResourceServer,
  x402ResourceServer,
  type FacilitatorClient,
} from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { ExactSvmScheme } from '@x402/svm/exact/server';

import {
  facilitatorBearerTokenForNetwork,
  facilitatorUrlForNetwork,
  type X402Config,
  X402_BASE_LENDING_GUARD_ROUTE,
  X402_MONAD_LENDING_GUARD_ROUTE,
  X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE,
  X402_SOLANA_LENDING_GUARD_ROUTE,
  X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE,
  X402_EXECUTION_PREFLIGHT_ROUTE,
  X402_MCP_ROUTE,
  X402_PRE_TRADE_ROUTE,
  X402_SWAP_INTENT_ROUTE,
  getX402PaymentOptions,
} from './config';
import { createResilientFacilitator } from './facilitatorResilience';
import { isSolanaPublicKey } from './solanaEncoding';

/**
 * Lazily-built singleton around the official x402 Foundation v2 server stack
 * (`@x402/core/server` plus the configured EVM and SVM exact schemes), wired
 * to the pre-trade, execution-preflight, and MCP routes.
 *
 * `initialize()` performs a facilitator `getSupported()` round-trip; the
 * singleton keeps that cost off the request path, and the resilient
 * facilitator wrapper (see facilitatorResilience.ts) keeps that round-trip
 * itself from stalling a cold instance when the facilitator rate-limits.
 */

let cached: x402HTTPResourceServer | null = null;
let cachedKey = '';

type SvmPaymentRequirements = Parameters<ExactSvmScheme['enhancePaymentRequirements']>[0];
type SvmSupportedKind = Parameters<ExactSvmScheme['enhancePaymentRequirements']>[1];

interface FacilitatorBlockhashHint {
  recentBlockhash: string;
  lastValidBlockHeight: string;
}

interface FacilitatorPaymentHint extends FacilitatorBlockhashHint {
  feePayer: string;
}

const PAYAI_SOLANA_FACILITATOR_HOST = 'facilitator.payai.network';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFacilitatorPaymentHint(extra: unknown): FacilitatorPaymentHint | null {
  if (!isRecord(extra)) return null;
  const feePayer = extra.feePayer;
  const recentBlockhash = extra.recentBlockhash;
  const lastValidBlockHeight = extra.lastValidBlockHeight;
  if (
    typeof feePayer !== 'string' ||
    !isSolanaPublicKey(feePayer) ||
    typeof recentBlockhash !== 'string' ||
    !isSolanaPublicKey(recentBlockhash) ||
    typeof lastValidBlockHeight !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(lastValidBlockHeight)
  ) {
    return null;
  }
  return { feePayer, recentBlockhash, lastValidBlockHeight };
}

function isPayAiSolanaFacilitator(url: string): boolean {
  try {
    return new URL(url).host === PAYAI_SOLANA_FACILITATOR_HOST;
  } catch {
    return false;
  }
}

/**
 * The `supported` response is normally cached during server initialization.
 * For SVM providers that publish a blockhash there, refreshing it for the
 * individual 402 quote is necessary: a cached hash expires in about a minute.
 *
 * This stays additive to the upstream exact scheme. A validated refreshed
 * response replaces fee payer, blockhash, and validity height as one atomic
 * tuple, since SVM facilitators can rotate all three together. If either
 * response does not advertise a usable tuple or the refresh fails, normal SDK
 * behaviour remains unchanged.
 */
class FacilitatorHintExactSvmScheme extends ExactSvmScheme {
  constructor(
    private readonly hintSource: {
      url: string;
      timeoutMs: number;
      bearerToken: string | null;
    } | null,
    options?: { rpcUrl: string }
  ) {
    super(options);
  }

  async enhancePaymentRequirements(
    paymentRequirements: SvmPaymentRequirements,
    supportedKind: SvmSupportedKind,
    extensionKeys: string[]
  ) {
    const requirements = await super.enhancePaymentRequirements(
      paymentRequirements,
      supportedKind,
      extensionKeys
    );
    // An explicitly configured, operator-confirmed RPC has precedence. The
    // upstream scheme already fetched its current hash in that case.
    if (requirements.extra?.recentBlockhash || this.hintSource === null) return requirements;

    const initialExtra = isRecord(supportedKind.extra) ? supportedKind.extra : {};
    // Most facilitators need to advertise the whole tuple before we add a
    // request. The current x402 SVM kind parser retains PayAI's fee payer but
    // discards its dynamic blockhash fields, so PayAI is the narrow exception:
    // query its authoritative /supported response per quote.
    if (
      parseFacilitatorPaymentHint(initialExtra) === null &&
      !isPayAiSolanaFacilitator(this.hintSource.url)
    ) {
      return requirements;
    }

    try {
      const response = await fetch(`${this.hintSource.url.replace(/\/+$/, '')}/supported`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          ...(this.hintSource.bearerToken
            ? { Authorization: `Bearer ${this.hintSource.bearerToken}` }
            : {}),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(Math.min(this.hintSource.timeoutMs, 3_000)),
      });
      if (!response.ok) return requirements;

      const payload: unknown = await response.json();
      if (!isRecord(payload) || !Array.isArray(payload.kinds)) return requirements;
      const currentKind = payload.kinds.find(
        (kind): kind is Record<string, unknown> =>
          isRecord(kind) &&
          kind.x402Version === 2 &&
          kind.scheme === 'exact' &&
          kind.network === supportedKind.network
      );
      if (!currentKind || !isRecord(currentKind.extra)) return requirements;
      const hint = parseFacilitatorPaymentHint(currentKind.extra);
      return hint ? { ...requirements, extra: { ...requirements.extra, ...hint } } : requirements;
    } catch {
      return requirements;
    }
  }
}

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

/**
 * Separate marketplace descriptor for the action-facing preflight route. It
 * must not advertise the legacy PASS/CAUTION/DANGER/BLOCK response shape.
 */
export const BAZAAR_PREFLIGHT_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  input: {
    asset: 'MON',
    chainId: 143,
    action: 'swap',
    tradeAmountUsd: 1000,
    destinationAsset: 'USDC',
  },
  inputSchema: {
    type: 'object',
    properties: {
      asset: { type: 'string', description: 'Asset symbol, e.g. MON, ETH, BTC' },
      chainId: { type: 'number', description: 'Execution chain ID; Monad mainnet is 143' },
      action: { type: 'string', enum: ['swap', 'borrow', 'lend', 'liquidate', 'repay'] },
      tradeAmountUsd: { type: 'number', description: 'Trade size in USD' },
      destinationAsset: { type: 'string', description: 'Optional destination asset for the route' },
      targetProviders: {
        type: 'string',
        description:
          'Optional comma-separated provider scope. On Monad, `pyth` uses the pinned Pyth Core fast path; one provider remains insufficient for ALLOW.',
      },
      decisionInputCheck: {
        type: 'string',
        enum: ['0', '1'],
        description:
          'Set to 1 with a fresh venue quote and explicit policy to become eligible for ALLOW',
      },
    },
    required: ['asset', 'chainId', 'action', 'tradeAmountUsd'],
  },
  output: {
    example: {
      verdict: 'caution',
      recommendation: 'review_before_execution',
      gates: {
        oracleSafety: { status: 'passed' },
        venueQuote: { status: 'not_assessed' },
        nativeOracle: { provider: 'pyth', status: 'passed', onChainVerified: true },
      },
    },
  },
});

/** Marketplace contract for the Base-specific lending decision gate. */
export const BAZAAR_BASE_LENDING_GUARD_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  input: {
    protocolId: 'aave-v3-base',
    action: 'borrow',
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    collateralValueUsd: 10_000,
    debtValueUsd: 4_000,
  },
  inputSchema: {
    type: 'object',
    properties: {
      protocolId: {
        type: 'string',
        enum: ['aave-v3-base', 'morpho-blue-base', 'compound-v3-base', 'moonwell-base'],
      },
      action: { type: 'string', enum: ['supply', 'borrow'] },
      collateralSymbol: { type: 'string', description: 'On-chain collateral token symbol' },
      loanSymbol: { type: 'string', description: 'On-chain loan token symbol' },
      collateralValueUsd: {
        type: 'number',
        description: 'Caller-declared post-action collateral value in USD',
      },
      debtValueUsd: {
        type: 'number',
        description: 'Caller-declared post-action debt value in USD',
      },
      marketId: { type: 'string', description: 'Required immutable Morpho Blue market id' },
      transaction: {
        type: 'object',
        description:
          'POST only: exact unsigned Base transaction {chainId,from,to,data,nonce,value}; required for portable signed decision evidence.',
      },
    },
    required: [
      'protocolId',
      'action',
      'collateralSymbol',
      'loanSymbol',
      'collateralValueUsd',
      'debtValueUsd',
    ],
  },
  output: {
    example: {
      schema: 'insight.base-lending-guard.v1',
      verdict: 'ALLOW',
      projected: { ltv: 0.4, liquidationBufferPct: 50, conservativeMaxDebtUsd: 7200 },
      next: { execution: 'not_performed' },
    },
  },
});

/** Marketplace contract for the Monad direct-lending decision gate. */
export const BAZAAR_MONAD_LENDING_GUARD_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  input: {
    protocolId: 'aave-v3-monad',
    action: 'borrow',
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    collateralValueUsd: 10_000,
    debtValueUsd: 4_000,
  },
  inputSchema: {
    type: 'object',
    properties: {
      protocolId: { type: 'string', enum: ['aave-v3-monad', 'morpho-blue-monad'] },
      action: { type: 'string', enum: ['supply', 'borrow'] },
      collateralSymbol: { type: 'string', description: 'On-chain collateral token symbol' },
      loanSymbol: { type: 'string', description: 'On-chain loan token symbol' },
      collateralValueUsd: {
        type: 'number',
        description: 'Caller-declared post-action collateral value in USD',
      },
      debtValueUsd: {
        type: 'number',
        description: 'Caller-declared post-action debt value in USD',
      },
      marketId: { type: 'string', description: 'Required immutable Morpho Blue Monad market id' },
      transaction: {
        type: 'object',
        description:
          'POST only: exact unsigned Monad transaction {chainId:143,from,to,data,nonce,value}.',
      },
    },
    required: [
      'protocolId',
      'action',
      'collateralSymbol',
      'loanSymbol',
      'collateralValueUsd',
      'debtValueUsd',
    ],
  },
  output: {
    example: {
      schema: 'insight.monad-lending-guard.v1',
      verdict: 'ALLOW',
      projected: { ltv: 0.4, liquidationBufferPct: 50, conservativeMaxDebtUsd: 7200 },
      next: { execution: 'not_performed' },
    },
  },
});

/** Marketplace contract for reviewed Base, Polygon, Arbitrum and BNB direct lending calls. */
export const BAZAAR_MULTICHAIN_EVM_LENDING_GUARD_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  input: {
    chainId: 42161,
    protocolId: 'aave-v3-arbitrum',
    action: 'borrow',
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    collateralValueUsd: 10_000,
    debtValueUsd: 4_000,
  },
  inputSchema: {
    type: 'object',
    properties: {
      chainId: { type: 'number', enum: [8453, 137, 42161, 56] },
      protocolId: {
        type: 'string',
        enum: [
          'aave-v3-polygon',
          'aave-v3-arbitrum',
          'aave-v3-bnb',
          'venus-core-bnb',
          'compound-v3-arbitrum',
          'morpho-blue-polygon',
          'morpho-blue-arbitrum',
          'lista-moolah-bnb',
          'euler-v2-base',
          'euler-v2-arbitrum',
          'dolomite-arbitrum',
          'fluid-vault-t1-base',
          'fluid-vault-t1-arbitrum',
        ],
      },
      action: { type: 'string', enum: ['supply', 'borrow'] },
      collateralSymbol: { type: 'string', description: 'Reviewed collateral token symbol' },
      loanSymbol: { type: 'string', description: 'Reviewed loan token symbol' },
      collateralValueUsd: {
        type: 'number',
        description: 'Caller-declared post-action collateral value in USD',
      },
      debtValueUsd: {
        type: 'number',
        description: 'Caller-declared post-action debt value in USD',
      },
      marketId: {
        type: 'string',
        description:
          'Required immutable market ID for Morpho Blue and Lista Moolah isolated-market calls.',
      },
      marketAddress: {
        type: 'string',
        description:
          'Required for Euler v2 or Fluid T1: the exact vault address Insight verifies against the protocol canonical factory.',
      },
      collateralVaultAddress: {
        type: 'string',
        description:
          'Required for an Euler v2 borrow: the collateral EVault enabled and funded within the exact EVC batch.',
      },
      collateralMarketId: {
        type: 'string',
        description:
          'Required for Dolomite: decimal collateral market ID bound to the exact operate call.',
      },
      loanMarketId: {
        type: 'string',
        description:
          'Required for Dolomite: decimal debt market ID bound to the exact operate call.',
      },
      accountNumber: {
        type: 'string',
        description: 'Required for Dolomite: sender-owned decimal margin account number.',
      },
      transaction: {
        type: 'object',
        description:
          'POST only: exact unsigned direct EVM transaction {chainId,from,to,data,nonce,value}.',
      },
    },
    required: [
      'chainId',
      'protocolId',
      'action',
      'collateralSymbol',
      'loanSymbol',
      'collateralValueUsd',
      'debtValueUsd',
    ],
  },
  output: {
    example: {
      schema: 'insight.multichain-evm-lending-guard.v1',
      verdict: 'ALLOW',
      projected: { ltv: 0.4, liquidationBufferPct: 50, conservativeMaxDebtUsd: 7200 },
      next: { execution: 'not_performed' },
    },
  },
});

/** Marketplace contract for a paired swap decision, distinct from a lone price check. */
export const BAZAAR_SWAP_INTENT_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  input: {
    sourceAsset: 'ETH',
    destinationAsset: 'USDC',
    subjectChainId: 1,
    settlementChainId: 1,
    declaredNotionalUsd: 1000,
  },
  inputSchema: {
    type: 'object',
    properties: {
      sourceAsset: { type: 'string', description: 'Asset being sold, e.g. ETH' },
      destinationAsset: { type: 'string', description: 'Asset being bought, e.g. USDC' },
      subjectChainId: { type: 'number', description: 'Same chain on which the swap is evaluated' },
      settlementChainId: { type: 'number', description: 'Must equal subjectChainId in v1' },
      declaredNotionalUsd: { type: 'number', description: 'Declared swap notional in USD' },
      venue: {
        type: 'string',
        description: 'Optional caller-claimed venue, never a verified venue fact',
      },
      router: { type: 'string', description: 'Optional caller-claimed EVM router' },
    },
    required: [
      'sourceAsset',
      'destinationAsset',
      'subjectChainId',
      'settlementChainId',
      'declaredNotionalUsd',
    ],
  },
  output: {
    example: {
      journeyId: 'opaque UUID',
      sourceCheck: { verdict: 'PASS' },
      destinationCheck: { verdict: 'PASS' },
      next: { executionReceipt: { method: 'POST' } },
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

function routeConfigFor(
  cfg: X402Config,
  extension = BAZAAR_DISCOVERY_EXTENSION,
  description = 'Pre-trade safety check: oracle-immune-system verdict for one trade, with verifiable EIP-712 attestation support. BLOCK verdicts are complete checks and are charged.'
) {
  return {
    description,
    mimeType: 'application/json',
    accepts: acceptsFor(cfg),
    extensions: extension,
    x402Version: 2,
  };
}

/** A POST-only exact-message route cannot truthfully use Bazaar's GET-query discovery schema. */
function routeConfigWithoutDiscovery(cfg: X402Config, description: string) {
  return {
    description,
    mimeType: 'application/json',
    accepts: acceptsFor(cfg),
    x402Version: 2,
  };
}

/**
 * Bazaar discovery metadata for the MCP endpoint. Declared as an MCP-shaped
 * extension (`toolName` present) so the SDK emits `{type:"mcp"}` info; a
 * config without `toolName` is downgraded to a query extension, which the
 * CDP indexer rejects for this POST-only resource. The example is the
 * JSON-RPC `tools/call` params object. Exported for tests.
 */
export const BAZAAR_MCP_DISCOVERY_EXTENSION = declareDiscoveryExtension({
  toolName: 'pre_trade_safety_check',
  transport: 'streamable-http',
  example: {
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
 * Build one facilitator client per distinct facilitator URL needed by the
 * configured payment options. Networks inherit `cfg.facilitatorUrl` unless
 * `cfg.facilitatorUrls[network]` overrides them (e.g. Monad mainnet routes to
 * the Monad facilitator because CDP does not serve it). CDP bearer-JWT auth
 * and configured static Bearer credentials are attached server-side only.
 *
 * Every client is wrapped by {@link createResilientFacilitator}: verify/settle
 * pass through to the core HTTP client unchanged, while getSupported is served
 * from a process-local cache (stale-while-error + config-derived fallback) so
 * a rate-limited or down facilitator cannot stall `initialize()` on cold
 * instances for ~90s (production incident INT-07, 2026-10-16).
 */
function buildFacilitatorClients(
  cfg: X402Config,
  deps?: Partial<X402ServerDeps>
): FacilitatorClient[] {
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
      urls.add(facilitatorUrlForNetwork(cfg, option.network));
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
    // Networks routed to this facilitator, used to synthesize the offline
    // fallback /supported response (only served when the facilitator is
    // unreachable and no cached response exists).
    const routed = deps?.facilitatorUrl
      ? options
      : options.filter((option) => facilitatorUrlForNetwork(cfg, option.network) === url);
    const fallbackKinds = (routed.length > 0 ? routed : options).map((option) => ({
      x402Version: 2,
      scheme: 'exact',
      network: option.network,
    }));
    const bearerTokens = new Set(
      (routed.length > 0 ? routed : options).map((option) =>
        facilitatorBearerTokenForNetwork(cfg, option.network)
      )
    );
    if (bearerTokens.size > 1) {
      throw new Error(
        `facilitator ${url} has conflicting static Bearer credentials across routed networks`
      );
    }
    const bearerToken = bearerTokens.values().next().value ?? cfg.facilitatorBearerToken ?? null;
    return createResilientFacilitator({
      url,
      timeoutMs,
      cdpAuth: isCdp ? cfg.facilitatorCdpAuth : null,
      bearerToken: isCdp ? null : bearerToken,
      fallbackKinds,
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
    // An SVM transaction expires quickly. When the operator provides an RPC
    // known to share the facilitator's cluster view, emit one fresh blockhash
    // in the quote so the client does not fetch a potentially divergent one.
    // The SDK deliberately omits the hint when this is unset or unavailable.
    const svmSchemeOptions = cfg.solana?.rpcUrl ? { rpcUrl: cfg.solana.rpcUrl } : undefined;
    const svmHintSource = cfg.solana
      ? {
          url: facilitatorUrlForNetwork(cfg, cfg.solana.network),
          timeoutMs: cfg.facilitatorTimeoutMs,
          bearerToken: facilitatorBearerTokenForNetwork(cfg, cfg.solana.network),
        }
      : null;
    for (const network of networks) {
      server.register(network, new FacilitatorHintExactSvmScheme(svmHintSource, svmSchemeOptions));
    }
  }
  // Enriches the declared discovery extension with the actual HTTP method and
  // query params from each request context before the 402 goes out.
  server.registerExtension(bazaarResourceServerExtension);

  const httpServer = new x402HTTPResourceServer(server, {
    [X402_PRE_TRADE_ROUTE]: routeConfigFor(cfg),
    [X402_EXECUTION_PREFLIGHT_ROUTE]: routeConfigFor(
      cfg,
      BAZAAR_PREFLIGHT_DISCOVERY_EXTENSION,
      'Execution preflight: a chain-neutral ALLOW/CAUTION/BLOCK data-sufficiency decision for one declared action. A complete BLOCK result is charged; settlement occurs only after a successful response.'
    ),
    [X402_BASE_LENDING_GUARD_ROUTE]: routeConfigFor(
      cfg,
      BAZAAR_BASE_LENDING_GUARD_DISCOVERY_EXTENSION,
      'Base Lending Guard: a read-only, pre-signing decision for Aave V3, exact Morpho Blue markets, Compound V3 Base USDC Comet, or reviewed Moonwell Base markets. GET returns a preview; POST accepts one unsigned direct call and may return an Insight EIP-712 decision attestation. It never authorizes or broadcasts a transaction.'
    ),
    [X402_MONAD_LENDING_GUARD_ROUTE]: routeConfigFor(
      cfg,
      BAZAAR_MONAD_LENDING_GUARD_DISCOVERY_EXTENSION,
      'Monad Lending Guard: a read-only, pre-signing decision for direct Aave V3 Monad calls or exact Morpho Blue Monad markets. GET returns a preview; POST binds one unsigned direct call and may return an Insight EIP-712 decision attestation. It never authorizes or broadcasts a transaction.'
    ),
    [X402_MULTICHAIN_EVM_LENDING_GUARD_ROUTE]: routeConfigFor(
      cfg,
      BAZAAR_MULTICHAIN_EVM_LENDING_GUARD_DISCOVERY_EXTENSION,
      'Multichain EVM Lending Guard: a read-only, pre-signing decision for direct Aave V3 calls on Polygon, Arbitrum or BNB Chain; Venus Core or Lista Moolah isolated-market calls on BNB Chain; Compound V3, Dolomite, Euler v2, and Fluid T1 collateral-only supply on Arbitrum; Euler v2 and Fluid T1 collateral-only supply on Base; and exact Morpho Blue markets on Polygon or Arbitrum. Dolomite is restricted to one sender-owned account and one deposit or borrow action; Fluid vaults must verify against the canonical factory. GET returns a preview; POST binds one unsigned direct call and may return an Insight EIP-712 decision attestation. It never authorizes or broadcasts a transaction.'
    ),
    [X402_SOLANA_LENDING_GUARD_ROUTE]: routeConfigWithoutDiscovery(
      cfg,
      'Solana Lending Guard: a read-only, pre-signing decision for one direct Kamino Lend, Marginfi v2, Jupiter Lend Earn deposit, or Save Lend reserve-liquidity deposit instruction. Save deposits must provide an asset mint that is live-verified against the source SPL token account. POST verifies program-owned accounts and simulates the exact unsigned Solana message before optionally returning an Insight Ed25519 decision attestation. It never authorizes or broadcasts a transaction.'
    ),
    [X402_LOOPSCALE_VAULT_DEPOSIT_ROUTE]: routeConfigWithoutDiscovery(
      cfg,
      'Loopscale Vault Deposit Guard: a read-only, pre-signing preparation for one official Loopscale Solana lending-vault deposit. POST validates live vault metadata and principal mint, accepts only a single returned message with no preliminary transactions, resolves address lookup tables, simulates the exact unsigned message, and may return an Insight Ed25519 decision attestation. It never authorizes or broadcasts a transaction.'
    ),
    [X402_SWAP_INTENT_ROUTE]: routeConfigFor(
      cfg,
      BAZAAR_SWAP_INTENT_DISCOVERY_EXTENSION,
      'Verified Swap Intent: two signed schema-v3 Pre-Trade gates for one same-chain swap, plus one Execution Receipt credit after x402 settlement. A BLOCK is a complete, charged decision.'
    ),
    [X402_MCP_ROUTE]: mcpRouteConfigFor(cfg, options?.mcpAmountAtomic ?? cfg.amountAtomic),
  });
  await httpServer.initialize();

  const unsupportedNetworks = paymentOptions
    .filter((option) => !server.getSupportedKind(2, option.network, 'exact'))
    .map((option) => option.network);
  if (unsupportedNetworks.length > 0) {
    throw new Error(
      `a configured facilitator does not advertise x402 v2 exact support for: ${unsupportedNetworks.join(', ')}. Check its /supported endpoint and X402_EVM_NETWORKS/X402_SOLANA_NETWORK.`
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
    r: cfg.solana?.rpcUrl ?? null,
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
    r: cfg.solana?.rpcUrl ?? null,
  });
  const hit = mcpCache.get(key);
  if (hit) {
    return hit;
  }
  const built = await buildX402HttpServer(cfg, undefined, { mcpAmountAtomic: amountAtomic });
  mcpCache.set(key, built);
  return built;
}
