import type { OracleFeed } from '@/lib/supabase/queries';
import { OracleProvider } from '@/types/oracle';

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
const feeds = new Map<string, OracleFeed[]>([
  ['chainlink', [{ chain_id: 1, symbol: 'USDC/USD' } as OracleFeed]],
  ['api3', [{ chain_id: 8453, symbol: 'USDC/USD' } as OracleFeed]],
]);

beforeEach(() => {
  jest.clearAllMocks();
  mockResolve.mockResolvedValue([
    OracleProvider.CHAINLINK,
    OracleProvider.API3,
    OracleProvider.TWAP,
  ]);
});

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
        provider: OracleProvider.CHAINLINK,
        status: 'success',
        price: 1,
        timestamp: 1000,
        dataAgeSeconds: 400,
        isOutlier: false,
      },
      {
        provider: OracleProvider.API3,
        status: 'error',
        price: 0,
        timestamp: 5000,
        dataAgeSeconds: null,
        isOutlier: false,
      },
      {
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
        provider: OracleProvider.CHAINLINK,
        status: 'success',
        price: 1,
        dataAgeSeconds: 5,
        isOutlier: false,
      },
      {
        provider: OracleProvider.API3,
        status: 'success',
        price: 1,
        dataAgeSeconds: 5,
        isOutlier: false,
      },
      {
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
