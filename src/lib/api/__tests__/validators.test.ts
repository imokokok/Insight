import {
  required,
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isArray,
  isObject,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  isEmail,
  isUrl,
  isUuid,
  oneOf,
  isPositive,
  isNonNegative,
  chain,
  optional,
} from '../validation/validators';

describe('Validators', () => {
  describe('required', () => {
    it('should pass for non-empty values', () => {
      expect(required('test')).toEqual({ valid: true, value: 'test' });
      expect(required(123)).toEqual({ valid: true, value: 123 });
      expect(required(0)).toEqual({ valid: true, value: 0 });
      expect(required(false)).toEqual({ valid: true, value: false });
    });

    it('should fail for undefined', () => {
      const result = required(undefined);
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value is required');
    });

    it('should fail for null', () => {
      const result = required(null);
      expect(result.valid).toBe(false);
    });

    it('should fail for empty string', () => {
      const result = required('');
      expect(result.valid).toBe(false);
    });

    it('should use custom field name in error', () => {
      const result = required(undefined, 'email');
      expect(result.error?.message).toBe('email is required');
    });
  });

  describe('isString', () => {
    it('should pass for strings', () => {
      expect(isString('hello')).toEqual({ valid: true, value: 'hello' });
      expect(isString('')).toEqual({ valid: true, value: '' });
    });

    it('should fail for non-strings', () => {
      expect(isString(123).valid).toBe(false);
      expect(isString(true).valid).toBe(false);
      expect(isString(null).valid).toBe(false);
      expect(isString(undefined).valid).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should pass for valid numbers', () => {
      expect(isNumber(123)).toEqual({ valid: true, value: 123 });
      expect(isNumber(0)).toEqual({ valid: true, value: 0 });
      expect(isNumber(-5)).toEqual({ valid: true, value: -5 });
      expect(isNumber(3.14)).toEqual({ valid: true, value: 3.14 });
    });

    it('should fail for non-numbers', () => {
      expect(isNumber('123').valid).toBe(false);
      expect(isNumber(true).valid).toBe(false);
      expect(isNumber(null).valid).toBe(false);
    });

    it('should fail for Infinity', () => {
      expect(isNumber(Infinity).valid).toBe(false);
      expect(isNumber(-Infinity).valid).toBe(false);
    });

    it('should fail for NaN', () => {
      expect(isNumber(NaN).valid).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should pass for integers', () => {
      expect(isInteger(123)).toEqual({ valid: true, value: 123 });
      expect(isInteger(0)).toEqual({ valid: true, value: 0 });
      expect(isInteger(-5)).toEqual({ valid: true, value: -5 });
    });

    it('should fail for non-integers', () => {
      expect(isInteger(3.14).valid).toBe(false);
      expect(isInteger('123').valid).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should pass for booleans', () => {
      expect(isBoolean(true)).toEqual({ valid: true, value: true });
      expect(isBoolean(false)).toEqual({ valid: true, value: false });
    });

    it('should fail for non-booleans', () => {
      expect(isBoolean(1).valid).toBe(false);
      expect(isBoolean('true').valid).toBe(false);
      expect(isBoolean(0).valid).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should pass for arrays', () => {
      expect(isArray([1, 2, 3])).toEqual({ valid: true, value: [1, 2, 3] });
      expect(isArray([])).toEqual({ valid: true, value: [] });
    });

    it('should fail for non-arrays', () => {
      expect(isArray('array').valid).toBe(false);
      expect(isArray({}).valid).toBe(false);
      expect(isArray(null).valid).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should pass for plain objects', () => {
      expect(isObject({ a: 1 })).toEqual({ valid: true, value: { a: 1 } });
      expect(isObject({})).toEqual({ valid: true, value: {} });
    });

    it('should fail for arrays', () => {
      expect(isObject([1, 2]).valid).toBe(false);
    });

    it('should fail for null', () => {
      expect(isObject(null).valid).toBe(false);
    });

    it('should fail for non-objects', () => {
      expect(isObject('string').valid).toBe(false);
      expect(isObject(123).valid).toBe(false);
    });
  });

  describe('minLength', () => {
    it('should pass for strings with sufficient length', () => {
      expect(minLength(3)('hello')).toEqual({ valid: true, value: 'hello' });
      expect(minLength(3)('abc')).toEqual({ valid: true, value: 'abc' });
    });

    it('should pass for arrays with sufficient items', () => {
      expect(minLength(2)([1, 2, 3])).toEqual({ valid: true, value: [1, 2, 3] });
    });

    it('should fail for short strings', () => {
      const result = minLength(5)('hi');
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must be at least 5 characters');
    });

    it('should fail for arrays with too few items', () => {
      const result = minLength(3)([1]);
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must have at least 3 items');
    });

    it('should fail for non-string/non-array values', () => {
      expect(minLength(3)(123).valid).toBe(false);
      expect(minLength(3)(null).valid).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('should pass for strings within limit', () => {
      expect(maxLength(5)('hi')).toEqual({ valid: true, value: 'hi' });
      expect(maxLength(5)('hello')).toEqual({ valid: true, value: 'hello' });
    });

    it('should pass for arrays within limit', () => {
      expect(maxLength(3)([1])).toEqual({ valid: true, value: [1] });
    });

    it('should fail for long strings', () => {
      const result = maxLength(3)('hello');
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must be at most 3 characters');
    });

    it('should fail for arrays with too many items', () => {
      const result = maxLength(2)([1, 2, 3]);
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must have at most 2 items');
    });

    it('should fail for non-string/non-array values', () => {
      expect(maxLength(5)(123).valid).toBe(false);
    });
  });

  describe('min', () => {
    it('should pass for numbers >= min', () => {
      expect(min(0)(5)).toEqual({ valid: true, value: 5 });
      expect(min(0)(0)).toEqual({ valid: true, value: 0 });
    });

    it('should fail for numbers < min', () => {
      const result = min(10)(5);
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must be at least 10');
    });

    it('should fail for non-numbers', () => {
      expect(min(0)('5').valid).toBe(false);
      expect(min(0)(Infinity).valid).toBe(false);
    });
  });

  describe('max', () => {
    it('should pass for numbers <= max', () => {
      expect(max(10)(5)).toEqual({ valid: true, value: 5 });
      expect(max(10)(10)).toEqual({ valid: true, value: 10 });
    });

    it('should fail for numbers > max', () => {
      const result = max(5)(10);
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must be at most 5');
    });

    it('should fail for non-numbers', () => {
      expect(max(10)('5').valid).toBe(false);
      expect(max(10)(Infinity).valid).toBe(false);
    });
  });

  describe('pattern', () => {
    it('should pass for matching patterns', () => {
      const validator = pattern(/^[A-Z]+$/);
      expect(validator('ABC')).toEqual({ valid: true, value: 'ABC' });
    });

    it('should fail for non-matching patterns', () => {
      const validator = pattern(/^[A-Z]+$/);
      const result = validator('abc');
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value has invalid format');
    });

    it('should use custom error message', () => {
      const validator = pattern(/^[A-Z]+$/, 'Must be uppercase');
      const result = validator('abc');
      expect(result.error?.message).toBe('Must be uppercase');
    });

    it('should fail for non-strings', () => {
      const validator = pattern(/test/);
      expect(validator(123).valid).toBe(false);
    });
  });

  describe('isEmail', () => {
    it('should pass for valid emails', () => {
      expect(isEmail('test@example.com')).toEqual({
        valid: true,
        value: 'test@example.com',
      });
      expect(isEmail('user.name+tag@example.co.uk')).toEqual({
        valid: true,
        value: 'user.name+tag@example.co.uk',
      });
    });

    it('should fail for invalid emails', () => {
      expect(isEmail('invalid').valid).toBe(false);
      expect(isEmail('test@').valid).toBe(false);
      expect(isEmail('@example.com').valid).toBe(false);
      expect(isEmail('test@example').valid).toBe(false);
    });

    it('should fail for non-strings', () => {
      expect(isEmail(123).valid).toBe(false);
    });
  });

  describe('isUrl', () => {
    it('should pass for valid URLs', () => {
      expect(isUrl('https://example.com')).toEqual({
        valid: true,
        value: 'https://example.com',
      });
      expect(isUrl('http://localhost:3000/path?query=1')).toEqual({
        valid: true,
        value: 'http://localhost:3000/path?query=1',
      });
    });

    it('should fail for invalid URLs', () => {
      expect(isUrl('not-a-url').valid).toBe(false);
      expect(isUrl('example.com').valid).toBe(false);
    });

    it('should fail for non-strings', () => {
      expect(isUrl(123).valid).toBe(false);
    });
  });

  describe('isUuid', () => {
    it('should pass for valid UUIDs', () => {
      expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toEqual({
        valid: true,
        value: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toEqual({
        valid: true,
        value: '123e4567-e89b-42d3-a456-426614174000',
      });
    });

    it('should fail for invalid UUIDs', () => {
      expect(isUuid('not-a-uuid').valid).toBe(false);
      expect(isUuid('123e4567-e89b-12d3-a456').valid).toBe(false);
    });

    it('should fail for non-strings', () => {
      expect(isUuid(123).valid).toBe(false);
    });
  });

  describe('oneOf', () => {
    it('should pass for values in options', () => {
      const validator = oneOf(['a', 'b', 'c'] as const);
      expect(validator('a')).toEqual({ valid: true, value: 'a' });
      expect(validator('b')).toEqual({ valid: true, value: 'b' });
    });

    it('should fail for values not in options', () => {
      const validator = oneOf(['a', 'b', 'c'] as const);
      const result = validator('d');
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('value must be one of: a, b, c');
    });
  });

  describe('isPositive', () => {
    it('should pass for positive numbers', () => {
      expect(isPositive(1)).toEqual({ valid: true, value: 1 });
      expect(isPositive(0.1)).toEqual({ valid: true, value: 0.1 });
    });

    it('should fail for zero', () => {
      expect(isPositive(0).valid).toBe(false);
    });

    it('should fail for negative numbers', () => {
      expect(isPositive(-1).valid).toBe(false);
    });

    it('should fail for non-numbers', () => {
      expect(isPositive('1').valid).toBe(false);
    });
  });

  describe('isNonNegative', () => {
    it('should pass for non-negative numbers', () => {
      expect(isNonNegative(1)).toEqual({ valid: true, value: 1 });
      expect(isNonNegative(0)).toEqual({ valid: true, value: 0 });
    });

    it('should fail for negative numbers', () => {
      expect(isNonNegative(-1).valid).toBe(false);
    });

    it('should fail for non-numbers', () => {
      expect(isNonNegative('1').valid).toBe(false);
    });
  });

  describe('chain', () => {
    it('should pass through all validators', () => {
      const validator = chain(isString, minLength(3), maxLength(10));
      expect(validator('hello')).toEqual({ valid: true, value: 'hello' });
    });

    it('should fail on first failing validator', () => {
      const validator = chain(isString, minLength(5));
      const result = validator('hi');
      expect(result.valid).toBe(false);
    });

    it('should pass value through validators', () => {
      const transform = (v: unknown) => ({ valid: true, value: String(v).toUpperCase() });
      const validator = chain(isString, transform);
      expect(validator('hello')).toEqual({ valid: true, value: 'HELLO' });
    });
  });

  describe('optional', () => {
    it('should pass for undefined', () => {
      const validator = optional(isString);
      expect(validator(undefined)).toEqual({ valid: true, value: undefined });
    });

    it('should pass for null', () => {
      const validator = optional(isString);
      expect(validator(null)).toEqual({ valid: true, value: undefined });
    });

    it('should pass for empty string', () => {
      const validator = optional(isString);
      expect(validator('')).toEqual({ valid: true, value: undefined });
    });

    it('should apply validator for non-empty values', () => {
      const validator = optional(isString);
      expect(validator('hello')).toEqual({ valid: true, value: 'hello' });
    });

    it('should fail for invalid non-empty values', () => {
      const validator = optional(isString);
      expect(validator(123).valid).toBe(false);
    });
  });
});
