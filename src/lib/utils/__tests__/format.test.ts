import {
  addThousandSeparators,
  capitalize,
  formatConfidenceScore,
  formatDataAge,
  formatLargeNumber,
  formatNumberWithDecimals,
  formatOraclePrice,
  formatOracleTimestamp,
  formatPrice,
  formatPriceDiff,
  getNestedValue,
  truncateAddress,
} from '../format';

describe('formatNumberWithDecimals', () => {
  it('returns the em-dash sentinel for non-finite input', () => {
    expect(formatNumberWithDecimals(NaN, 2, 2)).toBe('—');
    expect(formatNumberWithDecimals(Infinity, 2, 2)).toBe('—');
  });

  it('trims trailing zeros down to the minimum decimal count', () => {
    expect(formatNumberWithDecimals(1234.5, 2, 2)).toBe('1,234.50');
    expect(formatNumberWithDecimals(5, 2, 4)).toBe('5.00');
  });

  it('preserves the negative sign', () => {
    expect(formatNumberWithDecimals(-5, 2, 4)).toBe('-5.00');
  });
});

describe('formatPrice', () => {
  it('renders zero and non-finite inputs as safe sentinels', () => {
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(NaN)).toBe('—');
    expect(formatPrice(Infinity)).toBe('—');
  });

  it('scales decimal precision with magnitude', () => {
    expect(formatPrice(1234.5)).toBe('$1,234.50');
    expect(formatPrice(0.5)).toBe('$0.5000');
  });

  it('keeps the sign on negative values', () => {
    expect(formatPrice(-5)).toContain('-5');
  });
});

describe('formatLargeNumber', () => {
  it('renders zero and non-finite inputs as safe sentinels', () => {
    expect(formatLargeNumber(0)).toBe('$0.00');
    expect(formatLargeNumber(NaN)).toBe('—');
  });

  it('uses compact K/M/B/T suffixes', () => {
    expect(formatLargeNumber(1500000000)).toBe('$1.50B');
    expect(formatLargeNumber(-2500)).toBe('-$2.50K');
  });
});

describe('formatPriceDiff', () => {
  it('renders zero as $0.00', () => {
    expect(formatPriceDiff(0)).toBe('$0.00');
  });

  it('prefixes the sign and a $', () => {
    expect(formatPriceDiff(1.5)).toMatch(/^\+\$/);
    expect(formatPriceDiff(-1.5)).toMatch(/^-\$/);
  });

  it('increases precision for large base prices', () => {
    expect(formatPriceDiff(1.5, 2000)).toBe('+$1.50');
  });
});

describe('formatDataAge', () => {
  it('returns a dash for nullish input', () => {
    expect(formatDataAge(null)).toBe('-');
    expect(formatDataAge(undefined)).toBe('-');
  });

  it('formats seconds and minutes', () => {
    expect(formatDataAge(30)).toBe('30s');
    expect(formatDataAge(90)).toBe('2m');
  });
});

describe('formatConfidenceScore', () => {
  it('returns a dash for nullish input', () => {
    expect(formatConfidenceScore(null)).toBe('-');
  });

  it('scales fractions to a percentage', () => {
    expect(formatConfidenceScore(0.95)).toBe('95%');
    expect(formatConfidenceScore(0.5, 1)).toBe('50.0%');
  });

  it('clamps whole numbers to 100%', () => {
    expect(formatConfidenceScore(150)).toBe('100%');
  });
});

describe('formatOraclePrice / formatOracleTimestamp', () => {
  it('treats nullish and zero as missing', () => {
    expect(formatOraclePrice(null)).toBe('-');
    expect(formatOraclePrice(0)).toBe('-');
    expect(formatOraclePrice(NaN)).toBe('-');
    expect(formatOracleTimestamp(null)).toBe('-');
  });

  it('formats a valid price', () => {
    expect(formatOraclePrice(1234.5)).toBe('$1,234.50');
  });

  it('formats a valid timestamp', () => {
    const out = formatOracleTimestamp(new Date(2021, 0, 1, 13, 5, 9).getTime());
    expect(typeof out).toBe('string');
    expect(out).not.toBe('-');
  });
});

describe('truncateAddress', () => {
  it('returns a dash for nullish input', () => {
    expect(truncateAddress(null)).toBe('-');
    expect(truncateAddress(undefined)).toBe('-');
  });

  it('returns the full string when it is shorter than head + tail', () => {
    expect(truncateAddress('0x12345')).toBe('0x12345');
  });

  it('truncates long addresses', () => {
    expect(truncateAddress('0x1234567890abcdef', 6, 4)).toBe('0x1234...cdef');
  });
});

describe('addThousandSeparators', () => {
  it('inserts commas into the integer part only', () => {
    expect(addThousandSeparators('1234567.89')).toBe('1,234,567.89');
    expect(addThousandSeparators('123')).toBe('123');
  });
});

describe('capitalize', () => {
  it('uppercases the first character', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('')).toBe('');
  });
});

describe('getNestedValue', () => {
  it('resolves a dotted path', () => {
    expect(getNestedValue({ a: { b: { c: 5 } } }, 'a.b.c')).toBe(5);
  });

  it('returns undefined for missing intermediate or leaf values', () => {
    expect(getNestedValue({ a: 1 }, 'a.b.c')).toBeUndefined();
    expect(getNestedValue(null, 'a')).toBeUndefined();
  });
});
