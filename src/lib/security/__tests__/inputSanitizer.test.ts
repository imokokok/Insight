import { describe, it, expect } from '@jest/globals';

import {
  sanitizeString,
  sanitizeObject,
  sanitizeArray,
  detectSqlInjection,
  validateInput,
  sanitizeSymbol,
  sanitizeProvider,
  sanitizeChain,
  sanitizeEmail,
  sanitizeUuid,
  detectXss,
} from '../inputSanitizer';

describe('inputSanitizer', () => {
  describe('sanitizeString', () => {
    it('should sanitize basic HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should handle plain text without modification', () => {
      const input = 'Hello World';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const result = sanitizeString(input);
      expect(result).not.toContain('\x00');
    });

    it('should trim whitespace when trim option is true', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should convert to lowercase when lowercase option is true', () => {
      const input = 'HELLO WORLD';
      const result = sanitizeString(input, { lowercase: true });
      expect(result).toBe('hello world');
    });

    it('should convert to uppercase when uppercase option is true', () => {
      const input = 'hello world';
      const result = sanitizeString(input, { uppercase: true });
      expect(result).toBe('HELLO WORLD');
    });

    it('should respect maxLength option', () => {
      const input = 'a'.repeat(100);
      const result = sanitizeString(input, { maxLength: 10 });
      expect(result.length).toBe(10);
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as unknown as string)).toBe('');
      expect(sanitizeString(undefined as unknown as string)).toBe('');
    });

    it('should normalize unicode when normalizeUnicode option is true', () => {
      const input = 'café';
      const result = sanitizeString(input);
      expect(result).toBe('café');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in an object', () => {
      const input = { name: '<script>alert(1)</script>', age: 25 };
      const result = sanitizeObject(input);
      expect((result as Record<string, unknown>).name).not.toContain('<script>');
      expect((result as Record<string, unknown>).age).toBe(25);
    });

    it('should handle nested objects', () => {
      const input = { user: { name: '<b>Test</b>' } };
      const result = sanitizeObject(input) as { user: { name: string } };
      expect(result.user.name).not.toContain('<b>');
    });

    it('should handle arrays in objects', () => {
      const input = { items: ['<script>x</script>', 'normal'] };
      const result = sanitizeObject(input) as { items: string[] };
      expect(result.items[0]).not.toContain('<script>');
      expect(result.items[1]).toBe('normal');
    });

    it('should return original object for non-object input', () => {
      expect(sanitizeObject(null as unknown as Record<string, unknown>)).toBeNull();
      expect(sanitizeObject('string' as unknown as Record<string, unknown>)).toBe('string');
    });
  });

  describe('sanitizeArray', () => {
    it('should sanitize all string values in an array', () => {
      const input = ['<script>x</script>', '<b>test</b>'];
      const result = sanitizeArray(input);
      expect(result[0]).not.toContain('<script>');
      expect(result[1]).not.toContain('<b>');
    });

    it('should return empty array for non-array input', () => {
      expect(sanitizeArray('not an array' as unknown as string[])).toEqual([]);
    });
  });

  describe('detectSqlInjection', () => {
    it('should detect SQL SELECT keyword', () => {
      expect(detectSqlInjection('SELECT')).toBe(true);
    });

    it('should detect comment patterns', () => {
      expect(detectSqlInjection('SELECT * FROM users -- comment')).toBe(true);
      expect(detectSqlInjection('SELECT * FROM users # comment')).toBe(true);
    });

    it('should not flag normal input', () => {
      expect(detectSqlInjection('Hello World')).toBe(false);
      expect(detectSqlInjection('User123')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(detectSqlInjection(null as unknown as string)).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should validate correct input', () => {
      const result = validateInput('Hello World');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello World');
    });

    it('should reject XSS attempts', () => {
      const result = validateInput('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject SQL injection attempts', () => {
      const result = validateInput('SELECT * FROM users');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should enforce minLength', () => {
      const result = validateInput('Hi', { minLength: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should enforce maxLength', () => {
      const result = validateInput('Hello World', { maxLength: 3 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no more than');
    });

    it('should enforce pattern', () => {
      const result = validateInput('abc', { pattern: /^\d+$/ });
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeSymbol', () => {
    it('should uppercase symbols', () => {
      expect(sanitizeSymbol('btc')).toBe('BTC');
      expect(sanitizeSymbol('eth')).toBe('ETH');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeSymbol('<script>alert(1)</script>')).toBe('');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeSymbol('BTC!@#$%^&*()')).toBe('BTC');
    });
  });

  describe('sanitizeProvider', () => {
    it('should accept valid providers', () => {
      expect(sanitizeProvider('chainlink')).toBe('chainlink');
      expect(sanitizeProvider('pyth')).toBe('pyth');
      expect(sanitizeProvider('api3')).toBe('api3');
      expect(sanitizeProvider('redstone')).toBe('redstone');
      expect(sanitizeProvider('dia')).toBe('dia');
      expect(sanitizeProvider('winklink')).toBe('winklink');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeProvider('CHAINLINK')).toBe('chainlink');
    });

    it('should return empty string for invalid providers', () => {
      expect(sanitizeProvider('invalid')).toBe('');
      expect(sanitizeProvider('')).toBe('');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeProvider('<script>x</script>chainlink')).toBe('chainlink');
    });
  });

  describe('sanitizeChain', () => {
    it('should accept valid chains', () => {
      expect(sanitizeChain('ethereum')).toBe('ethereum');
      expect(sanitizeChain('polygon')).toBe('polygon');
      expect(sanitizeChain('arbitrum')).toBe('arbitrum');
    });

    it('should return empty string for invalid chains', () => {
      expect(sanitizeChain('invalid')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate correct emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    });

    it('should return empty string for invalid emails', () => {
      expect(sanitizeEmail('invalid')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });
  });

  describe('sanitizeUuid', () => {
    it('should validate correct UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(sanitizeUuid(uuid)).toBe(uuid);
    });

    it('should return empty string for invalid UUIDs', () => {
      expect(sanitizeUuid('invalid')).toBe('');
      expect(sanitizeUuid('550e8400-e29b-41d4-a716')).toBe('');
    });
  });

  describe('detectXss', () => {
    it('should detect script tags', () => {
      expect(detectXss('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect javascript protocol', () => {
      expect(detectXss('javascript:alert(1)')).toBe(true);
    });

    it('should detect onload events', () => {
      expect(detectXss('<svg onload=alert(1)>')).toBe(true);
    });

    it('should detect img src XSS', () => {
      expect(detectXss('<img src=x onerror=alert(1)>')).toBe(true);
    });

    it('should detect iframe', () => {
      expect(detectXss('<iframe src="xss.html">')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(detectXss('Hello World')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(detectXss(null as unknown as string)).toBe(false);
    });
  });
});
