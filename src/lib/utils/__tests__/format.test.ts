import {
  formatCurrency,
  formatNumber,
  formatCompactNumber,
  formatCompactNumberV2,
} from '../format';

describe('Format Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency with default options', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe('$1,235');
    });

    it('should format currency in compact form', () => {
      const result = formatCurrency(1234567, true);
      expect(result).toBe('$1.23M');
    });

    it('should handle large numbers', () => {
      const result = formatCurrency(1000000000);
      expect(result).toBe('$1,000,000,000');
    });

    it('should handle small numbers', () => {
      const result = formatCurrency(0.99);
      expect(result).toBe('$1');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toBe('$0');
    });

    it('should handle negative numbers', () => {
      const result = formatCurrency(-1234);
      expect(result).toBe('-$1,234');
    });
  });

  describe('formatNumber', () => {
    it('should format number with default options', () => {
      const result = formatNumber(1234.56);
      expect(result).toBe('1,235');
    });

    it('should format number in compact form', () => {
      const result = formatNumber(1234567, true);
      expect(result).toBe('1.23M');
    });

    it('should handle large numbers', () => {
      const result = formatNumber(1000000000);
      expect(result).toBe('1,000,000,000');
    });

    it('should handle zero', () => {
      const result = formatNumber(0);
      expect(result).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234);
      expect(result).toBe('-1,234');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format billions', () => {
      const result = formatCompactNumber(1500000000);
      expect(result).toBe('1.50B');
    });

    it('should format millions', () => {
      const result = formatCompactNumber(1500000);
      expect(result).toBe('1.50M');
    });

    it('should format thousands', () => {
      const result = formatCompactNumber(1500);
      expect(result).toBe('1.50K');
    });

    it('should format small numbers', () => {
      const result = formatCompactNumber(999);
      expect(result).toBe('999');
    });

    it('should handle zero', () => {
      const result = formatCompactNumber(0);
      expect(result).toBe('0');
    });
  });

  describe('formatCompactNumberV2', () => {
    it('should format billions with default decimals', () => {
      const result = formatCompactNumberV2(1500000000);
      expect(result).toBe('1.5B');
    });

    it('should format millions with custom decimals', () => {
      const result = formatCompactNumberV2(1500000, 2);
      expect(result).toBe('1.50M');
    });

    it('should format thousands with custom decimals', () => {
      const result = formatCompactNumberV2(1500, 2);
      expect(result).toBe('1.50K');
    });

    it('should format small numbers', () => {
      const result = formatCompactNumberV2(999);
      expect(result).toBe('999');
    });

    it('should handle zero', () => {
      const result = formatCompactNumberV2(0);
      expect(result).toBe('0');
    });
  });
});
