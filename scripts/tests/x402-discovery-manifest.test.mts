import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifestPaths = [
  new URL('../../public/.well-known/x402', import.meta.url),
  new URL('../../public/.well-known/x402.json', import.meta.url),
] as const;

type Acceptance = {
  amount: string;
  asset: string;
  assetDecimals?: number;
  assetSymbol?: string;
  extra?: Record<string, string>;
  maxTimeoutSeconds?: number;
  network: string;
  payTo: string;
  scheme: string;
};

type Resource = {
  accepts: Acceptance[];
  description: string;
  method: string;
  url: string;
};

type DiscoveryManifest = {
  resources: Resource[];
  x402Version: number;
};

async function readManifest(path: URL): Promise<DiscoveryManifest> {
  return JSON.parse(await readFile(path, 'utf8')) as DiscoveryManifest;
}

test('x402 discovery manifests publish all paid routes without inactive rails', async () => {
  const manifests = await Promise.all(manifestPaths.map(readManifest));
  assert.deepEqual(manifests[0], manifests[1], 'the extensionless and .json manifests must match');

  const manifest = manifests[0];
  assert.equal(manifest.x402Version, 2);

  const guard = manifest.resources.find(
    (resource) => resource.url === 'https://www.oracleinsight.xyz/api/v1/safety/monad-lending-guard'
  );
  assert.ok(guard, 'Monad Lending Guard must be present in root x402 discovery');
  assert.equal(guard.method, 'GET');
  assert.match(guard.description, /read-only, pre-signing decision/i);
  assert.match(guard.description, /Aave V3 Monad/i);
  assert.match(guard.description, /Morpho Blue Monad/i);

  const preTrade = manifest.resources.find(
    (resource) => resource.url === 'https://www.oracleinsight.xyz/api/v1/safety/pre-trade'
  );
  assert.ok(preTrade, 'pre-trade safety must remain present in root x402 discovery');
  assert.deepEqual(guard.accepts, preTrade.accepts);

  const hyperEvm = guard.accepts[0];
  assert.deepEqual(hyperEvm, {
    amount: '20000',
    asset: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
    assetDecimals: 6,
    assetSymbol: 'USDC',
    extra: { name: 'USDC', version: '2' },
    maxTimeoutSeconds: 60,
    network: 'eip155:999',
    payTo: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
    scheme: 'exact',
  });

  for (const resource of manifest.resources) {
    assert.equal(
      resource.accepts.length,
      1,
      `${resource.url} must advertise only the production x402 rail`
    );
    assert.equal(
      resource.accepts[0]?.network,
      'eip155:999',
      `${resource.url} must not advertise an inactive payment rail`
    );
  }

  const urls = manifest.resources.map((resource) => resource.url);
  assert.equal(new Set(urls).size, urls.length, 'resource URLs must be unique');

  // Every paid REST surface must be discoverable in the root manifest. This
  // list mirrors the route map in src/lib/api/x402/resourceServer.ts; the
  // resourceServer regression test proves each path returns a real 402 quote.
  const expectedPaths = [
    '/api/v1/safety/pre-trade',
    '/api/v1/safety/preflight',
    '/api/v1/safety/base-lending-guard',
    '/api/v1/safety/base-perp-guard',
    '/api/v1/safety/hyperliquid-perp-guard',
    '/api/v1/safety/monad-lending-guard',
    '/api/v1/safety/multichain-evm-lending-guard',
    '/api/v1/safety/solana-lending-guard',
    '/api/v1/safety/solana-swap-guard',
    '/api/v1/safety/loopscale-vault-deposit',
    '/api/v1/safety/swap-intent',
    '/api/v1/safety/oracle-watch-window',
    '/api/v1/safety/position-lifecycle',
    '/api/mcp',
  ];
  for (const expectedPath of expectedPaths) {
    assert.ok(
      urls.some((url) => url === `https://www.oracleinsight.xyz${expectedPath}`),
      `discovery manifest must advertise ${expectedPath}`
    );
  }
});

test('plan-priced resources quote their plan amounts on every settlement rail', async () => {
  const manifest = await readManifest(manifestPaths[0]);

  const preTrade = manifest.resources.find(
    (resource) => resource.url === 'https://www.oracleinsight.xyz/api/v1/safety/pre-trade'
  );
  assert.ok(preTrade, 'pre-trade safety must remain present in root x402 discovery');

  const plans = [
    {
      url: 'https://www.oracleinsight.xyz/api/v1/safety/oracle-watch-window',
      method: 'POST',
      amount: '500000',
      name: 'Oracle Watch Monitored Window',
    },
    {
      url: 'https://www.oracleinsight.xyz/api/v1/safety/position-lifecycle',
      method: 'POST',
      amount: '550000',
      name: 'Position Lifecycle Bundle',
    },
  ] as const;

  for (const plan of plans) {
    const resource = manifest.resources.find((entry) => entry.url === plan.url);
    assert.ok(resource, `${plan.name} must be present in root x402 discovery`);
    assert.equal(resource.method, plan.method);
    assert.match(resource.description, /24h|24 hours/i);
    assert.equal(resource.accepts.length, preTrade.accepts.length, 'same rails as pre-trade');
    for (const acceptance of resource.accepts) {
      assert.equal(
        acceptance.amount,
        plan.amount,
        `${plan.name} must quote ${plan.amount} atomic on ${acceptance.network}`
      );
    }
  }
});
