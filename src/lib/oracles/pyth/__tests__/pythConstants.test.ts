import {
  normalizeSymbol,
  getPriceIdForSymbol,
  getSymbolFromPriceId,
} from '../../constants/pythConstants';

describe('pythConstants', () => {
  describe('normalizeSymbol', () => {
    it('should normalize symbol to uppercase with /USD suffix', () => {
      expect(normalizeSymbol('btc')).toBe('BTC/USD');
      expect(normalizeSymbol('eth')).toBe('ETH/USD');
    });

    it('should handle symbol already with /USD suffix', () => {
      expect(normalizeSymbol('BTC/USD')).toBe('BTC/USD');
      expect(normalizeSymbol('btc/usd')).toBe('BTC/USD');
    });

    it('should handle mixed case', () => {
      expect(normalizeSymbol('Btc')).toBe('BTC/USD');
      expect(normalizeSymbol('EtH')).toBe('ETH/USD');
    });
  });

  describe('getPriceIdForSymbol', () => {
    it('should return price ID for known symbol', () => {
      const btcId = getPriceIdForSymbol('BTC');
      expect(btcId).toBeDefined();
      expect(typeof btcId).toBe('string');
    });

    it('should return price ID for symbol with /USD suffix', () => {
      const btcId = getPriceIdForSymbol('BTC/USD');
      expect(btcId).toBeDefined();
    });

    it('should return undefined for unknown symbol', () => {
      const unknownId = getPriceIdForSymbol('UNKNOWN');
      expect(unknownId).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const btcLower = getPriceIdForSymbol('btc');
      const btcUpper = getPriceIdForSymbol('BTC');
      expect(btcLower).toBe(btcUpper);
    });
  });

  describe('getSymbolFromPriceId', () => {
    it('should return symbol for known price ID', () => {
      const btcId = getPriceIdForSymbol('BTC');
      if (btcId) {
        const symbol = getSymbolFromPriceId(btcId);
        expect(symbol).toBe('BTC/USD');
      }
    });

    it('should return null for unknown price ID', () => {
      const symbol = getSymbolFromPriceId('0xunknown');
      expect(symbol).toBeNull();
    });

    it('should return null for empty string', () => {
      const symbol = getSymbolFromPriceId('');
      expect(symbol).toBeNull();
    });
  });
});
