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
      expect(is