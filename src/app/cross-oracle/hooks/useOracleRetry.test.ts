import { act, renderHook } from '@testing-library/react';

import { OracleProvider } from '@/types/oracle';

import { useOracleRetry } from './useOracleRetry';

describe('useOracleRetry', () => {
  it('keeps a replacement retry active while the aborted request settles', async () => {
    jest.useFakeTimers();
    try {
      let resolveFirst!: (value: null) => void;
      let resolveSecond!: (value: null) => void;
      const first = new Promise<null>((resolve) => {
        resolveFirst = resolve;
      });
      const second = new Promise<null>((resolve) => {
        resolveSecond = resolve;
      });
      const fetchSingleOracle = jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
      const selectedOracles = [OracleProvider.CHAINLINK];
      const { result } = renderHook(() =>
        useOracleRetry({
          selectedOracles,
          selectedSymbol: 'ETH',
          initialRetryConfig: { baseDelay: 0, maxDelay: 0 },
          fetchSingleOracle,
          onPriceDataUpdate: jest.fn(),
          onErrorUpdate: jest.fn(),
        })
      );

      let firstRetry!: Promise<void>;
      act(() => {
        firstRetry = result.current.retryOracle(OracleProvider.CHAINLINK);
      });
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      expect(fetchSingleOracle).toHaveBeenCalledTimes(1);

      let secondRetry!: Promise<void>;
      act(() => {
        secondRetry = result.current.retryOracle(OracleProvider.CHAINLINK);
      });
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      expect(fetchSingleOracle).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveFirst(null);
        await firstRetry;
      });
      expect(result.current.retryingOracles).toEqual([OracleProvider.CHAINLINK]);

      await act(async () => {
        resolveSecond(null);
        await secondRetry;
      });
      expect(result.current.retryingOracles).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });
});
