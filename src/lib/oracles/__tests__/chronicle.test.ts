import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { Blockchain } from '@/types/oracle';

import { ChronicleClient } from '../chronicle';

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

describe('ChronicleClient', () => {
  let client: ChronicleClient;

  beforeEach(() => {
    client = new ChronicleClient();
    jest.clearAllMocks();
  });

  it('should initialize with correct provider name', () => {
    expect(client.name).toBe('chronicle');
  });

  it('should support Ethereum and L2 networks', () => {
    expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
    expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
    expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
    expect(client.supportedChains).toContain(Blockchain.BASE);
  });

  describe('getPrice', () => {
    it('should return valid price data', async () => {
      const price = await client.getPrice('ETH');
      expect(price).toHaveProperty('provider', 'chronicle');
      expect(price).toHaveProperty('symbol', 'ETH');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
    });

    it('should handle chain parameter', async () => {
      const price = await client.getPrice('ETH', Blockchain.ETHEREUM);
      expect(price.chain).toBe(Blockchain.ETHEREUM);
    });

    it('should return price near base price', async () => {
      const price = await client.getPrice('BTC');
      const basePrice = UNIFIED_BASE_PRICES['BTC'];
      const deviation = Math.abs(price.price - basePrice) / basePrice;
      expect(deviation).toBeLessThan(0.05);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return array of prices', async () => {
      const prices = await client.getHistoricalPrices('ETH', undefined, 24);
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('should return prices in chronological order', async () => {
      const prices = await client.getHistoricalPrices('ETH', undefined, 10);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });
  });
});
