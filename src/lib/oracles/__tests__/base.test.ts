import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { type PriceData, type OracleProvider, Blockchain } from '@/types/oracle';

import { BaseOracleClient, OracleErrorCodes } from '../base';

class TestOracleClient extends BaseOracleClient {
  name: OracleProvider = 'chainlink';
  supportedChains: Blockchain[] = [Blockchain.ETHEREUM, Blockchain.POLYGON];

  getSupportedSymbols(): string[] {
    return ['BTC', 'ETH', 'LINK'];
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const basePrice = UNIFIED_BASE_PRICES[symbol] || 100;
    return {
      provider: this.name,
      symbol,
      price: basePrice,
      timestamp: Date.now(),
      decimals: 8,
      confidence: 0.95,
      source: this.name,
      chain,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]> {
    const basePrice = UNIFIED_BASE_PRICES[symbol] || 100;
    const count = period || 24;
    const prices: PriceData[] = [];
    const now = Date.now();
    const hourMs = 3600000;

    for (let i = 0; i <= count; i++) {
      prices.push({
        provider: this.name,
        symbol,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.002),
        timestamp: now - (count - i) * hourMs,
        decimals: 8,
        confidence: 0.95,
        source: this.name,
        chain,
      });
    }
    return prices;
  }
}

describe('BaseOracleClient', () => {
  let client: TestOracleClient;

  beforeEach(() => {
    client = new TestOracleClient();
  });

  describe('createError', () => {
    it('should create error with message and provider', () => {
      const error = client['createError']('Test error');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('chainlink');
      expect(error.timestamp).toBeDefined();
    });

    it('should create error with code', () => {
      const error = client['createError']('Test error', OracleErrorCodes.NETWORK_ERROR);

      expect(error.code).toBe(OracleErrorCodes.NETWORK_ERROR);
    });

    it('should create error with retryable option', () => {
      const error = client['createError']('Test error', undefined, { retryable: true });

      expect(error.retryable).toBe(true);
    });

    it('should create error with details', () => {
      const details = { key: 'value' };
      const error = client['createError']('Test error', undefined, { details });

      expect(error.details).toEqual(details);
    });
  });

  describe('createUnsupportedSymbolError', () => {
    it('should create unsupported symbol error', () => {
      const error = client['createUnsupportedSymbolError']('DOGE');

      expect(error.code).toBe(OracleErrorCodes.SYMBOL_NOT_SUPPORTED);
      expect(error.message).toContain('DOGE');
      expect(error.details?.supportedSymbols).toEqual(['BTC', 'ETH', 'LINK']);
    });

    it('should include chain in error message when provided', () => {
      const error = client['createUnsupportedSymbolError']('DOGE', Blockchain.SOLANA);

      expect(error.message).toContain('SOLANA');
      expect(error.details?.chain).toBe(Blockchain.SOLANA);
    });
  });

  describe('createNoDataError', () => {
    it('should create no data error', () => {
      const error = client['createNoDataError']('BTC');

      expect(error.code).toBe(OracleErrorCodes.NO_DATA_AVAILABLE);
      expect(error.message).toContain('BTC');
      expect(error.retryable).toBe(true);
    });

    it('should include reason in error message when provided', () => {
      const error = client['createNoDataError']('BTC', undefined, 'API timeout');

      expect(error.message).toContain('API timeout');
      expect(error.details?.reason).toBe('API timeout');
    });
  });

  describe('createProviderError', () => {
    it('should create provider error', () => {
      const error = client['createProviderError']('Connection failed');

      expect(error.code).toBe(OracleErrorCodes.PROVIDER_UNAVAILABLE);
      expect(error.message).toContain('Connection failed');
      expect(error.retryable).toBe(true);
    });

    it('should include original error details', () => {
      const originalError = new Error('Network timeout');
      const error = client['createProviderError']('Connection failed', originalError);

      expect(error.details?.originalError).toBeDefined();
      expect((error.details?.originalError as Error).message).toBe('Network timeout');
    });

    it('should use custom error code when provided', () => {
      const error = client['createProviderError']('Rate limited', undefined, {
        code: OracleErrorCodes.RATE_LIMIT_ERROR,
      });

      expect(error.code).toBe(OracleErrorCodes.RATE_LIMIT_ERROR);
    });
  });

  describe('isSymbolSupported', () => {
    it('should return false for empty symbol', () => {
      expect(client.isSymbolSupported('')).toBe(false);
    });

    it('should check symbol in supported list', () => {
      expect(client.isSymbolSupported('BTC')).toBe(true);
      expect(client.isSymbolSupported('ETH')).toBe(true);
      expect(client.isSymbolSupported('LINK')).toBe(true);
      expect(client.isSymbolSupported('DOGE')).toBe(false);
    });

    it('should check chain support', () => {
      expect(client.isSymbolSupported('BTC', Blockchain.ETHEREUM)).toBe(true);
      expect(client.isSymbolSupported('BTC', Blockchain.SOLANA)).toBe(false);
    });
  });

  describe('getSupportedChainsForSymbol', () => {
    it('should return empty array for unsupported symbol', () => {
      expect(client.getSupportedChainsForSymbol('DOGE')).toEqual([]);
    });

    it('should return supported chains for valid symbol', () => {
      expect(client.getSupportedChainsForSymbol('BTC')).toEqual([
        Blockchain.ETHEREUM,
        Blockchain.POLYGON,
      ]);
    });
  });

  describe('getUpdateInterval', () => {
    it('should return default update interval', () => {
      expect(client.getUpdateInterval()).toBe(1);
    });

    it('should return chain-specific interval when set', () => {
      client.chainUpdateIntervals[Blockchain.ETHEREUM] = 5;
      expect(client.getUpdateInterval(Blockchain.ETHEREUM)).toBe(5);
    });

    it('should fall back to default when chain has no specific interval', () => {
      expect(client.getUpdateInterval(Blockchain.SOLANA)).toBe(1);
    });
  });

  describe('getPrice', () => {
    it('should return price data for supported symbol', async () => {
      const price = await client.getPrice('BTC');

      expect(price).toHaveProperty('provider', 'chainlink');
      expect(price).toHaveProperty('symbol', 'BTC');
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('timestamp');
      expect(price).toHaveProperty('decimals', 8);
      expect(price).toHaveProperty('confidence');
    });

    it('should include chain in price data when provided', async () => {
      const price = await client.getPrice('ETH', Blockchain.ETHEREUM);

      expect(price.chain).toBe(Blockchain.ETHEREUM);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return array of price data', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 24);

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBe(25);
    });

    it('should use default period of 24 when not specified', async () => {
      const prices = await client.getHistoricalPrices('ETH');

      expect(prices.length).toBe(25);
    });

    it('should generate prices in chronological order', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 10);

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });

    it('should generate prices with correct symbol', async () => {
      const prices = await client.getHistoricalPrices('ETH');

      prices.forEach((price) => {
        expect(price.symbol).toBe('ETH');
      });
    });

    it('should include chain in historical prices when provided', async () => {
      const prices = await client.getHistoricalPrices('BTC', Blockchain.POLYGON);

      prices.forEach((price) => {
        expect(price.chain).toBe(Blockchain.POLYGON);
      });
    });
  });

  describe('config', () => {
    it('should have default config values', () => {
      expect(client['config'].useDatabase).toBe(true);
      expect(client['config'].validateData).toBe(true);
    });

    it('should allow custom config values', () => {
      const customClient = new TestOracleClient({ useDatabase: false, validateData: false });
      expect(customClient['config'].useDatabase).toBe(false);
      expect(customClient['config'].validateData).toBe(false);
    });
  });
});
