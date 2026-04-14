import { OracleProvider, Blockchain } from '@/types/oracle';

import {
  getHoursForTimeRange,
  fetchOraclePrice,
  fetchMultipleOraclePrices,
  createPriceHistoryManager,
  extractBaseSymbol,
} from '../utils/oracleDataUtils';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockGetClient = jest.fn();
jest.mock('../factory', () => {
  const actual = jest.requireActual('../factory');
  return {
    ...actual,
    getDefaultFactory: () => ({
      getClient: mockGetClient,
    }),
  };
});

describe('oracleDataUtils', () => {
  describe('getHoursForTimeRange', () => {
    it('should return 1 for 1H', () => {
      expect(getHoursForTimeRange('1H')).toBe(1);
    });

    it('should return 24 for 24H', () => {
      expect(getHoursForTimeRange('24H')).toBe(24);
    });

    it('should return 168 for 7D', () => {
      expect(getHoursForTimeRange('7D')).toBe(168);
    });

    it('should return 720 for 30D', () => {
      expect(getHoursForTimeRange('30D')).toBe(720);
    });

    it('should return 2160 for 90D', () => {
      expect(getHoursForTimeRange('90D')).toBe(2160);
    });

    it('should return 8760 for 1Y', () => {
      expect(getHoursForTimeRange('1Y')).toBe(8760);
    });

    it('should return undefined for ALL', () => {
      expect(getHoursForTimeRange('ALL')).toBeUndefined();
    });

    it('should return 24 as default for unknown range', () => {
      expect(getHoursForTimeRange('UNKNOWN' as any)).toBe(24);
    });
  });

  describe('extractBaseSymbol', () => {
    it('should extract base symbol from pair', () => {
      expect(extractBaseSymbol('BTC/USD')).toBe('BTC');
      expect(extractBaseSymbol('ETH/USD')).toBe('ETH');
    });

    it('should return symbol if no slash', () => {
      expect(extractBaseSymbol('BTC')).toBe('BTC');
    });

    it('should handle multiple slashes', () => {
      expect(extractBaseSymbol('BTC/USD/TEST')).toBe('BTC');
    });

    it('should handle empty string', () => {
      expect(extractBaseSymbol('')).toBe('');
    });
  });

  describe('fetchOraclePrice', () => {
    const mockClient = {
      getPrice: jest.fn(),
      getHistoricalPrices: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockGetClient.mockReturnValue(mockClient);
    });

    it('should fetch price successfully', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        confidence: 0.98,
        source: 'test',
      });

      const result = await fetchOraclePrice({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
      });

      expect(result.success).toBe(true);
      expect(result.price).toBe(68000);
      expect(result.provider).toBe(OracleProvider.PYTH);
    });

    it('should fetch price with chain', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        source: 'test',
      });

      const result = await fetchOraclePrice({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        chain: Blockchain.ETHEREUM,
      });

      expect(mockClient.getPrice).toHaveBeenCalledWith('BTC', Blockchain.ETHEREUM);
      expect(result.success).toBe(true);
    });

    it('should extract base symbol from pair', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        source: 'test',
      });

      await fetchOraclePrice({
        provider: OracleProvider.PYTH,
        symbol: 'BTC/USD',
      });

      expect(mockClient.getPrice).toHaveBeenCalledWith('BTC', undefined);
    });

    it('should fetch historical data when requested', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        source: 'test',
      });
      mockClient.getHistoricalPrices.mockResolvedValue([
        { timestamp: Date.now() - 3600000, price: 67500 },
        { timestamp: Date.now(), price: 68000 },
      ]);

      const result = await fetchOraclePrice({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
        includeHistorical: true,
        historicalHours: 24,
      });

      expect(result.success).toBe(true);
      expect(result.historicalData).toBeDefined();
      expect(result.historicalData).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      mockClient.getPrice.mockRejectedValue(new Error('Network error'));

      const result = await fetchOraclePrice({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.price).toBe(0);
    });

    it('should track response time', async () => {
      mockClient.getPrice.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ price: 100, timestamp: Date.now() }), 50)
          )
      );

      const result = await fetchOraclePrice({
        provider: OracleProvider.PYTH,
        symbol: 'BTC',
      });

      expect(result.responseTime).toBeGreaterThanOrEqual(40);
    });
  });

  describe('fetchMultipleOraclePrices', () => {
    const mockClient = {
      getPrice: jest.fn(),
      getHistoricalPrices: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockGetClient.mockReturnValue(mockClient);
    });

    it('should fetch prices from multiple providers', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        source: 'test',
      });

      const result = await fetchMultipleOraclePrices({
        providers: [OracleProvider.PYTH, OracleProvider.CHAINLINK],
        symbol: 'BTC',
      });

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
    });

    it('should track progress with callback', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        source: 'test',
      });

      const progressCallback = jest.fn();

      await fetchMultipleOraclePrices({
        providers: [OracleProvider.PYTH, OracleProvider.CHAINLINK],
        symbol: 'BTC',
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      mockClient.getPrice
        .mockResolvedValueOnce({ price: 68000, timestamp: Date.now(), source: 'test' })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await fetchMultipleOraclePrices({
        providers: [OracleProvider.PYTH, OracleProvider.CHAINLINK],
        symbol: 'BTC',
      });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it('should calculate total response time', async () => {
      mockClient.getPrice.mockResolvedValue({
        price: 68000,
        timestamp: Date.now(),
        source: 'test',
      });

      const result = await fetchMultipleOraclePrices({
        providers: [OracleProvider.PYTH, OracleProvider.CHAINLINK],
        symbol: 'BTC',
      });

      expect(result.totalResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty providers array', async () => {
      const result = await fetchMultipleOraclePrices({
        providers: [],
        symbol: 'BTC',
      });

      expect(result.results).toHaveLength(0);
      expect(result.successCount).toBe(0);
    });
  });

  describe('createPriceHistoryManager', () => {
    it('should create a history manager with default max points', () => {
      const manager = createPriceHistoryManager();

      expect(manager.getMaxPoints()).toBe(100);
    });

    it('should create a history manager with custom max points', () => {
      const manager = createPriceHistoryManager(50);

      expect(manager.getMaxPoints()).toBe(50);
    });

    it('should add and retrieve points', () => {
      const manager = createPriceHistoryManager();

      manager.addPoint(OracleProvider.PYTH, 1000, 68000);
      manager.addPoint(OracleProvider.PYTH, 2000, 68500);

      const history = manager.getHistory(OracleProvider.PYTH);

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ timestamp: 1000, price: 68000 });
      expect(history[1]).toEqual({ timestamp: 2000, price: 68500 });
    });

    it('should limit history to max points', () => {
      const manager = createPriceHistoryManager(3);

      for (let i = 0; i < 5; i++) {
        manager.addPoint(OracleProvider.PYTH, i * 1000, 68000 + i * 100);
      }

      const history = manager.getHistory(OracleProvider.PYTH);

      expect(history).toHaveLength(3);
      expect(history[0].timestamp).toBe(2000);
    });

    it('should track history for multiple providers', () => {
      const manager = createPriceHistoryManager();

      manager.addPoint(OracleProvider.PYTH, 1000, 68000);
      manager.addPoint(OracleProvider.CHAINLINK, 1000, 67900);

      const pythHistory = manager.getHistory(OracleProvider.PYTH);
      const chainlinkHistory = manager.getHistory(OracleProvider.CHAINLINK);

      expect(pythHistory).toHaveLength(1);
      expect(chainlinkHistory).toHaveLength(1);
    });

    it('should return empty array for provider with no history', () => {
      const manager = createPriceHistoryManager();

      const history = manager.getHistory(OracleProvider.PYTH);

      expect(history).toEqual([]);
    });

    it('should clear history for specific provider', () => {
      const manager = createPriceHistoryManager();

      manager.addPoint(OracleProvider.PYTH, 1000, 68000);
      manager.addPoint(OracleProvider.CHAINLINK, 1000, 67900);

      manager.clear(OracleProvider.PYTH);

      expect(manager.getHistory(OracleProvider.PYTH)).toEqual([]);
      expect(manager.getHistory(OracleProvider.CHAINLINK)).toHaveLength(1);
    });

    it('should clear all history when no provider specified', () => {
      const manager = createPriceHistoryManager();

      manager.addPoint(OracleProvider.PYTH, 1000, 68000);
      manager.addPoint(OracleProvider.CHAINLINK, 1000, 67900);

      manager.clear();

      expect(manager.getHistory(OracleProvider.PYTH)).toEqual([]);
      expect(manager.getHistory(OracleProvider.CHAINLINK)).toEqual([]);
    });

    it('should get all history', () => {
      const manager = createPriceHistoryManager();

      manager.addPoint(OracleProvider.PYTH, 1000, 68000);
      manager.addPoint(OracleProvider.CHAINLINK, 1000, 67900);

      const allHistory = manager.getAllHistory();

      expect(allHistory[OracleProvider.PYTH]).toHaveLength(1);
      expect(allHistory[OracleProvider.CHAINLINK]).toHaveLength(1);
    });

    it('should return history array', () => {
      const manager = createPriceHistoryManager();

      manager.addPoint(OracleProvider.PYTH, 1000, 68000);

      const history = manager.getHistory(OracleProvider.PYTH);

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({ timestamp: 1000, price: 68000 });
    });
  });
});
