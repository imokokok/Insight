import {
  validateDiscoveryExtension,
  validateDiscoveryExtensionSpec,
} from '@x402/extensions/bazaar';

import { BAZAAR_DISCOVERY_EXTENSION } from '../resourceServer';

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

const declared = BAZAAR_DISCOVERY_EXTENSION.bazaar as unknown as QueryBazaarExtension;

/** The wire shape after bazaarResourceServerExtension.enrichDeclaration on a GET. */
const enrichedGet = {
  ...declared,
  info: { ...declared.info, input: { ...declared.info.input, method: 'GET' } },
};

describe('bazaar discovery extension', () => {
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
});
