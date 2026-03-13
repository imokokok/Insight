import { BaseOracleClient } from '../base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

class TestOracleClient extends BaseOracleClient {
  name: OracleProvider = 'chainlink';
  supportedChains: Blockchain[] = [Blockchain.ETHEREUM, Blockchain.POLYGON];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const basePrice = UNIFIED_BASE_PRICES[symbol] || 100;
    return this.generateMockPrice(symbol, basePrice, chain);
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]> {
    const basePrice = UNIFIED_BASE_PRICES[symbol] || 100;
    return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
  }
}

describe('BaseOracleClient', () => {
  let client: TestOracleClient;

  beforeEach(() => {
    client = new TestOracleClient();
  });

  describe('generateMockPrice', () => {
    it('should generate a price with correct structure', () => {
      const price = client['generateMockPrice']('BTC', 68000);

      expect(price).toHaveProperty('provider');
      expect(price).toHaveProperty('symbol', 'BTC');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
      expect(price).toHaveProperty('decimals', 8);
      expect(price).toHaveProperty('confidence');
    });

    it('should generate price within expected range', () => {
      const basePrice = 68000;
      const price = client['generateMockPrice']('BTC', basePrice);

      const maxDeviation = basePrice * 0.04;
      expect(price.price).toBeGreaterThan(basePrice - maxDeviation);
      expect(price.price).toBeLessThan(basePrice + maxDeviation);
    });

    it('should generate price with chain-specific volatility', () => {
      const ethPrice = client['generateMockPrice']('ETH', 3500, Blockchain.ETHEREUM);
      const solPrice = client['generateMockPrice']('SOL', 180, Blockchain.SOLANA);

      expect(ethPrice.chain).toBe(Blockchain.ETHEREUM);
      expect(solPrice.chain).toBe(Blockchain.SOLANA);
    });

    it('should use custom timestamp when provided', () => {
      const customTimestamp = 1234567890000;
      const price = client['generateMockPrice']('BTC', 68000, undefined, customTimestamp);

      expect(price.timestamp).toBe(customTimestamp);
    });
  });

  describe('generateMockHistoricalPrices', () => {
    it('should generate array of prices', () => {
      const prices = client['generateMockHistoricalPrices']('BTC', 68000, undefined, 24);

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBe(96);
    });

    it('should generate prices in chronological order', () => {
      const prices = client['generateMockHistoricalPrices']('BTC', 68000, undefined, 24);

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });

    it('should generate prices with correct symbol', () => {
      const prices = client['generateMockHistoricalPrices']('ETH', 3500);

      prices.forEach((price) => {
        expect(price.symbol).toBe('ETH');
      });
    });
  });

  describe('createError', () => {
    it('should create error with message and provider', () => {
      const error = client['createError']('Test error');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('chainlink');
    });

    it('should create error with optional code', () => {
      const error = client['createError']('Test error', 'ERR001');

      expect(error.code).toBe('ERR001');
    });
  });

  describe('UNIFIED_BASE_PRICES', () => {
    it('should contain common cryptocurrency prices', () => {
      expect(UNIFIED_BASE_PRICES).toHaveProperty('BTC');
      expect(UNIFIED_BASE_PRICES).toHaveProperty('ETH');
      expect(UNIFIED_BASE_PRICES).toHaveProperty('SOL');
    });

    it('should have stablecoin prices set to 1', () => {
      expect(UNIFIED_BASE_PRICES.USDC).toBe(1);
      expect(UNIFIED_BASE_PRICES.DAI).toBe(1);
    });
  });
});
