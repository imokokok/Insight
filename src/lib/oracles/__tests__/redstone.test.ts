import { RedStoneClient } from '../redstone';
import { Blockchain } from '@/types/oracle';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data) => ({ json: () => Promise.resolve(data) })),
  },
}));

jest.mock('../storage', () => ({
  shouldUseDatabase: jest.fn(),
  savePriceToDatabase: jest.fn(),
  savePricesToDatabase: jest.fn(),
  getPriceFromDatabase: jest.fn(),
  getHistoricalPricesFromDatabase: jest.fn(),
  configureStorage: jest.fn(),
  getStorageConfig: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  getServerQueries: jest.fn(),
}));

describe('RedStoneClient', () => {
  let client: RedStoneClient;

  beforeEach(() => {
    client = new RedStoneClient();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct provider name', () => {
      expect(client.name).toBe('redstone');
    });

    it('should initialize with default config', () => {
      const defaultClient = new RedStoneClient();
      expect(defaultClient.name).toBe('redstone');
    });

    it('should initialize with custom config', () => {
      const customClient = new RedStoneClient({
        timeout: 5000,
        retries: 3,
      });
      expect(customClient.name).toBe('redstone');
    });
  });

  describe('supported chains', () => {
    it('should support Ethereum', () => {
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
    });

    it('should support Arbitrum', () => {
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
    });

    it('should support Optimism', () => {
      expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
    });

    it('should support Polygon', () => {
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
    });

    it('should support Avalanche', () => {
      expect(client.supportedChains).toContain(Blockchain.AVALANCHE);
    });

    it('should support Base', () => {
      expect(client.supportedChains).toContain(Blockchain.BASE);
    });

    it('should support BNB Chain', () => {
      expect(client.supportedChains).toContain(Blockchain.BNB_CHAIN);
    });

    it('should support multiple L2 networks', () => {
      const l2Networks = [
        Blockchain.ARBITRUM,
        Blockchain.OPTIMISM,
        Blockchain.BASE,
        Blockchain.LINEA,
        Blockchain.MANTLE,
        Blockchain.SCROLL,
        Blockchain.ZKSYNC,
      ];
      l2Networks.forEach((chain) => {
        expect(client.supportedChains).toContain(chain);
      });
    });
  });

  describe('getPrice', () => {
    it('should return valid price data for BTC', async () => {
      const price = await client.getPrice('BTC');

      expect(price).toHaveProperty('provider', 'redstone');
      expect(price).toHaveProperty('symbol', 'BTC');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
      expect(price).toHaveProperty('decimals', 8);
      expect(price).toHaveProperty('confidence');
      expect(price).toHaveProperty('confidenceInterval');
    });

    it('should return valid price data for ETH', async () => {
      const price = await client.getPrice('ETH');

      expect(price.symbol).toBe('ETH');
      expect(price.price).toBeGreaterThan(0);
      expect(price.confidenceInterval).toBeDefined();
    });

    it('should include confidence interval with bid/ask', async () => {
      const price = await client.getPrice('BTC');

      expect(price.confidenceInterval).toHaveProperty('bid');
      expect(price.confidenceInterval).toHaveProperty('ask');
      expect(price.confidenceInterval).toHaveProperty('widthPercentage');
      expect(price.confidenceInterval!.bid).toBeLessThan(price.price);
      expect(price.confidenceInterval!.ask).toBeGreaterThan(price.price);
    });

    it('should handle different spread percentages for different symbols', async () => {
      const btcPrice = await client.getPrice('BTC');
      const ethPrice = await client.getPrice('ETH');
      const solPrice = await client.getPrice('SOL');

      expect(btcPrice.confidenceInterval!.widthPercentage).toBeLessThan(
        solPrice.confidenceInterval!.widthPercentage
      );
    });

    it('should return price near base price for BTC', async () => {
      const price = await client.getPrice('BTC');
      const basePrice = UNIFIED_BASE_PRICES['BTC'];

      const deviation = Math.abs(price.price - basePrice) / basePrice;
      expect(deviation).toBeLessThan(0.05);
    });

    it('should handle chain parameter', async () => {
      const price = await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(price.chain).toBe(Blockchain.ETHEREUM);
      expect(price.symbol).toBe('ETH');
    });

    it('should handle unknown symbols with default price', async () => {
      const price = await client.getPrice('UNKNOWN');

      expect(price.symbol).toBe('UNKNOWN');
      expect(price.price).toBeGreaterThan(0);
    });

    it('should generate consistent confidence intervals', async () => {
      const price1 = await client.getPrice('BTC');
      const price2 = await client.getPrice('BTC');

      expect(price1.confidenceInterval).toBeDefined();
      expect(price2.confidenceInterval).toBeDefined();
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return array of price data', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 24);

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('should return prices in chronological order', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 24);

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });

    it('should include all required fields in historical prices', async () => {
      const prices = await client.getHistoricalPrices('ETH', undefined, 10);

      prices.forEach((price) => {
        expect(price).toHaveProperty('provider', 'redstone');
        expect(price).toHaveProperty('symbol', 'ETH');
        expect(price).toHaveProperty('price');
        expect(price).toHaveProperty('timestamp');
      });
    });

    it('should handle chain parameter', async () => {
      const prices = await client.getHistoricalPrices('BTC', Blockchain.ARBITRUM, 12);

      expect(prices.length).toBeGreaterThan(0);
      prices.forEach((price) => {
        expect(price.chain).toBe(Blockchain.ARBITRUM);
      });
    });

    it('should handle custom period', async () => {
      const period = 48;
      const prices = await client.getHistoricalPrices('BTC', undefined, period);

      expect(prices.length).toBeGreaterThanOrEqual(period * 4);
    });
  });

  describe('getRedStoneMetrics', () => {
    it('should return metrics object', async () => {
      const metrics = await client.getRedStoneMetrics();

      expect(metrics).toHaveProperty('modularFee');
      expect(metrics).toHaveProperty('dataFreshnessScore');
      expect(metrics).toHaveProperty('providerCount');
      expect(metrics).toHaveProperty('avgProviderReputation');
    });

    it('should have valid metric ranges', async () => {
      const metrics = await client.getRedStoneMetrics();

      expect(metrics.modularFee).toBeGreaterThan(0);
      expect(metrics.modularFee).toBeLessThan(0.001);
      expect(metrics.dataFreshnessScore).toBeGreaterThanOrEqual(95);
      expect(metrics.dataFreshnessScore).toBeLessThanOrEqual(100);
      expect(metrics.providerCount).toBeGreaterThanOrEqual(15);
      expect(metrics.avgProviderReputation).toBeGreaterThanOrEqual(0.85);
      expect(metrics.avgProviderReputation).toBeLessThanOrEqual(1);
    });
  });

  describe('getDataProviders', () => {
    it('should return array of providers', async () => {
      const providers = await client.getDataProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include RedStone Core provider', async () => {
      const providers = await client.getDataProviders();
      const redstoneCore = providers.find((p) => p.name === 'RedStone Core');

      expect(redstoneCore).toBeDefined();
      expect(redstoneCore!.reputation).toBeGreaterThan(0.95);
    });

    it('should have valid provider structure', async () => {
      const providers = await client.getDataProviders();

      providers.forEach((provider) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('reputation');
        expect(provider).toHaveProperty('dataPoints');
        expect(provider).toHaveProperty('lastUpdate');
        expect(provider.reputation).toBeGreaterThan(0);
        expect(provider.reputation).toBeLessThanOrEqual(1);
      });
    });

    it('should have providers sorted by reputation', async () => {
      const providers = await client.getDataProviders();

      for (let i = 1; i < providers.length; i++) {
        expect(providers[i - 1].reputation).toBeGreaterThanOrEqual(providers[i].reputation);
      }
    });
  });

  describe('error handling', () => {
    it('should handle empty symbol gracefully', async () => {
      const price = await client.getPrice('');
      expect(price).toBeDefined();
      expect(price.symbol).toBe('');
    });

    it('should handle special characters in symbol', async () => {
      const price = await client.getPrice('BTC-USD');
      expect(price.symbol).toBe('BTC-USD');
    });
  });

  describe('UNIFIED_BASE_PRICES integration', () => {
    it('should use correct base price for BTC', async () => {
      const price = await client.getPrice('BTC');
      const basePrice = UNIFIED_BASE_PRICES['BTC'];

      expect(basePrice).toBeGreaterThan(60000);
      expect(price.price).toBeGreaterThan(basePrice * 0.9);
      expect(price.price).toBeLessThan(basePrice * 1.1);
    });

    it('should use correct base price for stablecoins', async () => {
      const price = await client.getPrice('USDC');
      const basePrice = UNIFIED_BASE_PRICES['USDC'];

      expect(basePrice).toBe(1);
      expect(price.price).toBeGreaterThan(0.95);
      expect(price.price).toBeLessThan(1.05);
    });
  });
});
