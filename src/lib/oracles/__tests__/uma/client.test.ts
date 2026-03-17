import { UMAClient } from '../../uma/client';
import { Blockchain } from '@/types/oracle';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data) => ({ json: () => Promise.resolve(data) })),
  },
}));

jest.mock('../../storage', () => ({
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

describe('UMAClient', () => {
  let client: UMAClient;

  beforeEach(() => {
    client = new UMAClient();
    jest.clearAllMocks();
  });

  it('should initialize with correct provider name', () => {
    expect(client.name).toBe('uma');
  });

  it('should support multiple chains', () => {
    expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
    expect(client.supportedChains).toContain(Blockchain.POLYGON);
    expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
    expect(client.supportedChains).toContain(Blockchain.OPTIMISM);
    expect(client.supportedChains).toContain(Blockchain.BASE);
  });

  describe('getPrice', () => {
    it('should return valid price data', async () => {
      const price = await client.getPrice('BTC');
      expect(price).toHaveProperty('provider', 'uma');
      expect(price).toHaveProperty('symbol', 'BTC');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
    });

    it('should handle chain parameter', async () => {
      const price = await client.getPrice('ETH', Blockchain.ETHEREUM);
      expect(price.chain).toBe(Blockchain.ETHEREUM);
    });

    it('should return price near base price', async () => {
      const price = await client.getPrice('ETH');
      const basePrice = UNIFIED_BASE_PRICES['ETH'];
      const deviation = Math.abs(price.price - basePrice) / basePrice;
      expect(deviation).toBeLessThan(0.05);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return array of prices', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 24);
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe('getValidators', () => {
    it('should return array of validators', async () => {
      const validators = await client.getValidators();
      expect(Array.isArray(validators)).toBe(true);
      expect(validators.length).toBeGreaterThan(0);
    });

    it('should have valid validator structure', async () => {
      const validators = await client.getValidators();
      validators.forEach((validator) => {
        expect(validator).toHaveProperty('id');
        expect(validator).toHaveProperty('name');
        expect(validator).toHaveProperty('staked');
        expect(validator).toHaveProperty('successRate');
      });
    });
  });
});
