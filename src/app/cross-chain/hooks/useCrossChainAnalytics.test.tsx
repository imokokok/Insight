import { renderHook, waitFor } from '@testing-library/react';

import { Blockchain, OracleProvider, type PriceData } from '@/types/oracle';

import { useCrossChainAnalytics } from './useCrossChainAnalytics';

function price(chain: Blockchain, value: number, timestamp: number): PriceData {
  return {
    provider: OracleProvider.CHAINLINK,
    symbol: 'ETH',
    chain,
    price: value,
    timestamp,
    confidence: 0.99,
  };
}

describe('useCrossChainAnalytics', () => {
  it('uses historical entries and a current-price fallback across all three analyses', async () => {
    const timestamp = Date.now();
    const currentPrices = [
      price(Blockchain.ETHEREUM, 100, timestamp),
      price(Blockchain.ARBITRUM, 101, timestamp),
    ];
    const historicalPrices = new Map([
      [Blockchain.ETHEREUM, [price(Blockchain.ETHEREUM, 99, timestamp - 10_000), currentPrices[0]]],
    ]);

    const { result } = renderHook(() => useCrossChainAnalytics(currentPrices, historicalPrices));

    await waitFor(() => {
      expect(result.current.chainCount).toBe(2);
      expect(result.current.divergence.divergenceResult).not.toBeNull();
      expect(result.current.feed.feedBehaviorResult?.healthScores).toHaveLength(2);
    });
  });
});
