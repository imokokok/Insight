import { act, renderHook } from '@testing-library/react';

import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { useOraclePerformance } from './useOraclePerformance';

import type { PriceHistoryMap } from './useOracleMemory';

describe('useOraclePerformance', () => {
  it('records oracle publications once even when the same round is polled repeatedly', () => {
    const { result } = renderHook(() => useOraclePerformance({ enablePerformanceMetrics: true }));
    const historyRef = { current: new Map() as PriceHistoryMap };
    const mountedRef = { current: true };
    const timestamp = Date.now();
    const price: PriceData = {
      provider: OracleProvider.CHAINLINK,
      symbol: 'ETH',
      chain: Blockchain.ETHEREUM,
      price: 2_000,
      timestamp,
    };

    act(() => {
      result.current.recordSuccessfulFetch(
        OracleProvider.CHAINLINK,
        'ETH',
        price,
        100,
        historyRef,
        mountedRef
      );
      result.current.recordSuccessfulFetch(
        OracleProvider.CHAINLINK,
        'ETH',
        price,
        120,
        historyRef,
        mountedRef
      );
    });

    expect(historyRef.current.get(OracleProvider.CHAINLINK)).toHaveLength(1);

    act(() => {
      result.current.recordSuccessfulFetch(
        OracleProvider.CHAINLINK,
        'ETH',
        { ...price, timestamp: timestamp + 1_000 },
        90,
        historyRef,
        mountedRef
      );
    });

    expect(historyRef.current.get(OracleProvider.CHAINLINK)).toHaveLength(2);
  });
});
