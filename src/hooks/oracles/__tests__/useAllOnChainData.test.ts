import { renderHook } from '@testing-library/react';

import { OracleProvider } from '@/types/oracle';

import { useAllOnChainData } from '../useAllOnChainData';

const mockQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueries: (options: unknown) => mockQueries(options),
}));

beforeEach(() =>
  mockQueries.mockReturnValue(Array.from({ length: 7 }, () => ({ data: null, isLoading: false })))
);

it('loads details only for the first result actually rendered by StatsCardsSelector', () => {
  renderHook(() =>
    useAllOnChainData({
      selectedOracle: null,
      selectedSymbol: 'ETH',
      selectedChain: null,
      queryResults: [{ provider: OracleProvider.DIA }, { provider: OracleProvider.SUPRA }],
    })
  );
  const queries = mockQueries.mock.calls[0][0].queries;
  expect(queries.filter((query: { enabled: boolean }) => query.enabled)).toHaveLength(1);
  expect(queries.find((query: { enabled: boolean }) => query.enabled).queryKey[1]).toBe(
    OracleProvider.DIA
  );
});

it.each([{ queryResults: [] }, { queryResults: [{ provider: OracleProvider.CHAINLINK }] }])(
  'avoids polling providers whose details are absent from the rendered result',
  ({ queryResults }) => {
    renderHook(() =>
      useAllOnChainData({
        selectedOracle: null,
        selectedSymbol: 'ETH',
        selectedChain: null,
        queryResults,
      })
    );
    expect(
      mockQueries.mock.calls[0][0].queries.every((query: { enabled: boolean }) => !query.enabled)
    ).toBe(true);
  }
);

it('does not launch details requests while the parent price query is loading', () => {
  renderHook(() =>
    useAllOnChainData({
      selectedOracle: null,
      selectedSymbol: 'ETH',
      selectedChain: null,
      queryResults: [{ provider: OracleProvider.DIA }],
      enabled: false,
    })
  );
  expect(
    mockQueries.mock.calls[0][0].queries.every((query: { enabled: boolean }) => !query.enabled)
  ).toBe(true);
});
