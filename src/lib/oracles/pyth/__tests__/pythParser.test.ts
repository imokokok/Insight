import { OracleProvider } from '@/types/oracle';

import {
  parsePythPrice,
  calculateConfidenceInterval,
  calculateConfidenceScore,
  parsePublishers,
  parsePublisherStatus,
  parseValidators,
} from '../pythParser';

import type { PythPriceRaw, PublisherData, ValidatorData } from '../types';

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

  describe('parsePublishers', () => {
    it('should parse array of publishers', () => {
      const data = [
        {
          id: 'pub1',
          name: 'Publisher One',
          publisher_key: 'key1',
          reliability: 0.95,
          latency: 100,
          status: 'active',
          submission_count: 1000,
          last_update: 1700000000,
          price_feeds: ['BTC/USD', 'ETH/USD'],
          total_submissions: 5000,
          average_latency: 95,
          accuracy: 0.98,
          stake: 10000,
        },
      ];

      const result = parsePublishers(data);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pub1');
      expect(result[0].name).toBe('Publisher One');
      expect(result[0].publisherKey).toBe('key1');
      expect(result[0].reliabilityScore).toBe(0.95);
      expect(result[0].status).toBe('active');
      expect(result[0].priceFeeds).toEqual(['BTC/USD', 'ETH/USD']);
    });

    it('should handle missing optional fields', () => {
      const data = [
        {
          publisher_key: 'key1',
        },
      ];

      const result = parsePublishers(data);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('key1');
      expect(result[0].name).toBe('key1');
      expect(result[0].reliabilityScore).toBe(0.95);
      expect(result[0].status).toBe('inactive');
    });

    it('should return empty array for non-array input', () => {
      expect(parsePublishers(null)).toEqual([]);
      expect(parsePublishers(undefined)).toEqual([]);
      expect(parsePublishers({})).toEqual([]);
      expect(parsePublishers('string')).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(parsePublishers([])).toEqual([]);
    });

    it('should use accuracy field as fallback for reliability', () => {
      const data = [
        {
          publisher_key: 'key1',
          accuracy: 0.9,
        },
      ];

      const result = parsePublishers(data);

      expect(result[0].reliabilityScore).toBe(0.9);
    });

    it('should handle invalid items in array', () => {
      const data = [null, undefined, 'string', { publisher_key: 'valid' }];

      const result = parsePublishers(data);

      expect(result).toHaveLength(1);
      expect(result[0].publisherKey).toBe('valid');
    });
  });

  describe('parsePublisherStatus', () => {
    it('should return active for active status', () => {
      expect(parsePublisherStatus('active')).toBe('active');
      expect(parsePublisherStatus('ACTIVE')).toBe('active');
      expect(parsePublisherStatus('online')).toBe('active');
      expect(parsePublisherStatus('ONLINE')).toBe('active');
    });

    it('should return degraded for degraded status', () => {
      expect(parsePublisherStatus('degraded')).toBe('degraded');
      expect(parsePublisherStatus('DEGRADED')).toBe('degraded');
      expect(parsePublisherStatus('warning')).toBe('degraded');
      expect(parsePublisherStatus('WARNING')).toBe('degraded');
    });

    it('should return inactive for other status', () => {
      expect(parsePublisherStatus('inactive')).toBe('inactive');
      expect(parsePublisherStatus('offline')).toBe('inactive');
      expect(parsePublisherStatus('unknown')).toBe('inactive');
      expect(parsePublisherStatus('')).toBe('inactive');
    });

    it('should return inactive for non-string input', () => {
      expect(parsePublisherStatus(null)).toBe('inactive');
      expect(parsePublisherStatus(undefined)).toBe('inactive');
      expect(parsePublisherStatus(123)).toBe('inactive');
      expect(parsePublisherStatus({})).toBe('inactive');
    });
  });

  describe('parseValidators', () => {
    it('should parse array of validators', () => {
      const data = [
        {
          id: 'val1',
          name: 'Validator One',
          validator_key: 'vkey1',
          reliability: 0.98,
          latency: 50,
          status: 'active',
          stake: 50000,
          region: 'us-east',
          uptime: 99.9,
          commission: 5,
          total_responses: 10000,
          rewards: 1000,
          performance: 0.99,
        },
      ];

      const result = parseValidators(data);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('val1');
      expect(result[0].name).toBe('Validator One');
      expect(result[0].reliabilityScore).toBe(0.98);
      expect(result[0].status).toBe('active');
      expect(result[0].staked).toBe(50000);
      expect(result[0].region).toBe('us-east');
    });

    it('should handle missing optional fields', () => {
      const data = [
        {
          validator_key: 'vkey1',
        },
      ];

      const result = parseValidators(data);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('vkey1');
      expect(result[0].name).toBe('vkey1');
      expect(result[0].reliabilityScore).toBe(0.95);
      expect(result[0].region).toBe('unknown');
    });

    it('should return empty array for non-array input', () => {
      expect(parseValidators(null)).toEqual([]);
      expect(parseValidators(undefined)).toEqual([]);
      expect(parseValidators({})).toEqual([]);
    });

    it('should use score field as fallback for reliability', () => {
      const data = [
        {
          validator_key: 'vkey1',
          score: 0.9,
        },
      ];

      const result = parseValidators(data);

      expect(result[0].reliabilityScore).toBe(0.9);
    });

    it('should use staked field as fallback for stake', () => {
      const data = [
        {
          validator_key: 'vkey1',
          staked: 25000,
        },
      ];

      const result = parseValidators(data);

      expect(result[0].stake).toBe(25000);
      expect(result[0].staked).toBe(25000);
    });
  });
});
