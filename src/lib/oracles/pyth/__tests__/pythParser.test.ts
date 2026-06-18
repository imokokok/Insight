import { OracleProvider } from '@/types/oracle';

import { parsePythPrice } from '../pythParser';

import type { PythPriceRaw } from '../types';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('pythParser', () => {
  describe('parsePythPrice', () => {
    it('should parse price with number values', () => {
      const pythPrice: PythPriceRaw = {
        price: 680000000000,
        conf: 100000000,
        expo: -8,
        publish_time: 1700000000,
      };

      const result = parsePythPrice(pythPrice, 'BTC');

      expect(result.provider).toBe(OracleProvider.PYTH);
      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(6800);
      expect(result.timestamp).toBe(1700000000000);
      expect(result.decimals).toBe(8);
      expect(result.confidence).toBeDefined();
      expect(result.confidenceInterval).toBeDefined();
    });

    it('should parse price with string values', () => {
      const pythPrice: PythPriceRaw = {
        price: '680000000000',
        conf: '100000000',
        expo: -8,
        publish_time: 1700000000,
      };

      const result = parsePythPrice(pythPrice, 'ETH');

      expect(result.price).toBe(6800);
      expect(result.symbol).toBe('ETH');
    });

    it('should handle missing confidence value', () => {
      const pythPrice: PythPriceRaw = {
        price: 350000000000,
        expo: -8,
        publish_time: 1700000000,
      };

      const result = parsePythPrice(pythPrice, 'ETH');

      expect(result.price).toBe(3500);
      expect(result.conf).toBe(0);
    });

    it('should handle missing exponent (default -8)', () => {
      const pythPrice: PythPriceRaw = {
        price: 100000000000,
        conf: 1000000,
        publish_time: 1700000000,
      };

      const result = parsePythPrice(pythPrice, 'SOL');

      expect(result.price).toBe(1000);
      expect(result.decimals).toBe(8);
    });

    it('should handle missing publish_time (use current time)', () => {
      const pythPrice: PythPriceRaw = {
        price: 50000000000,
        expo: -8,
      };

      const beforeTime = Date.now();
      const result = parsePythPrice(pythPrice, 'LINK');
      const afterTime = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include priceId when provided', () => {
      const pythPrice: PythPriceRaw = {
        price: 680000000000,
        expo: -8,
        publish_time: 1700000000,
      };

      const priceId = '0x123abc';
      const result = parsePythPrice(pythPrice, 'BTC', priceId);

      expect(result.priceId).toBe(priceId);
    });

    it('should convert symbol to uppercase', () => {
      const pythPrice: PythPriceRaw = {
        price: 100000000000,
        expo: -8,
      };

      const result = parsePythPrice(pythPrice, 'btc');

      expect(result.symbol).toBe('BTC');
    });

    it('should handle positive exponent', () => {
      const pythPrice: PythPriceRaw = {
        price: 68,
        expo: 2,
        conf: 1,
      };

      const result = parsePythPrice(pythPrice, 'BTC');

      expect(result.price).toBe(6800);
      expect(result.decimals).toBe(2);
    });

    it('should set default change24h values to 0', () => {
      const pythPrice: PythPriceRaw = {
        price: 680000000000,
        expo: -8,
      };

      const result = parsePythPrice(pythPrice, 'BTC');

      expect(result.change24h).toBe(0);
      expect(result.change24hPercent).toBe(0);
    });
  });
});
