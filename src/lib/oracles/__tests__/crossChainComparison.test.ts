import { buildCrossChainComparisonFromPrices } from '@/lib/oracles/crossChainComparison';
import { Blockchain } from '@/types/oracle';

describe('buildCrossChainComparisonFromPrices', () => {
  it('uses the selected asset category thresholds', () => {
    const now = Date.now();
    const prices = [
      { chain: Blockchain.ETHEREUM, price: 1, timestamp: now },
      { chain: Blockchain.ARBITRUM, price: 1.005, timestamp: now },
    ];

    const stablecoin = buildCrossChainComparisonFromPrices(prices, 'USDC');
    const alt = buildCrossChainComparisonFromPrices(prices, 'LINK');

    expect(stablecoin.map((item) => item.status)).toEqual(['degraded', 'degraded']);
    expect(alt.map((item) => item.status)).toEqual(['online', 'online']);
  });

  it('prefers an explicit oracle age and clamps future timestamps', () => {
    const now = Date.now();
    const results = buildCrossChainComparisonFromPrices(
      [
        {
          chain: Blockchain.ETHEREUM,
          price: 100,
          timestamp: now,
          dataAgeSeconds: 400,
        },
        {
          chain: Blockchain.ARBITRUM,
          price: 100,
          timestamp: now + 60_000,
        },
      ],
      'ETH'
    );

    expect(results[0]).toMatchObject({ latency: 400, status: 'offline' });
    expect(results[1]).toMatchObject({ latency: 0, status: 'online' });
  });
});
