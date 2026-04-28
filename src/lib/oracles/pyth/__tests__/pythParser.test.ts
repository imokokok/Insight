import { OracleProvider } from '@/types/oracle';

import {
  parsePythPrice,
  calculateConfidenceInterval,
  calculateConfidenceScore,
} from '../pythParser';

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

  describe('calculateConfidenceInterval', () => {
    it('should calculate bid and ask correctly', () => {
      const price = 100;
      const confidence = 2;

      const result = calculateConfidenceInterval(price, confidence);

      expect(result.bid).toBe(99);
      expect(result.ask).toBe(101);
    });

    it('should calculate width percentage correctly', () => {
      const price = 100;
      const confidence = 2;

      const result = calculateConfidenceInterval(price, confidence);

      expect(result.widthPercentage).toBe(2);
    });

    it('should handle zero price', () => {
      const result = calculateConfidenceInterval(0, 10);

      expect(result.bid).toBe(-5);
      expect(result.ask).toBe(5);
      expect(result.widthPercentage).toBe(0);
    });

    it('should handle small confidence values', () => {
      const price = 68000;
      const confidence = 0.01;

      const result = calculateConfidenceInterval(price, confidence);

      expect(result.bid).toBeCloseTo(67999.995, 5);
      expect(result.ask).toBeCloseTo(68000.005, 5);
    });

    it('should handle large confidence values', () => {
      const price = 100;
      const confidence = 50;

      const result = calculateConfidenceInterval(price, confidence);

      expect(result.bid).toBe(75);
      expect(result.ask).toBe(125);
      expect(result.widthPercentage).toBe(50);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should return high score for low confidence ratio', () => {
      const score = calculateConfidenceScore(0.01, 68000);

      expect(score).toBeGreaterThan(99);
    });

    it('should return low score for high confidence ratio', () => {
      const score = calculateConfidenceScore(100, 100);

      expect(score).toBeLessThan(50);
    });

    it('should return 0 for zero price', () => {
      const score = calculateConfidenceScore(10, 0);

      expect(score).toBe(0);
    });

    it('should clamp score between 0 and 100', () => {
      const veryHighScore = calculateConfidenceScore(0.0001, 100000);
      expect(veryHighScore).toBeLessThanOrEqual(100);

      const veryLowScore = calculateConfidenceScore(1000, 1);
      expect(veryLowScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle equal confidence and price', () => {
      const score = calculateConfidenceScore(100, 100);

      expect(score).toBe(0);
    });
  });
});
