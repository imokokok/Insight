import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';
import { createMockPriceData, createMockHistoricalPriceData, MOCK_PRICES } from '@/lib/oracles/__mocks__';

export const fixtures = {
  prices: {
    btc: (): PriceData => createMockPriceData('BTC', { price: MOCK_PRICES.BTC }),
    eth: (): PriceData => createMockPriceData('ETH', { price: MOCK_PRICES.ETH }),
    sol: (): PriceData => createMockPriceData('SOL', { price: MOCK_PRICES.SOL }),
    link: (): PriceData => createMockPriceData('LINK', { price: MOCK_PRICES.LINK }),
    usdc: (): PriceData => createMockPriceData('USDC', { price: 1 }),
    custom: (symbol: string, price: number): PriceData => createMockPriceData(symbol, { price }),
  },

  historicalPrices: {
    btc: (period: number = 24): PriceData[] =>
      createMockHistoricalPriceData('BTC', { period, basePrice: MOCK_PRICES.BTC }),
    eth: (period: number = 24): PriceData[] =>
      createMockHistoricalPriceData('ETH', { period, basePrice: MOCK_PRICES.ETH }),
    sol: (period: number = 24): PriceData[] =>
      createMockHistoricalPriceData('SOL', { period, basePrice: MOCK_PRICES.SOL }),
    custom: (symbol: string, basePrice: number, period: number = 24): PriceData[] =>
      createMockHistoricalPriceData(symbol, { period, basePrice }),
  },

  chains: {
    ethereum: Blockchain.ETHEREUM,
    polygon: Blockchain.POLYGON,
    arbitrum: Blockchain.ARBITRUM,
    optimism: Blockchain.OPTIMISM,
    solana: Blockchain.SOLANA,
    avalanche: Blockchain.AVALANCHE,
    base: Blockchain.BASE,
    bnbChain: Blockchain.BNB_CHAIN,
  },

  providers: {
    chainlink: OracleProvider.CHAINLINK,
    bandProtocol: OracleProvider.BAND_PROTOCOL,
    uma: OracleProvider.UMA,
    pyth: OracleProvider.PYTH,
    api3: OracleProvider.API3,
  },

  symbols: {
    btc: 'BTC',
    eth: 'ETH',
    sol: 'SOL',
    link: 'LINK',
    uni: 'UNI',
    usdc: 'USDC',
    usdt: 'USDT',
    dai: 'DAI',
  },

  timestamps: {
    now: (): number => Date.now(),
    oneHourAgo: (): number => Date.now() - 60 * 60 * 1000,
    oneDayAgo: (): number => Date.now() - 24 * 60 * 60 * 1000,
    oneWeekAgo: (): number => Date.now() - 7 * 24 * 60 * 60 * 1000,
    custom: (hoursAgo: number): number => Date.now() - hoursAgo * 60 * 60 * 1000,
  },

  priceScenarios: {
    increasing: (symbol: string, basePrice: number, points: number = 10): PriceData[] => {
      const prices: PriceData[] = [];
      const now = Date.now();
      const interval = 60 * 60 * 1000;

      for (let i = 0; i < points; i++) {
        const price = basePrice * (1 + 0.01 * i);
        prices.push(
          createMockPriceData(symbol, {
            price: Number(price.toFixed(4)),
            timestamp: now - (points - 1 - i) * interval,
          })
        );
      }

      return prices;
    },

    decreasing: (symbol: string, basePrice: number, points: number = 10): PriceData[] => {
      const prices: PriceData[] = [];
      const now = Date.now();
      const interval = 60 * 60 * 1000;

      for (let i = 0; i < points; i++) {
        const price = basePrice * (1 - 0.01 * i);
        prices.push(
          createMockPriceData(symbol, {
            price: Number(price.toFixed(4)),
            timestamp: now - (points - 1 - i) * interval,
          })
        );
      }

      return prices;
    },

    volatile: (symbol: string, basePrice: number, points: number = 10): PriceData[] => {
      const prices: PriceData[] = [];
      const now = Date.now();
      const interval = 60 * 60 * 1000;

      for (let i = 0; i < points; i++) {
        const volatility = (Math.random() - 0.5) * 0.1;
        const price = basePrice * (1 + volatility);
        prices.push(
          createMockPriceData(symbol, {
            price: Number(price.toFixed(4)),
            timestamp: now - (points - 1 - i) * interval,
          })
        );
      }

      return prices;
    },
  },
};

export type TestFixtures = typeof fixtures;
