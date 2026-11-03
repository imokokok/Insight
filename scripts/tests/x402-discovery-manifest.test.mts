import assert from 'node:assert/strict';
import test from 'node:test';

import { buildX402DiscoveryManifest } from '../../src/lib/api/x402/discoveryManifest';
import type { X402Config } from '../../src/lib/api/x402/config';

const config: X402Config = {
  amountAtomic: '20000',
  bnbAssets: ['usdc'],
  enabled: true,
  evmEnabled: true,
  evmNetworks: ['eip155:999'],
  evmPayTos: {},
  facilitatorBearerToken: null,
  facilitatorBearerTokens: {},
  facilitatorCdpAuth: null,
  facilitatorTimeoutMs: 15_000,
  facilitatorUrl: 'https://facilitator.example',
  facilitatorUrls: {},
  hypercore: {
    facilitatorUrl: 'https://hypercore.example',
    maxTimeoutSeconds: 60,
    merchantId: 'insight',
    merchantSecret: '012345678901234567890123',
    network: 'hyperliquid:mainnet',
    payTo: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
    timeoutMs: 15_000,
  },
  maxTimeoutSeconds: 60,
  network: 'eip155:999',
  payTo: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
  priceUsd: 0.02,
  solana: null,
};

function resource(manifest: ReturnType<typeof buildX402DiscoveryManifest>, path: string) {
  const value = manifest.resources.find(
    (entry) => entry.url === `https://www.oracleinsight.xyz${path}`
  );
  assert.ok(value, `${path} must be present in static root discovery`);
  return value;
}

test('x402 discovery derives every fixed route from its live payment scope', () => {
  const manifest = buildX402DiscoveryManifest(config);
  assert.equal(manifest.x402Version, 2);

  const preTrade = resource(manifest, '/api/v1/safety/pre-trade');
  const baseLending = resource(manifest, '/api/v1/safety/base-lending-guard');
  const basePerp = resource(manifest, '/api/v1/safety/base-perp-guard');
  const monadLending = resource(manifest, '/api/v1/safety/monad-lending-guard');

  assert.equal(preTrade.accepts[0]?.network, 'eip155:999');
  assert.equal(baseLending.accepts[0]?.network, 'eip155:8453');
  assert.equal(baseLending.accepts[0]?.asset, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  assert.equal(basePerp.accepts[0]?.network, 'eip155:8453');
  assert.equal(monadLending.accepts[0]?.network, 'eip155:143');
  assert.equal(monadLending.accepts[0]?.asset, '0x754704Bc059F8C67012fEd69BC8A327a5aafb603');

  const urls = manifest.resources.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length, 'resource URLs must be unique');
});

test('request-bound and expiring payment requirements are not misrepresented as static accepts', () => {
  const manifest = buildX402DiscoveryManifest(config);
  const multichainUrl = 'https://www.oracleinsight.xyz/api/v1/safety/multichain-evm-lending-guard';

  assert.ok(
    !manifest.resources.some((entry) => entry.url === multichainUrl),
    'multichain route must not advertise an arbitrary fallback rail'
  );
  const multichain = manifest.requestBoundResources.find((entry) => entry.url === multichainUrl);
  assert.ok(multichain, 'multichain route must remain discoverable as request-bound');
  assert.equal(multichain.paymentScope, 'validated-request-chain');
  assert.equal(multichain.acceptsByChainId['8453']?.[0]?.network, 'eip155:8453');
  assert.equal(multichain.acceptsByChainId['42161']?.[0]?.network, 'eip155:42161');

  const preTradeUrl = 'https://www.oracleinsight.xyz/api/v1/safety/pre-trade';
  assert.ok(
    manifest.dynamicPaymentOptions.some(
      (entry) => entry.resourceUrl === preTradeUrl && entry.network === 'hyperliquid:mainnet'
    ),
    'HyperCore must be disclosed as a request-bound quote, not fabricated in accepts[]'
  );
  assert.ok(
    !manifest.dynamicPaymentOptions.some((entry) => entry.resourceUrl === multichainUrl),
    'multichain rails are selected from validated input and cannot inherit HyperCore'
  );
});

test('plan-priced resources retain their fixed amounts across route scopes', () => {
  const manifest = buildX402DiscoveryManifest(config);
  const plans = [
    ['/api/v1/safety/oracle-watch-window', 'POST', '500000'],
    ['/api/v1/safety/position-lifecycle', 'POST', '550000'],
  ] as const;

  for (const [path, method, amount] of plans) {
    const entry = resource(manifest, path);
    assert.equal(entry.method, method);
    assert.equal(entry.accepts[0]?.amount, amount);
    assert.equal(entry.accepts[0]?.network, 'eip155:999');
  }
});
