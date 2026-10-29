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

test('x402 discovery manifests publish the Monad Lending Guard as a first-class resource', async () => {
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
  assert.deepEqual(
    guard.accepts,
    preTrade.accepts,
    'the Lending Guard must publish every x402 settlement rail available to pre-trade safety'
  );

  const monad = guard.accepts.find((acceptance) => acceptance.network === 'eip155:143');
  assert.deepEqual(monad, {
    amount: '20000',
    asset: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    assetDecimals: 6,
    assetSymbol: 'USDC',
    extra: { name: 'USDC', version: '2' },
    maxTimeoutSeconds: 60,
    network: 'eip155:143',
    payTo: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
    scheme: 'exact',
  });

  const urls = manifest.resources.map((resource) => resource.url);
  assert.equal(new Set(urls).size, urls.length, 'resource URLs must be unique');
});
