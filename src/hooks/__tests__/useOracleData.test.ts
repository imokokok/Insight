/**
 * @fileoverview Tests for useOracleData hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceData, useHistoricalPrices } from '../useOracleData';
import { BaseOracleClient } from '@/lib/oracles/base';
import { PriceData, Blockchain } from '@/types/oracle';

class MockOracleClient extends BaseOracleClient {
  name = 'chainlink' as const;
  supportedChains = [Blockchain.ETHEREUM];

  private mockPrice: PriceData = {
    provider: 'chainlink',
    symbol: 'BTC',
    price: 68000,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.98,
  };

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    return { ...this.mockPrice, symbol, chain };
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]> {
    const prices: PriceData[] = [];
    for (let i = 0; i < (period || 24); i++) {
      prices.push({
        provider: 'chainlink',
        symbol,
        chain,
        price: 68000 + i * 100,
        timestamp: Date.now() - i * 3600000,
        decimals: 8,
        confidence: 0.98,
      });
    }
    return prices;
  }
}

describe('usePriceData', () => {
  let client: MockOracleClient;

  beforeEach(() => {
    client = new MockOracleClient();
  });

  it('should fetch price data successfully', async () => {
    const { result } = renderHook(() => usePriceData(client, { symbol: 'BTC' }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.price).not.toBeNull();
    expect(result.current.price?.symbol).toBe('BTC');
    expect(result.current.error).toBeNull();
  });

  it('should track previous price', async () => {
    const { result } = renderHook(() => usePriceData(client, { symbol: 'BTC' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstPrice = result.current.price?.price;

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.previousPrice).toBe(firstPrice);
  });

  it('should handle auto refresh', async () => {
    const { result } = renderHook(() =>
      usePriceData(client, {
        symbol: 'BTC',
        autoRefresh: true,
        refreshInterval: 1000,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).not.toBeNull();
  });

  it('should update lastUpdated timestamp after fetch', async () => {
    const { result } = renderHook(() => usePriceData(client, { symbol: 'BTC' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lastUpdated).not.toBeNull();
    const firstUpdate = result.current.lastUpdated;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await result.current.refetch();
    });

    expect(result.current.lastUpdated).toBeGreaterThan(firstUpdate!);
  });
});

describe('useHistoricalPrices', () => {
  let client: MockOracleClient;

  beforeEach(() => {
    client = new MockOracleClient();
  });

  it('should fetch historical prices successfully', async () => {
    const { result } = renderHook(() => useHistoricalPrices(client, { symbol: 'BTC', period: 24 }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prices).toHaveLength(24);
    expect(result.current.error).toBeNull();
  });

  it('should handle refetch', async () => {
    const { result } = renderHook(() => useHistoricalPrices(client, { symbol: 'BTC' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstUpdate = result.current.lastUpdated;

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.lastUpdated).toBeGreaterThan(firstUpdate!);
  });
});
