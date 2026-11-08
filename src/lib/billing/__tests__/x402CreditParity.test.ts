/**
 * @fileoverview Cross-surface price parity for the REST catalogue.
 *
 * The same call is sold on two rails: an x402 quote (USDC atomic units) and a
 * credits debit (credits × USD_PER_CREDIT). Each rail resolves the price from a
 * different registry, so a route added to one and forgotten in the other
 * silently sells the same work at two different prices. This test walks the
 * generated discovery manifest — the public catalogue — and requires every
 * advertised REST resource to quote exactly what the credits middleware would
 * charge for the same path.
 */

import { getX402Config } from '@/lib/api/x402/config';
import { buildX402DiscoveryManifest } from '@/lib/api/x402/discoveryManifest';
import { USD_PER_CREDIT } from '@/lib/billing/plans';
import { getEndpointCreditCost } from '@/lib/billing/productPricing';

const PAY_TO = '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231';

/** The MCP dispatcher is a single URL for 20 tools; its real price is quoted
 * per tool in the 402 challenge, so the catalogue only advertises a floor. */
const PER_TOOL_DISPATCH_PATHS = new Set(['/api/mcp']);

function discoveryResources() {
  const config = getX402Config({
    X402_ENABLED: 'true',
    X402_PAY_TO: PAY_TO,
    X402_NETWORK: 'eip155:8453',
    X402_EVM_NETWORKS: 'eip155:8453,eip155:56,eip155:999,eip155:137,eip155:42161',
    X402_AMOUNT: '0.02',
  } as NodeJS.ProcessEnv);
  const manifest = buildX402DiscoveryManifest(config) as {
    resources: Array<{ url: string; accepts?: Array<Record<string, unknown>> }>;
  };
  return manifest.resources;
}

describe('x402 quote vs credits debit', () => {
  it('prices every catalogued REST resource identically on both rails', () => {
    const mismatches: string[] = [];
    for (const resource of discoveryResources()) {
      const path = new URL(resource.url).pathname;
      if (PER_TOOL_DISPATCH_PATHS.has(path)) continue;
      const accepts = resource.accepts ?? [];
      expect(accepts.length).toBeGreaterThan(0);
      const quoteUsd = Number(accepts[0].amount) / 10 ** Number(accepts[0].assetDecimals);
      const creditUsd = getEndpointCreditCost(path) * USD_PER_CREDIT;
      if (Math.abs(quoteUsd - creditUsd) > 1e-9) {
        mismatches.push(`${path}: x402 $${quoteUsd} vs credits $${creditUsd}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('charges the settlement-evidence grade gate at C3 on the credits rail', () => {
    // Regression: this route had no endpoint rule, so it fell through to the
    // C1 default ($0.002) while x402 quoted $0.02 — a 10x divergence.
    expect(getEndpointCreditCost('/api/v1/markets/settlement-evidence/grade')).toBe(20);
  });
});
