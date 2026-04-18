import {
  isOracleProvider,
  isBlockchain,
  isDataStatus,
  isTrendDirection,
  isPublisherStatus,
  isRiskLevel,
  isPriceData,
  isPriceDataArray,
  isApiError,
  isApiResponse,
  isPaginatedResponse,
  assertIsOracleProvider,
  assertIsBlockchain,
  assertIsPriceData,
  assertIsApiResponse,
  hasProperty,
  hasProperties,
} from '../guards';

describe('guards', () => {
  describe('isOracleProvider', () => {
    it('shouldforeffective OracleProvider return true', () => {
      expect(isOracleProvider('chainlink')).toBe(true);
      expect(isOracleProvider('uma')).toBe(true);
      expect(isOracleProvider('pyth')).toBe(true);
      expect(isOracleProvider('api3')).toBe(true);
      expect(isOracleProvider('redstone')).toBe(true);
      expect(isOracleProvider('dia')).toBe(true);
      expect(isOracleProvider('winklink')).toBe(true);
    });

    it('shouldforinvalid OracleProvider return false', () => {
      expect(isOracleProvider('invalid')).toBe(false);
      expect(isOracleProvider('')).toBe(false);
      expect(isOracleProvider(123)).toBe(false);
      expect(isOracleProvider(null)).toBe(false);
      expect(isOracleProvider(undefined)).toBe(false);
    });
  });

  describe('isBlockchain', () => {
    it('shouldforeffective Blockchain return true', () => {
      expect(isBlockchain('ethereum')).toBe(true);
      expect(isBlockchain('arbitrum')).toBe(true);
      expect(isBlockchain('optimism')).toBe(true);
      expect(isBlockchain('polygon')).toBe(true);
      expect(isBlockchain('solana')).toBe(true);
    });

    it('shouldforinvalid Blockchain return false', () => {
      expect(isBlockchain('invalid')).toBe(false);
      expect(isBlockchain('')).toBe(false);
      expect(isBlockchain(123)).toBe(false);
      expect(isBlockchain(null)).toBe(false);
    });
  });

  describe('isDataStatus', () => {
    it('shouldforeffective DataStatus return true', () => {
      expect(isDataStatus('normal')).toBe(true);
      expect(isDataStatus('warning')).toBe(true);
      expect(isDataStatus('critical')).toBe(true);
      expect(isDataStatus('stale')).toBe(true);
    });

    it('shouldforinvalid DataStatus return false', () => {
      expect(isDataStatus('invalid')).toBe(false);
      expect(isDataStatus('')).toBe(false);
      expect(isDataStatus(123)).toBe(false);
    });
  });

  describe('isTrendDirection', () => {
    it('shouldforeffective TrendDirection return true', () => {
      expect(isTrendDirection('up')).toBe(true);
      expect(isTrendDirection('down')).toBe(true);
      expect(isTrendDirection('stable')).toBe(true);
    });

    it('shouldforinvalid TrendDirection return false', () => {
      expect(isTrendDirection('invalid')).toBe(false);
      expect(isTrendDirection('')).toBe(false);
    });
  });

  describe('isPublisherStatus', () => {
    it('shouldforeffective PublisherStatus return true', () => {
      expect(isPublisherStatus('active')).toBe(true);
      expect(isPublisherStatus('inactive')).toBe(true);
      expect(isPublisherStatus('degraded')).toBe(true);
    });

    it('shouldforinvalid PublisherStatus return false', () => {
      expect(isPublisherStatus('invalid')).toBe(false);
      expect(isPublisherStatus('')).toBe(false);
    });
  });

  describe('isRiskLevel', () => {
    it('shouldforeffective RiskLevel return true', () => {
      expect(isRiskLevel('low')).toBe(true);
      expect(isRiskLevel('medium')).toBe(true);
      expect(isRiskLevel('high')).toBe(true);
    });

    it('shouldforinvalid RiskLevel return false', () => {
      expect(isRiskLevel('invalid')).toBe(false);
      expect(isRiskLevel('')).toBe(false);
    });
  });

  describe('isPriceData', () => {
    it('shouldforeffective PriceData return true', () => {
      const validPriceData = {
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now(),
      };
      expect(isPriceData(validPriceData)).toBe(true);
    });

    it('shouldforinvalid PriceData return false', () => {
      expect(isPriceData(null)).toBe(false);
      expect(isPriceData(undefined)).toBe(false);
      expect(isPriceData({})).toBe(false);
      expect(isPriceData({ symbol: 'BTC/USD' })).toBe(false);
      expect(isPriceData({ symbol: 123, price: 50000, timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isPriceDataArray', () => {
    it('shouldforeffective PriceData arrayreturn true', () => {
      const validArray = [
        { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
        { symbol: 'ETH/USD', price: 3000, timestamp: Date.now() },
      ];
      expect(isPriceDataArray(validArray)).toBe(true);
    });

    it('shouldforinvalid PriceData arrayreturn false', () => {
      expect(isPriceDataArray(null)).toBe(false);
      expect(isPriceDataArray([])).toBe(true);
      expect(isPriceDataArray([{ symbol: 'BTC/USD' }])).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('shouldforeffective ApiError return true', () => {
      const validError = {
        code: 'ERROR_CODE',
        message: 'Error message',
        timestamp: Date.now(),
      };
      expect(isApiError(validError)).toBe(true);
    });

    it('shouldforinvalid ApiError return false', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError({})).toBe(false);
      expect(isApiError({ code: 123, message: 'Error', timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isApiResponse', () => {
    it('shouldforeffective ApiResponse return true', () => {
      const validResponse = {
        success: true,
        data: { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
        timestamp: Date.now(),
      };
      expect(isApiResponse(validResponse, isPriceData)).toBe(true);
    });

    it('shouldforinvalid ApiResponse return false', () => {
      expect(isApiResponse(null)).toBe(false);
      expect(isApiResponse({})).toBe(false);
      expect(isApiResponse({ success: 'true', timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isPaginatedResponse', () => {
    it('shouldforeffective PaginatedResponse return true', () => {
      const validResponse = {
        items: [
          { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
          { symbol: 'ETH/USD', price: 3000, timestamp: Date.now() },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        hasMore: false,
      };
      expect(isPaginatedResponse(validResponse, isPriceData)).toBe(true);
    });

    it('shouldforinvalid PaginatedResponse return false', () => {
      expect(isPaginatedResponse(null)).toBe(false);
      expect(isPaginatedResponse({})).toBe(false);
      expect(isPaginatedResponse({ items: [], total: 0 })).toBe(false);
    });
  });

  describe('assertIsOracleProvider', () => {
    it('shouldforeffective OracleProvider noterror', () => {
      expect(() => assertIsOracleProvider('chainlink')).not.toThrow();
    });

    it('shouldforinvalid OracleProvider error', () => {
      expect(() => assertIsOracleProvider('invalid')).toThrow('Invalid OracleProvider');
    });
  });

  describe('assertIsBlockchain', () => {
    it('shouldforeffective Blockchain noterror', () => {
      expect(() => assertIsBlockchain('ethereum')).not.toThrow();
    });

    it('shouldforinvalid Blockchain error', () => {
      expect(() => assertIsBlockchain('invalid')).toThrow('Invalid Blockchain');
    });
  });

  describe('assertIsPriceData', () => {
    it('shouldforeffective PriceData noterror', () => {
      const validPriceData = {
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now(),
      };
      expect(() => assertIsPriceData(validPriceData)).not.toThrow();
    });

    it('shouldforinvalid PriceData error', () => {
      expect(() => assertIsPriceData(null)).toThrow('Invalid PriceData object');
    });
  });

  describe('assertIsApiResponse', () => {
    it('shouldforeffective ApiResponse noterror', () => {
      const validResponse = {
        success: true,
        data: { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
        timestamp: Date.now(),
      };
      expect(() => assertIsApiResponse(validResponse, isPriceData)).not.toThrow();
    });

    it('shouldforinvalid ApiResponse error', () => {
      expect(() => assertIsApiResponse(null)).toThrow('Invalid ApiResponse object');
    });
  });

  describe('hasProperty', () => {
    it('shouldforhavespecifiedpropertyobjectreturn true', () => {
      const obj = { name: 'test', value: 123 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'value')).toBe(true);
    });

    it('shouldforhavespecifiedpropertyobjectreturn false', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'age')).toBe(false);
      expect(hasProperty(null, 'name')).toBe(false);
    });
  });

  describe('hasProperties', () => {
    it('shouldforhaveallspecifiedpropertyobjectreturn true', () => {
      const obj = { name: 'test', value: 123, active: true };
      expect(hasProperties(obj, ['name', 'value'])).toBe(true);
      expect(hasProperties(obj, ['name', 'value', 'active'])).toBe(true);
    });

    it('shouldforsomepropertyobjectreturn false', () => {
      const obj = { name: 'test' };
      expect(hasProperties(obj, ['name', 'value'])).toBe(false);
      expect(hasProperties(null, ['name'])).toBe(false);
    });
  });
});
