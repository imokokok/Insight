import { WINkLinkClient } from '../winklink';
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

describe('WINkLinkClient', () => {
  let client: WINkLinkClient;

  beforeEach(() => {
    client = new WINkLinkClient();
    jest.clearAllMocks();
  });

  it('should initialize with correct provider name', () => {
    expect(client.name).toBe('winklink');
  });

  it('should support TRON and BNB Chain', () => {
    expect(client.supportedChains).toContain(Blockchain.TRON);
    expect(client.supportedChains).toContain(Blockchain.BNB_CHAIN);
  });

  describe('getPrice', () => {
    it('should return valid price data', async () => {
      const price = await client.getPrice('TRX');
      expect(price).toHaveProperty('provider', 'winklink');
      expect(price).toHaveProperty('symbol', 'TRX');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
    });

    it('should handle TRON chain parameter', async () => {
      const price = await client.getPrice('TRX', Blockchain.TRON);
      expect(price.chain).toBe(Blockchain.TRON);
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
      const prices = await client.getHistoricalPrices('TRX', undefined, 24);
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    it('should return prices in chronological order', async () => {
      const prices = await client.getHistoricalPrices('TRX', undefined, 10);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });
  });
});
