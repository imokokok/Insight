import type { OracleFeed } from '@/lib/supabase/queries';
import { Blockchain, OracleProvider } from '@/types/oracle';

import {
  getConsensusPrice,
  resolveProvidersForSymbol,
  type ConsensusPriceResponse,
} from '../consensusPriceService';
import { getCoverageDiagnostic } from '../coverageDiagnostics';

jest.mock('../consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
  resolveProvidersForSymbol: jest.fn(),
}));

const mockResolve = jest.mocked(resolveProvidersForSymbol);
const mockConsensus = jest.mocked(getConsensusPrice);
const now = 1800000000;
const feeds = new Map<string, OracleFeed[]>([
  ['chainlink', [{ chain_id: 1, symbol: 'USDC/USD' } as OracleFeed]],
  ['api3', [{ chain_id: 8453, symbol: 'USDC/USD' } as OracleFeed]],
]);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(now * 1000);
  mockResolve.mockResolvedValue([
    OracleProvider.CHAINLINK,
    OracleProvider.API3,
    OracleProvider.TWAP,
  ]);
});
afterEach(() => jest.restoreAllMocks());
const providerDefaults = {
  symbol: 'USDC/USD',
  chain: Blockchain.ETHEREUM,
  countsTowardOracleQuorum: true,
  retrievedAt: now * 1000,
  timestampProvenance: 'provider_age',
};

it('does not equate the registry with availability or borrow another chain registration', async () => {
  const result = await getCoverageDiagnostic({ asset: 'USDC', chainId: 1, probe: false }, feeds);
  expect(mockConsensus).not.toHaveBeenCalled();
  expect(result.status).toBe('NOT_PROBED');
  expect(result.respondingCount).toBeNull();
  expect(result.registeredCount).toBe(1);
  expect(result.providers.find((p) => p.provider === 'api3')?.registered).toBe(false);
});

it('rejects unsupported explicit chains before any consensus fetch', async () => {
  await expect(
    getCoverageDiagnostic({ asset: 'USDC', chainId: 84532, probe: true }, feeds)
  ).rejects.toThrow('explicit evidence chainId');
  expect(mockResolve).not.toHaveBeenCalled();
  expect(mockConsensus).not.toHaveBeenCalled();
});

it('reports 2 of 3 and independent groups separately; unknown timestamps never satisfy a freshness budget', async () => {
  mockConsensus.mockResolvedValue({
    providers: [
      {
        ...providerDefaults,
        provider: OracleProvider.CHAINLINK,
        status: 'success',
        price: 1,
        timestamp: 1000,
        dataAgeSeconds: 400,
        isOutlier: false,
      },
      {
        ...providerDefaults,
        provider: OracleProvider.API3,
        status: 'error',
        price: 0,
        timestamp: 5000,
        dataAgeSeconds: null,
        isOutlier: false,
      },
      {
        ...providerDefaults,
        provider: OracleProvider.TWAP,
        status: 'success',
        price: 1,
        timestamp: 1000,
        dataAgeSeconds: null,
        isOutlier: false,
      },
    ],
  } as ConsensusPriceResponse);
  const result = await getCoverageDiagnostic(
    { asset: 'USDC', chainId: 1, probe: true, maxSourceAgeSeconds: 300 },
    feeds
  );
  expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
  expect(result.includedCount).toBe(2);
  expect(result.requiredParticipantCount).toBe(3);
  expect(result.nonDerivedGroupCount).toBe(1);
  expect(result.freshCount).toBe(0);
  expect(result.freshnessStatus).toBe('INSUFFICIENT_FRESH_EVIDENCE');
  expect(result.providers.map((p) => p.reason)).toEqual([
    'SOURCE_TOO_OLD',
    'FETCH_FAILED',
    'SOURCE_AGE_UNKNOWN',
  ]);
});

it('does not count a consensus-excluded provider toward quorum', async () => {
  mockConsensus.mockResolvedValue({
    providers: [
      {
        ...providerDefaults,
        provider: OracleProvider.CHAINLINK,
        status: 'success',
        price: 1,
        dataAgeSeconds: 5,
        isOutlier: false,
      },
      {
        ...providerDefaults,
        provider: OracleProvider.API3,
        status: 'success',
        price: 1,
        dataAgeSeconds: 5,
        isOutlier: false,
      },
      {
        ...providerDefaults,
        provider: OracleProvider.TWAP,
        status: 'success',
        price: 2,
        dataAgeSeconds: 5,
        isOutlier: true,
      },
    ],
  } as ConsensusPriceResponse);
  const result = await getCoverageDiagnostic(
    { asset: 'USDC', chainId: 1, probe: true, maxSourceAgeSeconds: 300 },
    feeds
  );
  expect(result.respondingCount).toBe(3);
  expect(result.includedCount).toBe(2);
  expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
});

it.each([
  'unknown-provider',
  'negative-age',
  'nan-age',
  'infinite-price',
  'future-source',
  'future-retrieval',
  'old-retrieval',
  'unknown-provenance',
  'wrong-chain',
  'missing-chain',
  'wrong-symbol',
  'wrong-quote',
  'simulation',
  'duplicate',
])('strict diagnostics reject %s from fresh quorum', async (mode) => {
  const providers = [OracleProvider.CHAINLINK, OracleProvider.API3, OracleProvider.TWAP].map(
    (provider) => ({
      ...providerDefaults,
      provider,
      status: 'success',
      price: 1,
      timestamp: (now - 5) * 1000,
      dataAgeSeconds: 5,
      isOutlier: false,
    })
  );
  const p = providers[0] as unknown as Record<string, unknown>;
  if (mode === 'unknown-provider') {
    p.provider = 'unclassified';
    mockResolve.mockResolvedValue([
      'unclassified',
      OracleProvider.API3,
      OracleProvider.TWAP,
    ] as OracleProvider[]);
  }
  if (mode === 'negative-age') p.dataAgeSeconds = -1;
  if (mode === 'nan-age') p.dataAgeSeconds = NaN;
  if (mode === 'infinite-price') p.price = Infinity;
  if (mode === 'future-source') {
    p.timestampProvenance = 'provider_timestamp';
    p.timestamp = (now + 10) * 1000;
  }
  if (mode === 'future-retrieval') p.retrievedAt = (now + 10) * 1000;
  if (mode === 'old-retrieval') p.retrievedAt = (now - 400) * 1000;
  if (mode === 'unknown-provenance') p.timestampProvenance = 'unknown';
  if (mode === 'wrong-chain') p.chain = Blockchain.BASE;
  if (mode === 'missing-chain') delete p.chain;
  if (mode === 'wrong-symbol') p.symbol = 'ETH/USD';
  if (mode === 'wrong-quote') p.symbol = 'USDC/ETH';
  if (mode === 'simulation') p.countsTowardOracleQuorum = false;
  if (mode === 'duplicate') {
    providers.push({ ...providers[0] });
    mockResolve.mockResolvedValue([
      OracleProvider.CHAINLINK,
      OracleProvider.CHAINLINK,
      OracleProvider.API3,
      OracleProvider.TWAP,
    ]);
  }
  mockConsensus.mockResolvedValue({ providers } as ConsensusPriceResponse);
  const result = await getCoverageDiagnostic(
    { asset: 'USDC', chainId: 1, probe: true, maxSourceAgeSeconds: 300 },
    feeds
  );
  expect(result.schema).toBe('insight.coverage-diagnostic.v2');
  expect(result.freshnessStatus).toBe('INSUFFICIENT_FRESH_EVIDENCE');
  expect(result.freshCount).toBe(2);
  expect(result.freshNonDerivedGroupCount).toBe(1);
  if (mode === 'unknown-provider') {
    expect(result.providers[0].sourceGroup).toBeNull();
    expect(result.nonDerivedGroupCount).toBe(1);
  }
});
it('recognizes Band and separates raw availability from trusted freshness', async () => {
  mockResolve.mockResolvedValue([
    OracleProvider.CHAINLINK,
    OracleProvider.API3,
    OracleProvider.BAND,
  ]);
  mockConsensus.mockResolvedValue({
    providers: [OracleProvider.CHAINLINK, OracleProvider.API3, OracleProvider.BAND].map(
      (provider) => ({
        ...providerDefaults,
        provider,
        status: 'success',
        price: 1,
        timestamp: (now - 5) * 1000,
        dataAgeSeconds: 5,
        isOutlier: false,
      })
    ),
  } as ConsensusPriceResponse);
  const result = await getCoverageDiagnostic(
    { asset: 'USDC', chainId: 1, probe: true, maxSourceAgeSeconds: 300 },
    feeds
  );
  expect(result.freshnessStatus).toBe('SUFFICIENT');
  expect(result.freshNonDerivedGroupCount).toBe(3);
  expect(result.signed).toBe(false);
});
it.each([NaN, Infinity, -1, 0, 1.5, 604801])(
  'rejects invalid freshness budget %s before probing',
  async (maxSourceAgeSeconds) => {
    await expect(
      getCoverageDiagnostic({ asset: 'USDC', chainId: 1, probe: true, maxSourceAgeSeconds }, feeds)
    ).rejects.toThrow('Invalid coverage');
    expect(mockConsensus).not.toHaveBeenCalled();
  }
);
