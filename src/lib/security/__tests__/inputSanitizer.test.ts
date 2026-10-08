/**
 * Unit tests for the security input sanitizers.
 *
 * Locked behaviors (2026-10-08 trade-scenario testnet findings):
 *  - sanitizeSymbol must REJECT path-traversal attempts ('..' sequences) by
 *    returning '' — otherwise strings like '../../etc/passwd' survive the
 *    charset whitelist ('/' is intentionally allowed for BTC/USD pairs) and
 *    reach the business layer as a "valid" unknown asset.
 *  - sanitizeProvider / sanitizeChain must return '' for unknown values, NOT
 *    throw: they run inside zod transforms, and a thrown generic Error escapes
 *    the validation middleware as an unhandled 500 instead of a clean 400.
 */
import { sanitizeChain, sanitizeProvider, sanitizeSymbol } from '../inputSanitizer';

describe('sanitizeSymbol — path-traversal guard', () => {
  it('rejects a plain path-traversal attempt (returns empty string)', () => {
    expect(sanitizeSymbol('../../etc/passwd')).toBe('');
  });

  it('rejects traversal dressed with pair notation', () => {
    expect(sanitizeSymbol('..//..//etc')).toBe('');
  });

  it('keeps legitimate pair notation without dot-dot', () => {
    expect(sanitizeSymbol('btc/usd')).toBe('BTC/USD');
  });

  it('keeps legitimate tickers untouched', () => {
    expect(sanitizeSymbol(' eth ')).toBe('ETH');
    expect(sanitizeSymbol('wbtc')).toBe('WBTC');
  });
});

describe('sanitizeProvider — no-throw contract inside zod transforms', () => {
  it('returns empty string for an unknown provider (no throw)', () => {
    expect(() => sanitizeProvider('fakeoracle')).not.toThrow();
    expect(sanitizeProvider('fakeoracle')).toBe('');
  });

  it('still accepts a valid provider (lowercased)', () => {
    expect(sanitizeProvider('Chainlink')).toBe('chainlink');
  });
});

describe('sanitizeChain — no-throw contract inside zod transforms', () => {
  it('returns empty string for an unknown chain (no throw)', () => {
    expect(() => sanitizeChain('chainspace-9')).not.toThrow();
    expect(sanitizeChain('chainspace-9')).toBe('');
  });
});
