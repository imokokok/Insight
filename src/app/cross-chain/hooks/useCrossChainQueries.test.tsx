import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { oracleApiClient } from '@/lib/api/oracleApiClient';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { useCrossChainQueries } from './useCrossChainQueries';

jest.mock('@/lib/api/oracleApiClient', () => ({
  oracleApiClient: {
    fetchBatchPrices: jest.fn(),
    fetchHistorical: jest.fn(),
  },
}));

const mockedBatch = oracleApiClient.fetchBatchPrices as jest.MockedFunction<
  typeof oracleApiClient.fetchBatchPrices
>;
const mockedHistorical = oracleApiClient.fetchHistorical as jest.MockedFunction<
  typeof oracleApiClient.fetchHistorical
>;

const currentPrice: PriceData = {
  provider: OracleProvider.CHAINLINK,
  symbol: 'ETH',
  chain: Blockchain.ETHEREUM,
  price: 2_000,
  timestamp: Date.now(),
};

describe('useCrossChainQueries', () => {
  it('fetches and exposes history for the selected time range', async () => {
    mockedBatch.mockResolvedValue({
      prices: new Map([[Blockchain.ETHEREUM, currentPrice]]),
      errors: [],
    });
    mockedHistorical.mockResolvedValue([currentPrice]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useCrossChainQueries(OracleProvider.CHAINLINK, 'ETH', [Blockchain.ETHEREUM], 168),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.priceHistories.get(Blockchain.ETHEREUM)).toEqual([currentPrice]);
    });
    expect(mockedHistorical).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: OracleProvider.CHAINLINK,
        symbol: 'ETH',
        chain: Blockchain.ETHEREUM,
        period: 168,
      })
    );
  });

  it('surfaces per-chain batch failures without discarding successful chains', async () => {
    mockedBatch.mockResolvedValue({
      prices: new Map([[Blockchain.ETHEREUM, currentPrice]]),
      errors: [{ chain: Blockchain.ARBITRUM, error: 'upstream unavailable' }],
    });
    mockedHistorical.mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useCrossChainQueries(
          OracleProvider.CHAINLINK,
          'ETH',
          [Blockchain.ETHEREUM, Blockchain.ARBITRUM],
          24
        ),
      { wrapper }
    );

    await waitFor(() => expect(result.current.errors).toHaveLength(1));
    expect(result.current.chainResults[Blockchain.ETHEREUM]?.price).toEqual(currentPrice);
    expect(result.current.chainResults[Blockchain.ARBITRUM]?.priceError?.message).toBe(
      'upstream unavailable'
    );
  });
});
