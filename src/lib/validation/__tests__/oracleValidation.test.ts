import { z } from 'zod';

import {
  validateOracleData,
  safeValidateOracleData,
  isValidOracleData,
  logValidationWarning,
} from '../oracleValidation';
import { ZodValidationError } from '../errors';

describe('validateOracleData', () => {
  const priceSchema = z.object({
    symbol: z.string().min(1),
    price: z.number().positive(),
    timestamp: z.number().int().positive(),
  });

  describe('valid data', () => {
    it('should return validated data for valid input', () => {
      const data = {
        symbol: 'BTC',
        price: 50000,
        timestamp: Date.now(),
      };

      const result = validateOracleData(priceSchema, data);

      expect(result).toEqual(data);
    });

    it('should strip unknown keys when schema uses strict mode', () => {
      const strictSchema = priceSchema.strict();
      const data = {
        symbol: 'ETH',
        price: 3000,
        timestamp: Date.now(),
        unknownKey: 'should fail',
      };

      expect(() => validateOracleData(strictSchema, data)).toThrow(ZodValidationError);
    });

    it('should pass with optional fields missing', () => {
      const schemaWithOptional = priceSchema.extend({
        provider: z.string().optional(),
      });

      const data = {
        symbol: 'BTC',
        price: 50000,
        timestamp: Date.now(),
      };

      const result = validateOracleData(schemaWithOptional, data);

      expect(result).toEqual(data);
    });
  });

  describe('invalid data', () => {
    it('should throw ZodValidationError for invalid symbol', () => {
      const data = {
        symbol: '',
        price: 50000,
        timestamp: Date.now(),
      };

      expect(() => validateOracleData(priceSchema, data)).toThrow(ZodValidationError);
    });

    it('should throw ZodValidationError for negative price', () => {
      const data = {
        symbol: 'BTC',
        price: -100,
        timestamp: Date.now(),
      };

      expect(() => validateOracleData(priceSchema, data)).toThrow(ZodValidationError);
    });

    it('should throw ZodValidationError for zero price', () => {
      const data = {
        symbol: 'BTC',
        price: 0,
        timestamp: Date.now(),
      };

      expect(() => validateOracleData(priceSchema, data)).toThrow(ZodValidationError);
    });

    it('should throw ZodValidationError for invalid timestamp', () => {
      const data = {
        symbol: 'BTC',
        price: 50000,
        timestamp: -1,
      };

      expect(() => validateOracleData(priceSchema, data)).toThrow(ZodValidationError);
    });

    it('should throw ZodValidationError for missing fields', () => {
      const data = {
        symbol: 'BTC',
      };

      expect(() => validateOracleData(priceSchema, data)).toThrow(ZodValidationError);
    });

    it('should throw ZodValidationError for wrong types', () => {
      const data = {
        symbol: 123,
        price: '50000',
        timestamp: 'now',
      };

      expect(() => validateOracleData(priceSchema, data)).toThrow(ZodValidationError);
    });

    it('should include context in error message', () => {
      const data = {
        symbol: '',
        price: 50000,
        timestamp: Date.now(),
      };

      try {
        validateOracleData(priceSchema, data, 'price-fetch');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodValidationError);
      }
    });
  });
});

describe('safeValidateOracleData', () => {
  const priceSchema = z.object({
    symbol: z.string().min(1),
    price: z.number().positive(),
    timestamp: z.number().int().positive(),
  });

  describe('valid data', () => {
    it('should return validated data for valid input', () => {
      const data = {
        symbol: 'BTC',
        price: 50000,
        timestamp: Date.now(),
      };

      const result = safeValidateOracleData(priceSchema, data);

      expect(result).toEqual(data);
    });
  });

  describe('invalid data', () => {
    it('should return null for invalid input', () => {
      const data = {
        symbol: '',
        price: 50000,
        timestamp: Date.now(),
      };

      const result = safeValidateOracleData(priceSchema, data);

      expect(result).toBeNull();
    });

    it('should return null for missing fields', () => {
      const data = {
        symbol: 'BTC',
      };

      const result = safeValidateOracleData(priceSchema, data);

      expect(result).toBeNull();
    });

    it('should return null for wrong types', () => {
      const data = {
        symbol: 123,
        price: 'invalid',
        timestamp: 'now',
      };

      const result = safeValidateOracleData(priceSchema, data);

      expect(result).toBeNull();
    });

    it('should handle null input', () => {
      const result = safeValidateOracleData(priceSchema, null);

      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = safeValidateOracleData(priceSchema, undefined);

      expect(result).toBeNull();
    });
  });
});

describe('isValidOracleData', () => {
  const priceSchema = z.object({
    symbol: z.string().min(1),
    price: z.number().positive(),
    timestamp: z.number().int().positive(),
  });

  it('should return true for valid data', () => {
    const data = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
    };

    expect(isValidOracleData(priceSchema, data)).toBe(true);
  });

  it('should return false for invalid symbol', () => {
    const data = {
      symbol: '',
      price: 50000,
      timestamp: Date.now(),
    };

    expect(isValidOracleData(priceSchema, data)).toBe(false);
  });

  it('should return false for negative price', () => {
    const data = {
      symbol: 'BTC',
      price: -100,
      timestamp: Date.now(),
    };

    expect(isValidOracleData(priceSchema, data)).toBe(false);
  });

  it('should return false for missing fields', () => {
    const data = {
      symbol: 'BTC',
    };

    expect(isValidOracleData(priceSchema, data)).toBe(false);
  });

  it('should return false for null input', () => {
    expect(isValidOracleData(priceSchema, null)).toBe(false);
  });

  it('should return false for undefined input', () => {
    expect(isValidOracleData(priceSchema, undefined)).toBe(false);
  });

  it('should return false for wrong types', () => {
    const data = {
      symbol: 123,
      price: '50000',
      timestamp: 'now',
    };

    expect(isValidOracleData(priceSchema, data)).toBe(false);
  });
});

describe('logValidationWarning', () => {
  it('should not throw when called', () => {
    expect(() =>
      logValidationWarning('chainlink', 'BTC', [
        { field: 'price', message: 'Price is stale' },
      ])
    ).not.toThrow();
  });

  it('should handle empty issues array', () => {
    expect(() => logValidationWarning('chainlink', 'BTC', [])).not.toThrow();
  });

  it('should handle multiple issues', () => {
    expect(() =>
      logValidationWarning('pyth', 'ETH', [
        { field: 'price', message: 'Price is stale' },
        { field: 'timestamp', message: 'Timestamp too old' },
        { field: 'confidence', message: 'Low confidence' },
      ])
    ).not.toThrow();
  });

  it('should handle different providers', () => {
    const providers = ['chainlink', 'pyth', 'api3', 'redstone', 'uma'];

    providers.forEach((provider) => {
      expect(() =>
        logValidationWarning(provider, 'BTC', [{ field: 'price', message: 'Issue' }])
      ).not.toThrow();
    });
  });

  it('should handle different symbols', () => {
    const symbols = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'];

    symbols.forEach((symbol) => {
      expect(() =>
        logValidationWarning('chainlink', symbol, [{ field: 'price', message: 'Issue' }])
      ).not.toThrow();
    });
  });
});

describe('integration with oracle schemas', () => {
  const oracleProviderEnum = z.enum([
    'chainlink',
    'uma',
    'pyth',
    'api3',
    'redstone',
    'dia',
    'winklink',
  ]);

  const blockchainEnum = z.enum([
    'ethereum',
    'arbitrum',
    'optimism',
    'polygon',
    'solana',
    'avalanche',
  ]);

  const priceDataSchema = z.object({
    symbol: z.string().min(1),
    price: z.number().positive(),
    timestamp: z.number().int().positive(),
    provider: oracleProviderEnum,
    chain: blockchainEnum.optional(),
    decimals: z.number().int().nonnegative().optional(),
    confidence: z.number().min(0).max(1).optional(),
  });

  it('should validate complete price data', () => {
    const data = {
      symbol: 'BTC',
      price: 50000.12345678,
      timestamp: Date.now(),
      provider: 'chainlink',
      chain: 'ethereum',
      decimals: 8,
      confidence: 0.95,
    };

    const result = validateOracleData(priceDataSchema, data);

    expect(result).toEqual(data);
  });

  it('should validate minimal price data', () => {
    const data = {
      symbol: 'ETH',
      price: 3000,
      timestamp: Date.now(),
      provider: 'pyth',
    };

    const result = validateOracleData(priceDataSchema, data);

    expect(result).toEqual(data);
  });

  it('should reject invalid provider', () => {
    const data = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
      provider: 'invalid_provider',
    };

    expect(() => validateOracleData(priceDataSchema, data)).toThrow(ZodValidationError);
  });

  it('should reject invalid chain', () => {
    const data = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
      provider: 'chainlink',
      chain: 'invalid_chain',
    };

    expect(() => validateOracleData(priceDataSchema, data)).toThrow(ZodValidationError);
  });

  it('should reject confidence outside range', () => {
    const data = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
      provider: 'chainlink',
      confidence: 1.5,
    };

    expect(() => validateOracleData(priceDataSchema, data)).toThrow(ZodValidationError);
  });

  it('should reject negative decimals', () => {
    const data = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
      provider: 'chainlink',
      decimals: -1,
    };

    expect(() => validateOracleData(priceDataSchema, data)).toThrow(ZodValidationError);
  });
});
