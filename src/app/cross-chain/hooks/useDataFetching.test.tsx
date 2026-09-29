import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useCrossChainDataStore } from '@/stores/crossChainDataStore';
import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { useCrossChainQueries } from './useCrossChainQueries';
import { useDataFetching } from './useDataFetching';

jest.mock('./useCrossChainQueries', () => ({ useCrossChainQueries: jest.fn() }));

const chains = [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM];

function price(chain: Blockchain, value: number): PriceData {
  return {
    provider: OracleProvider.CHAINLINK,
    symbol: 'ETH',
    chain,
    price: value,
    timestamp: Date.now(),
  };
}

describe('useDataFetching', () => {
  it('keeps the median-price chain recommendation after shared price sorting', async () => {
    const prices = [price(chains[0], 100), price(chains[1], 102), price(chains[2], 108)];
    jest.mocked(useCrossChainQueries).mockReturnValue({
      chainResults: Object.fromEntries(
        prices.map((item) => [item.chain, { price: item, isPriceLoading: false, priceError: null }])
      ),
      priceHistories: new Map(),
      isLoading: false,
      isFetching: false,
      errors: [],
      triggerForceRefresh: jest.fn(),
    });

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useDataFetching(OracleProvider.CHAINLINK, chains, {
          selectedSymbol: 'ETH',
          selectedTimeRange: 24,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(useCrossChainDataStore.getState().recommendedBaseChain).toBe(Blockchain.ARBITRUM);
    });
  });
});
