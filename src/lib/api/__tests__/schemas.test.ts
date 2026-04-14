import {
  validateObject,
  commonSchemas,
  createStringSchema,
  createNumberSchema,
  createEnumSchema,
  createPaginationSchema,
  symbolSchema,
  providerSchema,
  chainSchema,
  periodSchema,
} from '../validation/schemas';

describe('validateObject', () => {
  describe('basic validation', () => {
    it('should validate a simple object', () => {
      const schema = {
        name: { validators: [], required: true },
      };

      const result = validateObject({ name: 'test' }, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
    });

    it('should fail for missing required fields', () => {
      const schema = {
        name: { validators: [], required: true },
      };

      const result = validateObject({}, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['name is required']);
    });

    it('should pass for missing optional fields', () => {
      const schema = {
        name: { validators: [], required: false },
      };

      const result = validateObject({}, schema);

      expect(result.isValid).toBe(true);
    });

    it('should handle null values', () => {
      const schema = {
        name: { validators: [], required: true },
      };

      const result = validateObject({ name: null }, schema);

      expect(result.isValid).toBe(false);
    });
  });

  describe('with validators', () => {
    it('should run validators and fail on invalid data', () => {
      const { isString } = require('../validation/validators');
      const schema = {
        age: { validators: [isString], required: true },
      };

      const result = validateObject({ age: 25 }, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]).toContain('must be a string');
    });

    it('should run validators and pass on valid data', () => {
      const { isString } = require('../validation/validators');
      const schema = {
        name: { validators: [isString], required: true },
      };

      const result = validateObject({ name: 'test' }, schema);

      expect(result.isValid).toBe(true);
    });
  });

  describe('with transform', () => {
    it('should transform values before validation', () => {
      const schema = {
        count: {
          validators: [],
          required: false,
          transform: (v: unknown) => Number(v),
        },
      };

      const result = validateObject({ count: '5' }, schema);

      expect(result.isValid).toBe(true);
      expect(result.data?.count).toBe(5);
    });
  });

  describe('multiple fields', () => {
    it('should validate multiple fields', () => {
      const { isString, isNumber } = require('../validation/validators');
      const schema = {
        name: { validators: [isString], required: true },
        age: { validators: [isNumber], required: true },
      };

      const result = validateObject({ name: 'John', age: 25 }, schema);

      expect(result.isValid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const { isString, isNumber } = require('../validation/validators');
      const schema = {
        name: { validators: [isString], required: true },
        age: { validators: [isNumber], required: true },
      };

      const result = validateObject({ name: 123, age: 'not a number' }, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors?.length).toBe(2);
    });
  });
});

describe('commonSchemas', () => {
  describe('id', () => {
    it('should validate a valid id', () => {
      const result = validateObject({ id: 'test-123' }, { id: commonSchemas.id });
      expect(result.isValid).toBe(true);
    });

    it('should fail for empty id', () => {
      const result = validateObject({ id: '' }, { id: commonSchemas.id });
      expect(result.isValid).toBe(false);
    });
  });

  describe('uuid', () => {
    it('should validate a valid UUID', () => {
      const result = validateObject(
        { uuid: '123e4567-e89b-12d3-a456-426614174000' },
        { uuid: commonSchemas.uuid }
      );
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid UUID', () => {
      const result = validateObject({ uuid: 'not-a-uuid' }, { uuid: commonSchemas.uuid });
      expect(result.isValid).toBe(false);
    });
  });

  describe('email', () => {
    it('should validate a valid email', () => {
      const result = validateObject({ email: 'test@example.com' }, { email: commonSchemas.email });
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid email', () => {
      const result = validateObject({ email: 'invalid' }, { email: commonSchemas.email });
      expect(result.isValid).toBe(false);
    });
  });

  describe('url', () => {
    it('should validate a valid URL', () => {
      const result = validateObject({ url: 'https://example.com' }, { url: commonSchemas.url });
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid URL', () => {
      const result = validateObject({ url: 'not-a-url' }, { url: commonSchemas.url });
      expect(result.isValid).toBe(false);
    });
  });

  describe('positiveInteger', () => {
    it('should validate a positive integer', () => {
      const result = validateObject({ num: 5 }, { num: commonSchemas.positiveInteger });
      expect(result.isValid).toBe(true);
    });

    it('should fail for zero', () => {
      const result = validateObject({ num: 0 }, { num: commonSchemas.positiveInteger });
      expect(result.isValid).toBe(false);
    });

    it('should fail for negative', () => {
      const result = validateObject({ num: -5 }, { num: commonSchemas.positiveInteger });
      expect(result.isValid).toBe(false);
    });

    it('should fail for non-integer', () => {
      const result = validateObject({ num: 3.14 }, { num: commonSchemas.positiveInteger });
      expect(result.isValid).toBe(false);
    });
  });

  describe('positiveNumber', () => {
    it('should validate a positive number', () => {
      const result = validateObject({ num: 3.14 }, { num: commonSchemas.positiveNumber });
      expect(result.isValid).toBe(true);
    });

    it('should fail for zero', () => {
      const result = validateObject({ num: 0 }, { num: commonSchemas.positiveNumber });
      expect(result.isValid).toBe(false);
    });
  });

  describe('nonEmptyString', () => {
    it('should validate a non-empty string', () => {
      const result = validateObject({ str: 'hello' }, { str: commonSchemas.nonEmptyString });
      expect(result.isValid).toBe(true);
    });

    it('should fail for empty string', () => {
      const result = validateObject({ str: '' }, { str: commonSchemas.nonEmptyString });
      expect(result.isValid).toBe(false);
    });
  });

  describe('page', () => {
    it('should use default value when undefined', () => {
      const result = validateObject({}, { page: commonSchemas.page });
      expect(result.isValid).toBe(true);
      expect(result.data?.page).toBe(1);
    });

    it('should validate valid page number', () => {
      const result = validateObject({ page: 5 }, { page: commonSchemas.page });
      expect(result.isValid).toBe(true);
      expect(result.data?.page).toBe(5);
    });

    it('should fail for page < 1', () => {
      const result = validateObject({ page: 0 }, { page: commonSchemas.page });
      expect(result.isValid).toBe(false);
    });
  });

  describe('limit', () => {
    it('should use default value when undefined', () => {
      const result = validateObject({}, { limit: commonSchemas.limit });
      expect(result.isValid).toBe(true);
      expect(result.data?.limit).toBe(20);
    });

    it('should validate valid limit', () => {
      const result = validateObject({ limit: 50 }, { limit: commonSchemas.limit });
      expect(result.isValid).toBe(true);
      expect(result.data?.limit).toBe(50);
    });

    it('should fail for limit > 100', () => {
      const result = validateObject({ limit: 150 }, { limit: commonSchemas.limit });
      expect(result.isValid).toBe(false);
    });
  });
});

describe('createStringSchema', () => {
  it('should create a basic string schema', () => {
    const schema = createStringSchema();
    const result = validateObject({ field: 'test' }, { field: schema });
    expect(result.isValid).toBe(true);
  });

  it('should enforce minLength', () => {
    const schema = createStringSchema({ minLength: 5 });
    const result = validateObject({ field: 'hi' }, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should enforce maxLength', () => {
    const schema = createStringSchema({ maxLength: 5 });
    const result = validateObject({ field: 'too long string' }, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should enforce pattern', () => {
    const schema = createStringSchema({ pattern: /^[A-Z]+$/ });
    const result = validateObject({ field: 'abc' }, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should be required by default', () => {
    const schema = createStringSchema();
    const result = validateObject({}, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should support optional', () => {
    const schema = createStringSchema({ required: false });
    const result = validateObject({}, { field: schema });
    expect(result.isValid).toBe(true);
  });
});

describe('createNumberSchema', () => {
  it('should create a basic number schema', () => {
    const schema = createNumberSchema();
    const result = validateObject({ field: 42 }, { field: schema });
    expect(result.isValid).toBe(true);
  });

  it('should enforce min', () => {
    const schema = createNumberSchema({ min: 10 });
    const result = validateObject({ field: 5 }, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should enforce max', () => {
    const schema = createNumberSchema({ max: 10 });
    const result = validateObject({ field: 15 }, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should enforce integer', () => {
    const schema = createNumberSchema({ integer: true });
    const result = validateObject({ field: 3.14 }, { field: schema });
    expect(result.isValid).toBe(false);
  });
});

describe('createEnumSchema', () => {
  it('should validate values in enum', () => {
    const schema = createEnumSchema(['a', 'b', 'c'] as const);
    expect(validateObject({ field: 'a' }, { field: schema }).isValid).toBe(true);
    expect(validateObject({ field: 'b' }, { field: schema }).isValid).toBe(true);
  });

  it('should fail for values not in enum', () => {
    const schema = createEnumSchema(['a', 'b', 'c'] as const);
    const result = validateObject({ field: 'd' }, { field: schema });
    expect(result.isValid).toBe(false);
  });

  it('should respect required option', () => {
    const schema = createEnumSchema(['a', 'b'] as const, false);
    const result = validateObject({}, { field: schema });
    expect(result.isValid).toBe(true);
  });
});

describe('createPaginationSchema', () => {
  it('should validate pagination params with defaults', () => {
    const schema = createPaginationSchema();
    const result = validateObject({}, schema);
    expect(result.isValid).toBe(true);
    expect(result.data?.page).toBe(1);
    expect(result.data?.limit).toBe(20);
  });

  it('should validate custom pagination params', () => {
    const schema = createPaginationSchema();
    const result = validateObject({ page: 2, limit: 50 }, schema);
    expect(result.isValid).toBe(true);
    expect(result.data?.page).toBe(2);
    expect(result.data?.limit).toBe(50);
  });
});

describe('symbolSchema', () => {
  it('should validate valid symbols', () => {
    const result = validateObject({ symbol: 'BTC/USD' }, { symbol: symbolSchema });
    expect(result.isValid).toBe(true);
  });

  it('should fail for invalid symbol format', () => {
    const result = validateObject({ symbol: 'BTCUSD' }, { symbol: symbolSchema });
    expect(result.isValid).toBe(false);
  });

  it('should fail for too long symbols', () => {
    const result = validateObject(
      { symbol: 'VERYLONGSYMBOL/ANOTHERLONG' },
      { symbol: symbolSchema }
    );
    expect(result.isValid).toBe(false);
  });
});

describe('providerSchema', () => {
  it('should validate valid providers', () => {
    const validProviders = ['chainlink', 'uma', 'api3', 'pyth'];
    validProviders.forEach((provider) => {
      const result = validateObject({ provider }, { provider: providerSchema });
      expect(result.isValid).toBe(true);
    });
  });

  it('should fail for invalid provider', () => {
    const result = validateObject({ provider: 'invalid' }, { provider: providerSchema });
    expect(result.isValid).toBe(false);
  });
});

describe('chainSchema', () => {
  it('should validate valid chains', () => {
    const validChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'];
    validChains.forEach((chain) => {
      const result = validateObject({ chain }, { chain: chainSchema });
      expect(result.isValid).toBe(true);
    });
  });

  it('should fail for invalid chain', () => {
    const result = validateObject({ chain: 'invalid' }, { chain: chainSchema });
    expect(result.isValid).toBe(false);
  });
});

describe('periodSchema', () => {
  it('should validate valid periods', () => {
    const result = validateObject({ period: 30 }, { period: periodSchema });
    expect(result.isValid).toBe(true);
  });

  it('should fail for period > 365', () => {
    const result = validateObject({ period: 400 }, { period: periodSchema });
    expect(result.isValid).toBe(false);
  });

  it('should fail for period < 1', () => {
    const result = validateObject({ period: 0 }, { period: periodSchema });
    expect(result.isValid).toBe(false);
  });

  it('should be optional', () => {
    const result = validateObject({}, { period: periodSchema });
    expect(result.isValid).toBe(true);
  });
});
