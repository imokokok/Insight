/** @jest-environment node */

/**
 * Tests for the symbols catalog fallback contract.
 *
 * Regression background: getOracleFeeds() discards the errored bit, so a
 * failed registry read (egress cap, pooler timeout) surfaced as a legitimately
 * empty catalog and got cached for the full TTL with no fallback engaged.
 * loadSymbolsFromDatabase must treat both a reported read error and a
 * zero-row read as a database failure and serve the reviewed fallback.
 */

import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';

const mockGetOracleFeedsWithStatus = jest.fn();
const mockQueries = { getOracleFeedsWithStatus: mockGetOracleFeedsWithStatus };

jest.mock('@/lib/supabase/server', () => ({
  getAdminQueries: () => mockQueries,
}));

type FeedRow = {
  provider: string;
  symbol: string;
  is_active: boolean;
  category?: string | null;
};

const activeFeed = (overrides: Partial<FeedRow> = {}): FeedRow => ({
  provider: 'chainlink',
  symbol: 'BTC/USD',
  is_active: true,
  category: 'crypto',
  ...overrides,
});

async function loadFreshModule() {
  jest.resetModules();
  const symbolsModule = await import('../symbolsService');
  return symbolsModule.loadSymbolsFromDatabase;
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('builds the catalog from active feeds on a successful read', async () => {
  mockGetOracleFeedsWithStatus.mockResolvedValue({
    feeds: [
      activeFeed(),
      activeFeed({ provider: 'pyth', symbol: 'ETH' }),
      activeFeed({ provider: 'chainlink', symbol: 'ETH' }),
      // Inactive feeds are excluded by the query itself, but the service
      // also guards against them defensively.
      activeFeed({ provider: 'dia', symbol: 'SOL', is_active: false }),
    ],
    errored: false,
  });

  const load = await loadFreshModule();
  const data = await load();

  expect(data.symbols).toEqual(['BTC', 'ETH']);
  expect(data.oracleSymbols.chainlink).toEqual(['BTC', 'ETH']);
  expect(data.oracleSymbols.pyth).toEqual(['ETH']);
  expect(data.oracleSymbols.dia).toEqual([]);
  expect(data.categories.BTC).toBe('crypto');
});

it('falls back to the reviewed symbol list when the registry read reports an error', async () => {
  mockGetOracleFeedsWithStatus.mockResolvedValue({ feeds: [], errored: true });

  const load = await loadFreshModule();
  const data = await load();

  expect(data.symbols).toEqual(getAllSupportedSymbols());
  expect(data.symbols.length).toBeGreaterThan(0);
});

it('falls back to the reviewed symbol list when the registry read succeeds but is empty', async () => {
  // A successful read of zero rows is never a legitimate production state:
  // treating it as success would cache an empty catalog for the full TTL.
  mockGetOracleFeedsWithStatus.mockResolvedValue({ feeds: [], errored: false });

  const load = await loadFreshModule();
  const data = await load();

  expect(data.symbols).toEqual(getAllSupportedSymbols());
  expect(data.symbols.length).toBeGreaterThan(0);
});

it('does not cache the fallback: a later successful read rebuilds the catalog', async () => {
  mockGetOracleFeedsWithStatus.mockResolvedValueOnce({ feeds: [], errored: true });
  mockGetOracleFeedsWithStatus.mockResolvedValueOnce({
    feeds: [activeFeed()],
    errored: false,
  });

  const load = await loadFreshModule();

  const fallbackData = await load();
  expect(fallbackData.symbols).toEqual(getAllSupportedSymbols());

  const recoveredData = await load();
  expect(recoveredData.symbols).toEqual(['BTC']);
  expect(mockGetOracleFeedsWithStatus).toHaveBeenCalledTimes(2);
});
