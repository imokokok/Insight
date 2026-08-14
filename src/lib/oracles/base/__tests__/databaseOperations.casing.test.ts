/**
 * Isolated regression test for symbol case-normalization in
 * fetchPriceWithDatabase / fetchHistoricalPricesWithDatabase.
 *
 * User-supplied pairs arrive in arbitrary case (e.g. "btc/usd" from API/MCP
 * callers). `baseSymbol` must be uppercased once so it matches the uppercase
 * feed registry; otherwise a valid lowercase symbol is wrongly rejected as
 * unsupported and its feed-health update silently no-ops.
 */
import { PriceFetchError } from '@/lib/errors';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

import { fetchPriceWithDatabase, fetchHistoricalPricesWithDatabase } from '../databaseOperations';

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
}));

const mockShouldUseDatabase = jest.fn();
const mockGetPriceFromDatabase = jest.fn();
const mockGetHistoricalPricesFromDatabase = jest.fn();

jest.mock('../../utils/storage', () => ({
  shouldUseDatabase: () => mockShouldUseDatabase(),
  getPriceFromDatabase: (...args: unknown[]) => mockGetPriceFromDatabase(...args),
  getHistoricalPricesFromDatabase: (...args: unknown[]) =>
    mockGetHistoricalPricesFromDatabase(...args),
  savePriceToDatabase: jest.fn().mockResolvedValue(true),
}));

const mockClientGetPrice = jest.fn();
const mockClientIsSymbolSupported = jest.fn(() => true);
const mockClientGetDefaultChain = jest.fn(() => 'ethereum' as Blockchain);
const mockGetClient = jest.fn();

// Keep the factory mock in sync with databaseOperations.test.ts: define the
// getDefaultFactory implementation inside the jest.mock factory (no const
// reference, which would hit a TDZ under jest's mock hoisting) and re-establish
// it in beforeEach because resetMocks:true clears jest.fn implementations.
jest.mock('@/lib/oracles/factory', () => ({
  getDefaultFactory: jest.fn(() => ({ getClient: mockGetClient })),
}));

const mockGetActiveFeedsMap = jest.fn();
const mockMatchesChainId = jest.fn();
jest.mock('../../utils/dynamicFeedResolver', () => ({
  getActiveFeedsMap: (...args: unknown[]) => mockGetActiveFeedsMap(...args),
  matchesChainId: (...args: unknown[]) => mockMatchesChainId(...args),
}));

const mockGetAdminQueries = jest.fn(() => ({
  updateFeedHealth: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/supabase/server', () => ({
  getAdminQueries: (...args: unknown[]) => mockGetAdminQueries(...args),
}));

describe('databaseOperations symbol case normalization', () => {
  const provider: OracleProvider = 'chainlink';
  const chain: Blockchain = 'ethereum';

  beforeEach(() => {
    jest.clearAllMocks();
    // resetMocks:true clears the jest.fn implementations registered in jest.mock
    // factories between tests, so re-establish them here (mirrors the pattern in
    // databaseOperations.test.ts).
    mockGetClient.mockReturnValue({
      getPrice: mockClientGetPrice,
      isSymbolSupported: mockClientIsSymbolSupported,
      getDefaultChain: mockClientGetDefaultChain,
    });
    (getDefaultFactory as jest.Mock).mockReturnValue({ getClient: mockGetClient });

    mockShouldUseDatabase.mockReturnValue(true);
    mockClientGetPrice.mockRejectedValue(new Error('Live fetch disabled in test'));
    mockClientIsSymbolSupported.mockReturnValue(true);
    mockClientGetDefaultChain.mockReturnValue(chain);
    mockMatchesChainId.mockReturnValue(true);
    mockGetActiveFeedsMap.mockResolvedValueOnce(
      new Map([['BTC/USD', { symbol: 'BTC/USD', chain_id: 1 } as unknown as never]])
    );
  });

  it('accepts a lowercase base symbol and normalizes it before the feed lookup', async () => {
    // No fresh DB row → falls through to the (disabled) live fetch → PriceFetchError,
    // not UnsupportedSymbolError. The real lock is that the *normalized* symbol
    // ('BTC') reaches the downstream DB lookup. Before the fix the un-normalized
    // 'btc' would be rejected as unsupported before any lookup occurred.
    mockGetPriceFromDatabase.mockResolvedValueOnce(null);

    await expect(fetchPriceWithDatabase(provider, 'btc/usd', chain, true)).rejects.toThrow(
      PriceFetchError
    );

    expect(mockGetPriceFromDatabase).toHaveBeenCalledWith(provider, 'BTC', chain);
  });

  it('leaves an already-uppercase symbol unchanged', async () => {
    mockGetPriceFromDatabase.mockResolvedValueOnce(null);

    await expect(fetchPriceWithDatabase(provider, 'BTC/USD', chain, true)).rejects.toThrow(
      PriceFetchError
    );

    expect(mockGetPriceFromDatabase).toHaveBeenCalledWith(provider, 'BTC', chain);
  });

  it('normalizes the symbol in the historical fetch path too', async () => {
    // A non-empty array lets the function return from the DB cache path; an empty
    // array would fall through to a live fetch.
    mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce([
      {
        provider,
        symbol: 'BTC',
        chain,
        price: 50000,
        timestamp: Date.now(),
        decimals: 8,
        confidence: 0.99,
        source: 'test',
      },
    ]);

    await fetchHistoricalPricesWithDatabase(provider, 'btc/usd', chain, 24, true);

    expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(provider, 'BTC', chain, 24);
  });
});
