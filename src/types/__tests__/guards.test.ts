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
    it('应该对有效的 OracleProvider 返回 true', () => {
      expect(isOracleProvider('chainlink')).toBe(true);
      expect(isOracleProvider('uma')).toBe(true);
      expect(isOracleProvider('pyth')).toBe(true);
      expect(isOracleProvider('api3')).toBe(true);
      expect(isOracleProvider('redstone')).toBe(true);
      expect(isOracleProvider('dia')).toBe(true);
      expect(isOracleProvider('winklink')).toBe(true);
    });

    it('应该对无效的 OracleProvider 返回 false', () => {
      expect(isOracleProvider('invalid')).toBe(false);
      expect(isOracleProvider('')).toBe(false);
      expect(isOracleProvider(123)).toBe(false);
      expect(isOracleProvider(null)).toBe(false);
      expect(isOracleProvider(undefined)).toBe(false);
    });
  });

  describe('isBlockchain', () => {
    it('应该对有效的 Blockchain 返回 true', () => {
      expect(isBlockchain('ethereum')).toBe(true);
      expect(isBlockchain('arbitrum')).toBe(true);
      expect(isBlockchain('optimism')).toBe(true);
      expect(isBlockchain('polygon')).toBe(true);
      expect(isBlockchain('solana')).toBe(true);
    });

    it('应该对无效的 Blockchain 返回 false', () => {
      expect(isBlockchain('invalid')).toBe(false);
      expect(isBlockchain('')).toBe(false);
      expect(isBlockchain(123)).toBe(false);
      expect(isBlockchain(null)).toBe(false);
    });
  });

  describe('isDataStatus', () => {
    it('应该对有效的 DataStatus 返回 true', () => {
      expect(isDataStatus('fresh')).toBe(true);
      expect(isDataStatus('stale')).toBe(true);
      expect(isDataStatus('error')).toBe(true);
      expect(isDataStatus('loading')).toBe(true);
    });

    it('应该对无效的 DataStatus 返回 false', () => {
      expect(isDataStatus('invalid')).toBe(false);
      expect(isDataStatus('')).toBe(false);
      expect(isDataStatus(123)).toBe(false);
    });
  });

  describe('isTrendDirection', () => {
    it('应该对有效的 TrendDirection 返回 true', () => {
      expect(isTrendDirection('up')).toBe(true);
      expect(isTrendDirection('down')).toBe(true);
      expect(isTrendDirection('stable')).toBe(true);
    });

    it('应该对无效的 TrendDirection 返回 false', () => {
      expect(isTrendDirection('invalid')).toBe(false);
      expect(isTrendDirection('')).toBe(false);
    });
  });

  describe('isPublisherStatus', () => {
    it('应该对有效的 PublisherStatus 返回 true', () => {
      expect(isPublisherStatus('active')).toBe(true);
      expect(isPublisherStatus('inactive')).toBe(true);
      expect(isPublisherStatus('degraded')).toBe(true);
    });

    it('应该对无效的 PublisherStatus 返回 false', () => {
      expect(isPublisherStatus('invalid')).toBe(false);
      expect(isPublisherStatus('')).toBe(false);
    });
  });

  describe('isRiskLevel', () => {
    it('应该对有效的 RiskLevel 返回 true', () => {
      expect(isRiskLevel('low')).toBe(true);
      expect(isRiskLevel('medium')).toBe(true);
      expect(isRiskLevel('high')).toBe(true);
    });

    it('应该对无效的 RiskLevel 返回 false', () => {
      expect(isRiskLevel('invalid')).toBe(false);
      expect(isRiskLevel('')).toBe(false);
    });
  });

  describe('isPriceData', () => {
    it('应该对有效的 PriceData 返回 true', () => {
      const validPriceData = {
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now(),
      };
      expect(isPriceData(validPriceData)).toBe(true);
    });

    it('应该对无效的 PriceData 返回 false', () => {
      expect(isPriceData(null)).toBe(false);
      expect(isPriceData(undefined)).toBe(false);
      expect(isPriceData({})).toBe(false);
      expect(isPriceData({ symbol: 'BTC/USD' })).toBe(false);
      expect(isPriceData({ symbol: 123, price: 50000, timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isPriceDataArray', () => {
    it('应该对有效的 PriceData 数组返回 true', () => {
      const validArray = [
        { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
        { symbol: 'ETH/USD', price: 3000, timestamp: Date.now() },
      ];
      expect(isPriceDataArray(validArray)).toBe(true);
    });

    it('应该对无效的 PriceData 数组返回 false', () => {
      expect(isPriceDataArray(null)).toBe(false);
      expect(isPriceDataArray([])).toBe(true);
      expect(isPriceDataArray([{ symbol: 'BTC/USD' }])).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('应该对有效的 ApiError 返回 true', () => {
      const validError = {
        code: 'ERROR_CODE',
        message: 'Error message',
        timestamp: Date.now(),
      };
      expect(isApiError(validError)).toBe(true);
    });

    it('应该对无效的 ApiError 返回 false', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError({})).toBe(false);
      expect(isApiError({ code: 123, message: 'Error', timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isApiResponse', () => {
    it('应该对有效的 ApiResponse 返回 true', () => {
      const validResponse = {
        success: true,
        data: { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
        timestamp: Date.now(),
      };
      expect(isApiResponse(validResponse, isPriceData)).toBe(true);
    });

    it('应该对无效的 ApiResponse 返回 false', () => {
      expect(isApiResponse(null)).toBe(false);
      expect(isApiResponse({})).toBe(false);
      expect(isApiResponse({ success: 'true', timestamp: Date.now() })).toBe(false);
    });
  });

  describe('isPaginatedResponse', () => {
    it('应该对有效的 PaginatedResponse 返回 true', () => {
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

    it('应该对无效的 PaginatedResponse 返回 false', () => {
      expect(isPaginatedResponse(null)).toBe(false);
      expect(isPaginatedResponse({})).toBe(false);
      expect(isPaginatedResponse({ items: [], total: 0 })).toBe(false);
    });
  });

  describe('assertIsOracleProvider', () => {
    it('应该对有效的 OracleProvider 不抛出错误', () => {
      expect(() => assertIsOracleProvider('chainlink')).not.toThrow();
    });

    it('应该对无效的 OracleProvider 抛出错误', () => {
      expect(() => assertIsOracleProvider('invalid')).toThrow('Invalid OracleProvider');
    });
  });

  describe('assertIsBlockchain', () => {
    it('应该对有效的 Blockchain 不抛出错误', () => {
      expect(() => assertIsBlockchain('ethereum')).not.toThrow();
    });

    it('应该对无效的 Blockchain 抛出错误', () => {
      expect(() => assertIsBlockchain('invalid')).toThrow('Invalid Blockchain');
    });
  });

  describe('assertIsPriceData', () => {
    it('应该对有效的 PriceData 不抛出错误', () => {
      const validPriceData = {
        symbol: 'BTC/USD',
        price: 50000,
        timestamp: Date.now(),
      };
      expect(() => assertIsPriceData(validPriceData)).not.toThrow();
    });

    it('应该对无效的 PriceData 抛出错误', () => {
      expect(() => assertIsPriceData(null)).toThrow('Invalid PriceData object');
    });
  });

  describe('assertIsApiResponse', () => {
    it('应该对有效的 ApiResponse 不抛出错误', () => {
      const validResponse = {
        success: true,
        data: { symbol: 'BTC/USD', price: 50000, timestamp: Date.now() },
        timestamp: Date.now(),
      };
      expect(() => assertIsApiResponse(validResponse, isPriceData)).not.toThrow();
    });

    it('应该对无效的 ApiResponse 抛出错误', () => {
      expect(() => assertIsApiResponse(null)).toThrow('Invalid ApiResponse object');
    });
  });

  describe('hasProperty', () => {
    it('应该对有指定属性的对象返回 true', () => {
      const obj = { name: 'test', value: 123 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'value')).toBe(true);
    });

    it('应该对没有指定属性的对象返回 false', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'age')).toBe(false);
      expect(hasProperty(null, 'name')).toBe(false);
    });
  });

  describe('hasProperties', () => {
    it('应该对有所有指定属性的对象返回 true', () => {
      const obj = { name: 'test', value: 123, active: true };
      expect(hasProperties(obj, ['name', 'value'])).toBe(true);
      expect(hasProperties(obj, ['name', 'value', 'active'])).toBe(true);
    });

    it('应该对缺少某些属性的对象返回 false', () => {
      const obj = { name: 'test' };
      expect(hasProperties(obj, ['name', 'value'])).toBe(false);
      expect(hasProperties(null, ['name'])).toBe(false);
    });
  });
});
