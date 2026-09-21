import committedRegistry from '../protocol/rwa-instrument-registry.v1.json';
import {
  validateRwaInstrumentRegistry,
  type RwaInstrumentRegistryEntry,
} from '../sdk/src/rwa-instrument-registry';
import {
  parseIsoMicCsv,
  verifyOpenFigiMapping,
  verifyRegistryMicSnapshot,
  type OpenFigiMappingResult,
} from '../src/lib/rwa/referenceData';

interface OpenFigiJobResult {
  data?: OpenFigiMappingResult[];
  error?: string;
  warning?: string;
}

interface RobinhoodAsset {
  id: string;
  tokenSymbol: string;
  isin?: string;
  deployments: Array<{ chainId: number; contractAddress: string }>;
}

function assertMatches(condition: unknown, code: string): asserts condition {
  if (!condition) throw new TypeError(code);
}

async function checkedFetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new TypeError(`REFERENCE_HTTP_${response.status}:${new URL(url).host}`);
  return response;
}

function verifyRobinhoodAsset(entry: RwaInstrumentRegistryEntry, assets: RobinhoodAsset[]): void {
  const asset = assets.find(
    (candidate) => candidate.tokenSymbol.toUpperCase() === entry.issuerBinding.symbol
  );
  assertMatches(asset, `ROBINHOOD_ASSET_NOT_FOUND:${entry.issuerBinding.symbol}`);
  assertMatches(
    asset.id.toLowerCase() === entry.issuerBinding.nativeAssetId,
    `ROBINHOOD_UID_DRIFT:${entry.issuerBinding.symbol}`
  );
  assertMatches(
    asset.isin?.toUpperCase() === entry.issuerBinding.isin,
    `ROBINHOOD_ISIN_DRIFT:${entry.issuerBinding.symbol}`
  );
  assertMatches(
    asset.deployments.some(
      (deployment) =>
        deployment.chainId === entry.issuerBinding.chainId &&
        deployment.contractAddress.toLowerCase() === entry.issuerBinding.tokenAddress
    ),
    `ROBINHOOD_DEPLOYMENT_DRIFT:${entry.issuerBinding.symbol}`
  );
}

async function main(): Promise<void> {
  const registry = validateRwaInstrumentRegistry(committedRegistry);
  if (process.argv.includes('--offline')) {
    console.log(
      JSON.stringify({
        ok: true,
        mode: 'offline',
        registryVersion: registry.version,
        instruments: registry.entries.length,
      })
    );
    return;
  }

  const openFigiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OPENFIGI_API_KEY)
    openFigiHeaders['X-OPENFIGI-APIKEY'] = process.env.OPENFIGI_API_KEY;
  const [micResponse, figiResponse, robinhoodResponse] = await Promise.all([
    checkedFetch(registry.sources.isoMic.url),
    checkedFetch(registry.sources.openFigi.url, {
      method: 'POST',
      headers: openFigiHeaders,
      body: JSON.stringify(
        registry.entries.map((entry) => ({
          idType: registry.sources.openFigi.mappingIdType,
          idValue: entry.issuerBinding.isin,
        }))
      ),
    }),
    checkedFetch(registry.sources.robinhood.url),
  ]);
  const [micCsv, figiJobs, robinhoodPayload] = await Promise.all([
    micResponse.text(),
    figiResponse.json() as Promise<OpenFigiJobResult[]>,
    robinhoodResponse.json() as Promise<{ assets: RobinhoodAsset[] }>,
  ]);

  verifyRegistryMicSnapshot(registry, parseIsoMicCsv(micCsv));
  assertMatches(figiJobs.length === registry.entries.length, 'OPENFIGI_JOB_COUNT_MISMATCH');
  for (const [index, entry] of registry.entries.entries()) {
    const job = figiJobs[index];
    assertMatches(
      job && !job.error && Array.isArray(job.data),
      `OPENFIGI_JOB_FAILED:${entry.issuerBinding.symbol}`
    );
    verifyOpenFigiMapping(entry, job.data);
    verifyRobinhoodAsset(entry, robinhoodPayload.assets);
  }

  console.log(
    JSON.stringify({
      ok: true,
      mode: 'live',
      registryVersion: registry.version,
      sources: ['ISO_10383_MIC', 'OpenFIGI', 'Robinhood_RHJ'],
      instruments: registry.entries.map((entry) => ({
        symbol: entry.issuerBinding.symbol,
        status: entry.status,
        shareClassFigi: entry.figi.shareClassFigi,
        mic: entry.mic.mic,
        instrumentId: entry.instrumentId,
      })),
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
