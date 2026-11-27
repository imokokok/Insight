import {
  validateDiscoveryExtension,
  validateDiscoveryExtensionSpec,
} from '@x402/extensions/bazaar';

import {
  BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME,
  BAZAAR_BASE_AGENT_SWAP_GUARD_MCP_DISCOVERY_EXTENSION,
  BAZAAR_BNB_PERP_GUARD_DISCOVERY_EXTENSION,
  BAZAAR_DISCOVERY_EXTENSION,
  BAZAAR_HYPERLIQUID_PERP_GUARD_DISCOVERY_EXTENSION,
  BAZAAR_MONAD_PERP_GUARD_DISCOVERY_EXTENSION,
  BAZAAR_PREDICTION_GUARD_DISCOVERY_EXTENSION,
  BAZAAR_PREFLIGHT_DISCOVERY_EXTENSION,
  BAZAAR_SERVICE_METADATA,
  BAZAAR_SOLANA_PERP_GUARD_DISCOVERY_EXTENSION,
  BAZAAR_SWAP_INTENT_DISCOVERY_EXTENSION,
  TRUST_EXTENSION_INFO,
} from '../resourceServer';

/**
 * The Bazaar discovery extension is the contract with Agentic.Market / CDP
 * indexing. A schema-invalid extension does NOT fail any request: the
 * facilitator rejects it silently (only visible via the EXTENSION-RESPONSES
 * header we log in guard.ts) and the endpoint never gets listed. These tests
 * pin the declaration against the official validators so a drift in the
 * metadata is caught at CI time, not after six invisible weeks.
 *
 * Two validator layers, matching the SDK's design:
 * - `validateDiscoveryExtensionSpec` accepts the raw (pre-enrichment)
 *   declaration, where `info.input.method` is still absent.
 * - `validateDiscoveryExtension` (info vs schema) requires the enriched wire
 *   shape, so it runs on a copy with the method the server extension injects
 *   for GET requests at runtime.
 */

interface QueryBazaarExtension {
  info: {
    input: { type: string; method?: string; queryParams: Record<string, unknown> };
    output: { type?: string; example: Record<string, unknown> };
  };
  schema: {
    properties: {
      input: {
        properties: { queryParams: { properties: Record<string, unknown>; required?: string[] } };
        required?: string[];
      };
    };
  };
}

interface McpBazaarExtension {
  info: {
    input: {
      type: string;
      toolName: string;
      description?: string;
      transport?: string;
      inputSchema: { type?: string; properties?: Record<string, unknown>; required?: string[] };
      example?: Record<string, unknown>;
    };
  };
}

const declared = BAZAAR_DISCOVERY_EXTENSION.bazaar as unknown as QueryBazaarExtension;
const preflightDeclared =
  BAZAAR_PREFLIGHT_DISCOVERY_EXTENSION.bazaar as unknown as QueryBazaarExtension;
const swapIntentDeclared =
  BAZAAR_SWAP_INTENT_DISCOVERY_EXTENSION.bazaar as unknown as QueryBazaarExtension;
const baseAgentSwapGuardDeclared =
  BAZAAR_BASE_AGENT_SWAP_GUARD_MCP_DISCOVERY_EXTENSION.bazaar as unknown as McpBazaarExtension;

/** The wire shape after bazaarResourceServerExtension.enrichDeclaration on a GET. */
const enrichedGet = {
  ...declared,
  info: { ...declared.info, input: { ...declared.info.input, method: 'GET' } },
};

describe('bazaar discovery extension', () => {
  it('declares searchable service metadata for every Bazaar-enabled resource', () => {
    expect(BAZAAR_SERVICE_METADATA).toEqual({
      serviceName: 'Insight Oracle',
      tags: ['oracle-safety', 'risk-verdict', 'defi', 'pre-trade', 'x402', 'agent', 'base'],
      iconUrl: 'https://www.oracleinsight.xyz/logos/insight-glacier-cut.svg',
    });
  });

  it('declares the bazaar key as the only extension entry', () => {
    expect(Object.keys(BAZAAR_DISCOVERY_EXTENSION)).toEqual(['bazaar']);
  });

  it('passes the protocol-level spec validator in pre-enrichment form', () => {
    const result = validateDiscoveryExtensionSpec(
      BAZAAR_DISCOVERY_EXTENSION.bazaar as unknown as Record<string, unknown>
    );
    expect(result).toEqual({ valid: true });
  });

  it('passes the official info-vs-schema validator once enriched for GET', () => {
    const result = validateDiscoveryExtension(enrichedGet as never);
    expect(result).toEqual({ valid: true });
  });

  it('declares http query input with the required pre-trade example params', () => {
    expect(declared.info.input.type).toBe('http');
    expect(declared.info.input.queryParams).toEqual({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 1000,
    });
    expect(declared.info.output.example).toHaveProperty('verdict');
    expect(declared.info.output.example).toHaveProperty('consensusPrice');
  });

  it('carries the query-param schema with exactly the four mandatory params', () => {
    const queryParams = declared.schema.properties.input.properties.queryParams;
    expect(Object.keys(queryParams.properties)).toEqual(
      expect.arrayContaining([
        'asset',
        'chainId',
        'action',
        'tradeAmountUsd',
        'targetProviders',
        'protocolId',
        'schemaVersion',
        'destinationAsset',
      ])
    );
    expect(queryParams.required).toEqual(['asset', 'chainId', 'action', 'tradeAmountUsd']);
  });

  it('declares the execution-preflight contract with its own truthful wire shape', () => {
    const enriched = {
      ...preflightDeclared,
      info: {
        ...preflightDeclared.info,
        input: { ...preflightDeclared.info.input, method: 'GET' },
      },
    };
    expect(
      validateDiscoveryExtensionSpec(
        BAZAAR_PREFLIGHT_DISCOVERY_EXTENSION.bazaar as unknown as Record<string, unknown>
      )
    ).toEqual({ valid: true });
    expect(validateDiscoveryExtension(enriched as never)).toEqual({ valid: true });
    expect(preflightDeclared.info.input.queryParams).toMatchObject({
      asset: 'MON',
      chainId: 143,
      action: 'swap',
      tradeAmountUsd: 1000,
      destinationAsset: 'USDC',
    });
    expect(preflightDeclared.info.output.example).toMatchObject({
      verdict: 'caution',
      recommendation: 'review_before_execution',
    });
  });

  it('declares the paid two-gate Swap Intent contract for GET discovery', () => {
    const enriched = {
      ...swapIntentDeclared,
      info: {
        ...swapIntentDeclared.info,
        input: { ...swapIntentDeclared.info.input, method: 'GET' },
      },
    };
    expect(
      validateDiscoveryExtensionSpec(
        BAZAAR_SWAP_INTENT_DISCOVERY_EXTENSION.bazaar as unknown as Record<string, unknown>
      )
    ).toEqual({ valid: true });
    expect(validateDiscoveryExtension(enriched as never)).toEqual({ valid: true });
    expect(swapIntentDeclared.info.input.queryParams).toMatchObject({
      sourceAsset: 'ETH',
      destinationAsset: 'USDC',
      subjectChainId: 1,
      settlementChainId: 1,
      declaredNotionalUsd: 1000,
    });
    expect(swapIntentDeclared.info.output.example).toHaveProperty('journeyId');
  });

  it.each([
    ['Hyperliquid Perp Guard', BAZAAR_HYPERLIQUID_PERP_GUARD_DISCOVERY_EXTENSION],
    ['Monad Perp Guard', BAZAAR_MONAD_PERP_GUARD_DISCOVERY_EXTENSION],
    ['Solana Perp Guard', BAZAAR_SOLANA_PERP_GUARD_DISCOVERY_EXTENSION],
    ['BNB Perp Guard', BAZAAR_BNB_PERP_GUARD_DISCOVERY_EXTENSION],
    ['Prediction Guard', BAZAAR_PREDICTION_GUARD_DISCOVERY_EXTENSION],
  ])('declares a valid GET-query discovery contract for %s', (_label, extension) => {
    expect(
      validateDiscoveryExtensionSpec(extension.bazaar as unknown as Record<string, unknown>)
    ).toEqual({ valid: true });
    const declaredExtension = extension.bazaar as unknown as QueryBazaarExtension;
    const enriched = {
      ...declaredExtension,
      info: {
        ...declaredExtension.info,
        input: { ...declaredExtension.info.input, method: 'GET' },
      },
    };
    expect(validateDiscoveryExtension(enriched as never)).toEqual({ valid: true });
    expect(declaredExtension.info.input.type).toBe('http');
  });

  it('declares Base Swap Guard as a distinct, valid MCP discovery resource', () => {
    expect(
      validateDiscoveryExtensionSpec(
        BAZAAR_BASE_AGENT_SWAP_GUARD_MCP_DISCOVERY_EXTENSION.bazaar as unknown as Record<
          string,
          unknown
        >
      )
    ).toEqual({ valid: true });
    // MCP declarations are not HTTP-route enriched: their exact tool name is
    // already part of the wire contract consumed by Bazaar.
    expect(validateDiscoveryExtension(baseAgentSwapGuardDeclared as never)).toEqual({
      valid: true,
    });
    expect(baseAgentSwapGuardDeclared.info.input).toMatchObject({
      type: 'mcp',
      toolName: BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME,
      transport: 'streamable-http',
      example: {
        profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
        amountIn: '0.25',
      },
    });
    expect(baseAgentSwapGuardDeclared.info.input.description).toContain('Base mainnet');
    expect(baseAgentSwapGuardDeclared.info.input.description).toContain('ALLOW, CAUTION, or BLOCK');
    expect(baseAgentSwapGuardDeclared.info.input.inputSchema.required).toEqual(
      expect.arrayContaining([
        'profileId',
        'amountIn',
        'recipient',
        'deadlineUnixSeconds',
        'sourceDecisionPriceUsd',
        'destinationDecisionPriceUsd',
        'policy',
      ])
    );
  });
});

describe('trust extension (402 quote self-description)', () => {
  // The trust extension is the post-payment conversion surface: a first-time
  // caller's only answers to "what does the response contain, how do I verify
  // it, and how do I integrate". These pins keep the pointers valid when
  // routes move — a drifted URL here is invisible in production.
  it('points docs at the live auth guide and the discovery manifest', () => {
    expect(TRUST_EXTENSION_INFO.info.docs.auth).toBe('https://www.oracleinsight.xyz/auth.md');
    expect(TRUST_EXTENSION_INFO.info.docs.discoveryManifest).toBe(
      'https://www.oracleinsight.xyz/.well-known/x402.json'
    );
  });

  it('pins attestation verification to the unauthenticated Tier 0 verify route', () => {
    const { verify, attesterIdentity } = TRUST_EXTENSION_INFO.info.attestation;
    expect(verify).toMatchObject({
      method: 'POST',
      url: 'https://www.oracleinsight.xyz/api/v1/safety/attestation/verify',
      authenticated: false,
    });
    expect(attesterIdentity).toMatchObject({
      method: 'GET',
      url: 'https://www.oracleinsight.xyz/api/v1/safety/attestation/verify',
    });
  });

  it('states the advisory-only boundary and the free verification policy', () => {
    expect(TRUST_EXTENSION_INFO.info.attestation.summary).toContain('insightDoesNotEnforce');
    expect(TRUST_EXTENSION_INFO.info.attestation.summary).toContain(
      'never signs, broadcasts, or enforces'
    );
    expect(TRUST_EXTENSION_INFO.info.free.note).toContain('free');
    expect(TRUST_EXTENSION_INFO.info.free.healthUrl).toBe(
      'https://www.oracleinsight.xyz/api/v1/health'
    );
  });

  it('carries no per-route schema duplication (inputSchema lives only in the manifest)', () => {
    expect(TRUST_EXTENSION_INFO.info).not.toHaveProperty('inputSchema');
  });
});
