import { isPythPriceRaw } from '../types';

describe('pyth types', () => {
  describe('isPythPriceRaw', () => {
    it('should return true for valid PythPriceRaw with number price', () => {
      const data = {
        price: 680000000000,
        conf: 100000000,
        expo: -8,
        publish_time: 1700000000,
      };

      expect(isPythPriceRaw(data)).toBe(true);
    });

    it('should return true for valid PythPriceRaw with string price', () => {
      const data = {
        price: '680000000000',
        conf: '100000000',
        expo: -8,
        publish_time: 1700000000,
      };

      expect(isPythPriceRaw(data)).toBe(true);
    });

    it('should return true for minimal valid PythPriceRaw', () => {
      const data = {
        price: 100,
      };

      expect(isPythPriceRaw(data)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isPythPriceRaw(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPythPriceRaw(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isPythPriceRaw('string')).toBe(false);
      expect(isPythPriceRaw(123)).toBe(false);
      expect(isPythPriceRaw(true)).toBe(false);
      expect(isPythPriceRaw([])).toBe(false);
    });

    it('should return false for object without price', () => {
      const data = {
        conf: 100,
        expo: -8,
      };

      expect(isPythPriceRaw(data)).toBe(false);
    });

    it('should return false for object with invalid price type', () => {
      const data = {
        price: {},
      };

      expect(isPythPriceRaw(data)).toBe(false);
    });

    it('should return false for object with boolean price', () => {
      const data = {
        price: true,
      };

      expect(isPythPriceRaw(data)).toBe(false);
    });

    it('should return false for object with null price', () => {
      const data = {
        price: null,
      };

      expect(isPythPriceRaw(data)).toBe(false);
    });

    it('should return false for object with undefined price', () => {
      const data = {
        price: undefined,
      };

      expect(isPythPriceRaw(data)).toBe(false);
    });

    it('should return false for object with array price', () => {
      const data = {
        price: [100],
      };

      expect(isPythPriceRaw(data)).toBe(false);
    });

    it('should handle zero price', () => {
      const data = {
        price: 0,
      };

      expect(isPythPriceRaw(data)).toBe(true);
    });

    it('should handle negative price', () => {
      const data = {
        price: -100,
      };

      expect(isPythPriceRaw(data)).toBe(true);
    });

    it('should handle empty string price', () => {
      const data = {
        price: '',
      };

      expect(isPythPriceRaw(data)).toBe(true);
    });
  });
});
