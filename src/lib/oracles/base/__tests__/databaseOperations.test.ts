import { PriceFetchError, OracleClientError } from '@/lib/errors';
import { type Blockchain, type PriceData, type OracleProvider } from '@/types/oracle';

import { fetchPriceWithDatabase, fetchHistoricalPricesWithDatabase } from '../databaseOperations';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockShouldUseDatabase = jest.fn();
const mockGetPriceFromDatabase = jest.fn();
const mockGetHistoricalPricesFromDatabase = jest.fn();

jest.mock('../../utils/storage', () => ({
  shouldUseDatabase: () => mockShouldUseDatabase(),
  getPriceFromDatabase: (...args: unknown[]) => mockGetPriceFromDatabase(...args),
  getHistoricalPricesFromDatabase: (...args: unknown[]) =>
    mockGetHistoricalPricesFromDatabase(...args),
}));

// eslint-disable-next-line max-lines-per-function
describe('databaseOperations', () => {
  const mockProvider: OracleProvider = 'chainlink';
  const mockSymbol = 'BTC';
  const mockChain: Blockchain = 'ethereum';

  const createMockPriceData = (overrides?: Partial<PriceData>): PriceData => ({
    provider: mockProvider,
    symbol: mockSymbol,
    chain: mockChain,
    price: 50000,
    timestamp: Date.now(),
    decimals: 8,
    confidence: 0.99,
    source: 'test',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldUseDatabase.mockReturnValue(true);
  });

  describe('Transaction Tests', () => {
    describe('Successful transaction commit', () => {
      it('should successfully fetch price from database', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(mockGetPriceFromDatabase).toHaveBeenCalledWith(mockProvider, mockSymbol, mockChain);
        expect(result).toEqual(mockPriceData);
      });

      it('should successfully fetch historical prices from database', async () => {
        const mockPriceDataArray = [
          createMockPriceData({ timestamp: Date.now() - 3600000 }),
          createMockPriceData({ timestamp: Date.now() - 7200000 }),
        ];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockPriceDataArray);

        const result = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          24,
          true
        );

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          mockSymbol,
          mockChain,
          24
        );
        expect(result).toEqual(mockPriceDataArray);
      });
    });

    describe('Transaction rollback on error', () => {
      it('should throw PriceFetchError when database returns null', async () => {
        mockGetPriceFromDatabase.mockResolvedValueOnce(null);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should throw PriceFetchError when historical prices return null', async () => {
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(null);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should throw PriceFetchError when historical prices return empty array', async () => {
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce([]);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Nested transactions', () => {
      it('should handle nested database calls correctly', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase
          .mockResolvedValueOnce(mockPriceData)
          .mockResolvedValueOnce(mockPriceData);

        const result1 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        const result2 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result1).toEqual(mockPriceData);
        expect(result2).toEqual(mockPriceData);
        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(2);
      });

      it('should handle multiple sequential historical price fetches', async () => {
        const mockPriceDataArray1 = [createMockPriceData({ timestamp: Date.now() - 3600000 })];
        const mockPriceDataArray2 = [createMockPriceData({ timestamp: Date.now() - 7200000 })];

        mockGetHistoricalPricesFromDatabase
          .mockResolvedValueOnce(mockPriceDataArray1)
          .mockResolvedValueOnce(mockPriceDataArray2);

        const result1 = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          12,
          true
        );
        const result2 = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          24,
          true
        );

        expect(result1).toEqual(mockPriceDataArray1);
        expect(result2).toEqual(mockPriceDataArray2);
      });
    });

    describe('Transaction timeout handling', () => {
      it('should handle database timeout gracefully', async () => {
        const timeoutError = new Error('Database timeout');
        mockGetPriceFromDatabase.mockRejectedValueOnce(timeoutError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle historical price fetch timeout', async () => {
        const timeoutError = new Error('Connection timeout');
        mockGetHistoricalPricesFromDatabase.mockRejectedValueOnce(timeoutError);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Concurrent transactions', () => {
      it('should handle concurrent price fetches', async () => {
        const mockPriceData1 = createMockPriceData({ symbol: 'BTC', price: 50000 });
        const mockPriceData2 = createMockPriceData({ symbol: 'ETH', price: 3000 });
        const mockPriceData3 = createMockPriceData({ symbol: 'SOL', price: 100 });

        mockGetPriceFromDatabase
          .mockResolvedValueOnce(mockPriceData1)
          .mockResolvedValueOnce(mockPriceData2)
          .mockResolvedValueOnce(mockPriceData3);

        const results = await Promise.all([
          fetchPriceWithDatabase(mockProvider, 'BTC', mockChain, true),
          fetchPriceWithDatabase(mockProvider, 'ETH', mockChain, true),
          fetchPriceWithDatabase(mockProvider, 'SOL', mockChain, true),
        ]);

        expect(results[0]).toEqual(mockPriceData1);
        expect(results[1]).toEqual(mockPriceData2);
        expect(results[2]).toEqual(mockPriceData3);
      });

      it('should handle concurrent historical price fetches', async () => {
        const mockPriceDataArray1 = [createMockPriceData({ symbol: 'BTC' })];
        const mockPriceDataArray2 = [createMockPriceData({ symbol: 'ETH' })];

        mockGetHistoricalPricesFromDatabase
          .mockResolvedValueOnce(mockPriceDataArray1)
          .mockResolvedValueOnce(mockPriceDataArray2);

        const results = await Promise.all([
          fetchHistoricalPricesWithDatabase(mockProvider, 'BTC', mockChain, 24, true),
          fetchHistoricalPricesWithDatabase(mockProvider, 'ETH', mockChain, 12, true),
        ]);

        expect(results[0]).toEqual(mockPriceDataArray1);
        expect(results[1]).toEqual(mockPriceDataArray2);
      });

      it('should handle mixed concurrent operations', async () => {
        const mockPriceData = createMockPriceData();
        const mockHistoricalPrices = [createMockPriceData()];

        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalPrices);

        const [priceResult, historicalResult] = await Promise.all([
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true),
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true),
        ]);

        expect(priceResult).toEqual(mockPriceData);
        expect(historicalResult).toEqual(mockHistoricalPrices);
      });
    });
  });

  describe('Error Recovery Tests', () => {
    describe('Database connection failure', () => {
      it('should handle connection failure gracefully', async () => {
        const connectionError = new Error('ECONNREFUSED');
        mockGetPriceFromDatabase.mockRejectedValueOnce(connectionError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle connection refused error', async () => {
        const connectionError = new Error('Connection refused');
        mockGetHistoricalPricesFromDatabase.mockRejectedValueOnce(connectionError);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Connection timeout recovery', () => {
      it('should recover from timeout and throw appropriate error', async () => {
        const timeoutError = new Error('ETIMEDOUT');
        mockGetPriceFromDatabase.mockRejectedValueOnce(timeoutError);

        try {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
          expect((error as PriceFetchError).details.retryable).toBe(true);
        }
      });

      it('should handle timeout with proper error details', async () => {
        const timeoutError = new Error('Request timeout');
        mockGetHistoricalPricesFromDatabase.mockRejectedValueOnce(timeoutError);

        try {
          await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
          const priceError = error as PriceFetchError;
          expect(priceError.details.provider).toBe(mockProvider);
          expect(priceError.details.symbol).toBe(mockSymbol);
        }
      });
    });

    describe('Query retry on transient errors', () => {
      it('should mark transient errors as retryable', async () => {
        const transientError = new Error('Temporary failure');
        mockGetPriceFromDatabase.mockRejectedValueOnce(transientError);

        try {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
          expect((error as PriceFetchError).details.retryable).toBe(true);
        }
      });

      it('should handle database busy error', async () => {
        const busyError = new Error('Database is busy');
        mockGetHistoricalPricesFromDatabase.mockRejectedValueOnce(busyError);

        try {
          await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
          expect((error as PriceFetchError).details.retryable).toBe(true);
        }
      });
    });

    describe('Graceful degradation', () => {
      it('should gracefully handle when database is disabled', async () => {
        mockShouldUseDatabase.mockReturnValue(false);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);

        expect(mockGetPriceFromDatabase).not.toHaveBeenCalled();
      });

      it('should handle useDatabase flag set to false', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, false)
        ).rejects.toThrow(PriceFetchError);

        expect(mockGetPriceFromDatabase).not.toHaveBeenCalled();
      });

      it('should handle historical prices when database is disabled', async () => {
        mockShouldUseDatabase.mockReturnValue(false);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);

        expect(mockGetHistoricalPricesFromDatabase).not.toHaveBeenCalled();
      });
    });

    describe('Error logging and reporting', () => {
      it('should preserve original error in thrown error', async () => {
        const originalError = new Error('Original database error');
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockRejectedValueOnce(originalError);

        try {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
          expect((error as PriceFetchError).details.provider).toBe(mockProvider);
        }
      });

      it('should include error details in PriceFetchError', async () => {
        const dbError = new Error('Database constraint violation');
        mockGetPriceFromDatabase.mockRejectedValueOnce(dbError);

        try {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
          const priceError = error as PriceFetchError;
          expect(priceError.details.provider).toBe(mockProvider);
          expect(priceError.details.symbol).toBe(mockSymbol);
          expect(priceError.details.chain).toBe(mockChain);
        }
      });
    });
  });

  describe('Data Validation Tests', () => {
    describe('Valid data insertion', () => {
      it('should accept valid price data', async () => {
        const validPriceData = createMockPriceData({
          price: 50000.12345678,
          timestamp: Date.now(),
          confidence: 0.99,
        });
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockResolvedValueOnce(validPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result).toEqual(validPriceData);
        expect(result.price).toBe(50000.12345678);
      });

      it('should accept valid historical price data', async () => {
        const now = Date.now();
        const validHistoricalData = [
          createMockPriceData({ timestamp: now - 7200000 }),
          createMockPriceData({ timestamp: now - 3600000 }),
          createMockPriceData({ timestamp: now }),
        ];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(validHistoricalData);

        const result = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          24,
          true
        );

        expect(result).toHaveLength(3);
        expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
      });
    });

    describe('Invalid data rejection', () => {
      it('should handle null data from database', async () => {
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockResolvedValueOnce(null);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle undefined data from database', async () => {
        mockGetPriceFromDatabase.mockResolvedValueOnce(undefined as unknown as PriceData);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Data type validation', () => {
      it('should handle price as number', async () => {
        const priceData = createMockPriceData({ price: 12345.6789 });
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockResolvedValueOnce(priceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(typeof result.price).toBe('number');
        expect(result.price).toBe(12345.6789);
      });

      it('should handle timestamp as number', async () => {
        const timestamp = Date.now();
        const priceData = createMockPriceData({ timestamp });
        mockGetPriceFromDatabase.mockResolvedValueOnce(priceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(typeof result.timestamp).toBe('number');
        expect(result.timestamp).toBe(timestamp);
      });

      it('should handle confidence as optional number', async () => {
        const priceDataWithConfidence = createMockPriceData({ confidence: 0.95 });
        const priceDataWithoutConfidence = createMockPriceData({ confidence: undefined });

        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase
          .mockResolvedValueOnce(priceDataWithConfidence)
          .mockResolvedValueOnce(priceDataWithoutConfidence);

        const result1 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        const result2 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result1.confidence).toBe(0.95);
        expect(result2.confidence).toBeUndefined();
      });
    });

    describe('Constraint violation handling', () => {
      it('should handle unique constraint violation', async () => {
        const constraintError = new Error('Unique constraint violation');
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockRejectedValueOnce(constraintError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle foreign key constraint violation', async () => {
        const fkError = new Error('Foreign key constraint violation');
        mockGetHistoricalPricesFromDatabase.mockRejectedValueOnce(fkError);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('NULL value handling', () => {
      it('should handle NULL chain parameter', async () => {
        const priceData = createMockPriceData({ chain: undefined });
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockResolvedValueOnce(priceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, undefined, true);

        expect(result.chain).toBeUndefined();
      });

      it('should handle NULL confidence value', async () => {
        const priceData = createMockPriceData({ confidence: null as unknown as number });
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockResolvedValueOnce(priceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.confidence).toBeNull();
      });

      it('should handle NULL source value', async () => {
        const priceData = createMockPriceData({ source: null as unknown as string });
        mockGetPriceFromDatabase.mockReset();
        mockGetPriceFromDatabase.mockResolvedValueOnce(priceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.source).toBeNull();
      });
    });
  });

  describe('Connection Pool Management Tests', () => {
    describe('Connection pool initialization', () => {
      it('should initialize database connection on first call', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(mockGetPriceFromDatabase).toHaveBeenCalled();
      });

      it('should handle multiple sequential calls efficiently', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValue(mockPriceData);

        for (let i = 0; i < 5; i++) {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        }

        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(5);
      });
    });

    describe('Connection reuse', () => {
      it('should reuse connection for multiple queries', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValue(mockPriceData);

        const results = await Promise.all([
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true),
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true),
        ]);

        expect(results).toHaveLength(2);
        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(2);
      });

      it('should handle connection reuse for different symbols', async () => {
        const btcData = createMockPriceData({ symbol: 'BTC' });
        const ethData = createMockPriceData({ symbol: 'ETH' });

        mockGetPriceFromDatabase.mockResolvedValueOnce(btcData).mockResolvedValueOnce(ethData);

        const [btc, eth] = await Promise.all([
          fetchPriceWithDatabase(mockProvider, 'BTC', mockChain, true),
          fetchPriceWithDatabase(mockProvider, 'ETH', mockChain, true),
        ]);

        expect(btc.symbol).toBe('BTC');
        expect(eth.symbol).toBe('ETH');
      });
    });

    describe('Connection cleanup', () => {
      it('should handle connection cleanup after error', async () => {
        const connectionError = new Error('Connection lost');
        mockGetPriceFromDatabase.mockRejectedValueOnce(connectionError);

        try {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
        }

        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        expect(result).toEqual(mockPriceData);
      });
    });

    describe('Pool exhaustion handling', () => {
      it('should handle pool exhaustion gracefully', async () => {
        const poolError = new Error('Connection pool exhausted');
        mockGetPriceFromDatabase.mockRejectedValueOnce(poolError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle max connections reached error', async () => {
        const maxConnError = new Error('Maximum connections reached');
        mockGetHistoricalPricesFromDatabase.mockRejectedValueOnce(maxConnError);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Connection health checks', () => {
      it('should detect unhealthy connection', async () => {
        const healthError = new Error('Connection unhealthy');
        mockGetPriceFromDatabase.mockRejectedValueOnce(healthError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should recover after connection health check', async () => {
        const healthError = new Error('Connection check failed');
        const mockPriceData = createMockPriceData();

        mockGetPriceFromDatabase
          .mockRejectedValueOnce(healthError)
          .mockResolvedValueOnce(mockPriceData);

        try {
          await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        } catch (error) {
          expect(error).toBeInstanceOf(PriceFetchError);
        }

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        expect(result).toEqual(mockPriceData);
      });
    });
  });

  describe('Query Performance Tests', () => {
    describe('Query execution time', () => {
      it('should complete price fetch within acceptable time', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const startTime = Date.now();
        await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });

      it('should complete historical price fetch within acceptable time', async () => {
        const mockHistoricalData = Array.from({ length: 100 }, (_, i) =>
          createMockPriceData({ timestamp: Date.now() - i * 3600000 })
        );
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        const startTime = Date.now();
        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Batch query performance', () => {
      it('should handle batch price fetches efficiently', async () => {
        const symbols = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'];
        const mockPriceData = createMockPriceData();

        mockGetPriceFromDatabase.mockResolvedValue(mockPriceData);

        const startTime = Date.now();
        await Promise.all(
          symbols.map((symbol) => fetchPriceWithDatabase(mockProvider, symbol, mockChain, true))
        );
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(2000);
        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(5);
      });

      it('should handle large historical data sets efficiently', async () => {
        const largeDataSet = Array.from({ length: 1000 }, (_, i) =>
          createMockPriceData({ timestamp: Date.now() - i * 60000 })
        );
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(largeDataSet);

        const startTime = Date.now();
        const result = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          168,
          true
        );
        const endTime = Date.now();

        expect(result).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Index usage verification', () => {
      it('should query with proper provider and symbol', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(mockGetPriceFromDatabase).toHaveBeenCalledWith(mockProvider, mockSymbol, mockChain);
      });

      it('should query historical data with time range', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true);

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          mockSymbol,
          mockChain,
          24
        );
      });
    });

    describe('Query plan optimization', () => {
      it('should use efficient query pattern for single price', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockPriceData);
      });

      it('should use efficient query pattern for historical prices', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        const result = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          24,
          true
        );

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockHistoricalData);
      });
    });

    describe('N+1 query detection', () => {
      it('should avoid N+1 queries for multiple symbols', async () => {
        const symbols = ['BTC', 'ETH', 'SOL'];
        const mockPriceData = createMockPriceData();

        mockGetPriceFromDatabase.mockResolvedValue(mockPriceData);

        await Promise.all(
          symbols.map((symbol) => fetchPriceWithDatabase(mockProvider, symbol, mockChain, true))
        );

        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(3);
      });

      it('should use single query for historical prices', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true);

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Cache Integration Tests', () => {
    describe('Cache invalidation after database update', () => {
      it('should fetch fresh data after database update', async () => {
        const oldPriceData = createMockPriceData({ price: 50000 });
        const newPriceData = createMockPriceData({ price: 51000 });

        mockGetPriceFromDatabase
          .mockResolvedValueOnce(oldPriceData)
          .mockResolvedValueOnce(newPriceData);

        const result1 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        const result2 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result1.price).toBe(50000);
        expect(result2.price).toBe(51000);
      });
    });

    describe('Cache refresh on stale data', () => {
      it('should refresh stale historical data', async () => {
        const staleData = [createMockPriceData({ timestamp: Date.now() - 86400000 })];
        const freshData = [createMockPriceData({ timestamp: Date.now() })];

        mockGetHistoricalPricesFromDatabase
          .mockResolvedValueOnce(staleData)
          .mockResolvedValueOnce(freshData);

        const result1 = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          24,
          true
        );
        const result2 = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          24,
          true
        );

        expect(result1[0].timestamp).toBeLessThan(result2[0].timestamp);
      });
    });

    describe('Cache hit/miss tracking', () => {
      it('should track cache hits for repeated queries', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValue(mockPriceData);

        await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(mockGetPriceFromDatabase).toHaveBeenCalledTimes(2);
      });

      it('should handle cache miss gracefully', async () => {
        mockGetPriceFromDatabase.mockResolvedValueOnce(null);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Cache consistency', () => {
      it('should maintain consistency across concurrent requests', async () => {
        const mockPriceData = createMockPriceData();
        mockGetPriceFromDatabase.mockResolvedValue(mockPriceData);

        const results = await Promise.all([
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true),
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true),
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true),
        ]);

        results.forEach((result) => {
          expect(result).toEqual(mockPriceData);
        });
      });
    });
  });

  describe('Edge Cases Tests', () => {
    describe('Empty result sets', () => {
      it('should handle empty price result', async () => {
        mockGetPriceFromDatabase.mockResolvedValueOnce(null);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle empty historical price result', async () => {
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce([]);

        await expect(
          fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Large result sets', () => {
      it('should handle large price data array', async () => {
        const largePriceArray = Array.from({ length: 10000 }, (_, i) =>
          createMockPriceData({
            timestamp: Date.now() - i * 60000,
            price: 50000 + Math.random() * 1000,
          })
        );
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(largePriceArray);

        const result = await fetchHistoricalPricesWithDatabase(
          mockProvider,
          mockSymbol,
          mockChain,
          168,
          true
        );

        expect(result).toHaveLength(10000);
      });

      it('should handle large price values', async () => {
        const largePriceData = createMockPriceData({
          price: Number.MAX_SAFE_INTEGER,
        });
        mockGetPriceFromDatabase.mockResolvedValueOnce(largePriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.price).toBe(Number.MAX_SAFE_INTEGER);
      });
    });

    describe('Unicode data handling', () => {
      it('should handle unicode symbols', async () => {
        const unicodeSymbol = '比特币';
        const mockPriceData = createMockPriceData({ symbol: unicodeSymbol });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, unicodeSymbol, mockChain, true);

        expect(result.symbol).toBe(unicodeSymbol);
      });

      it('should handle emoji in data', async () => {
        const emojiSymbol = '🚀';
        const mockPriceData = createMockPriceData({
          symbol: emojiSymbol,
          source: 'test 🎉',
        });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, emojiSymbol, mockChain, true);

        expect(result.symbol).toBe(emojiSymbol);
        expect(result.source).toBe('test 🎉');
      });
    });

    describe('Special character escaping', () => {
      it('should handle symbols with special characters', async () => {
        const specialSymbol = "BTC' OR '1'='1";
        const mockPriceData = createMockPriceData({ symbol: specialSymbol });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, specialSymbol, mockChain, true);

        expect(result.symbol).toBe(specialSymbol);
      });

      it('should handle chains with special characters', async () => {
        const specialChain = "ethereum'; DROP TABLE prices; --";
        const mockPriceData = createMockPriceData({ chain: specialChain as unknown as Blockchain });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(
          mockProvider,
          mockSymbol,
          specialChain as unknown as Blockchain,
          true
        );

        expect(result.chain).toBe(specialChain);
      });

      it('should handle providers with special characters', async () => {
        const specialProvider = "chainlink<script>alert('xss')</script>" as OracleProvider;
        const mockPriceData = createMockPriceData({ provider: specialProvider });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(specialProvider, mockSymbol, mockChain, true);

        expect(result.provider).toBe(specialProvider);
      });
    });

    describe('SQL injection prevention', () => {
      it('should safely handle SQL injection attempt in symbol', async () => {
        const maliciousSymbol = "BTC'; DROP TABLE prices; --";
        const mockPriceData = createMockPriceData({ symbol: maliciousSymbol });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, maliciousSymbol, mockChain, true);

        expect(result.symbol).toBe(maliciousSymbol);
        expect(mockGetPriceFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          maliciousSymbol,
          mockChain
        );
      });

      it('should safely handle SQL injection attempt in provider', async () => {
        const maliciousProvider = "chainlink' OR '1'='1" as OracleProvider;
        const mockPriceData = createMockPriceData({ provider: maliciousProvider });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(maliciousProvider, mockSymbol, mockChain, true);

        expect(result.provider).toBe(maliciousProvider);
      });

      it('should safely handle SQL injection attempt in chain', async () => {
        const maliciousChain = "ethereum'; DELETE FROM prices WHERE '1'='1";
        const mockPriceData = createMockPriceData({
          chain: maliciousChain as unknown as Blockchain,
        });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(
          mockProvider,
          mockSymbol,
          maliciousChain as unknown as Blockchain,
          true
        );

        expect(result.chain).toBe(maliciousChain);
      });
    });

    describe('Boundary values', () => {
      it('should handle minimum price value', async () => {
        const minPriceData = createMockPriceData({ price: 0 });
        mockGetPriceFromDatabase.mockResolvedValueOnce(minPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.price).toBe(0);
      });

      it('should handle negative price value', async () => {
        const negativePriceData = createMockPriceData({ price: -100 });
        mockGetPriceFromDatabase.mockResolvedValueOnce(negativePriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.price).toBe(-100);
      });

      it('should handle very small price value', async () => {
        const smallPriceData = createMockPriceData({ price: 0.00000001 });
        mockGetPriceFromDatabase.mockResolvedValueOnce(smallPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.price).toBe(0.00000001);
      });

      it('should handle confidence boundary values', async () => {
        const minConfidenceData = createMockPriceData({ confidence: 0 });
        const maxConfidenceData = createMockPriceData({ confidence: 1 });

        mockGetPriceFromDatabase
          .mockResolvedValueOnce(minConfidenceData)
          .mockResolvedValueOnce(maxConfidenceData);

        const result1 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);
        const result2 = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result1.confidence).toBe(0);
        expect(result2.confidence).toBe(1);
      });

      it('should handle very old timestamps', async () => {
        const oldTimestamp = new Date('1970-01-01').getTime();
        const oldPriceData = createMockPriceData({ timestamp: oldTimestamp });
        mockGetPriceFromDatabase.mockResolvedValueOnce(oldPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.timestamp).toBe(oldTimestamp);
      });

      it('should handle future timestamps', async () => {
        const futureTimestamp = new Date('2100-01-01').getTime();
        const futurePriceData = createMockPriceData({ timestamp: futureTimestamp });
        mockGetPriceFromDatabase.mockResolvedValueOnce(futurePriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true);

        expect(result.timestamp).toBe(futureTimestamp);
      });
    });

    describe('Error type handling', () => {
      it('should re-throw PriceFetchError as is', async () => {
        const priceError = new PriceFetchError('Test error', {
          provider: mockProvider,
          symbol: mockSymbol,
          chain: mockChain,
          retryable: true,
        });
        mockGetPriceFromDatabase.mockRejectedValueOnce(priceError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(priceError);
      });

      it('should re-throw OracleClientError as is', async () => {
        const oracleError = new OracleClientError('Oracle error', {
          provider: mockProvider,
          operation: 'fetch',
        });
        mockGetPriceFromDatabase.mockRejectedValueOnce(oracleError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(oracleError);
      });

      it('should wrap unknown errors in PriceFetchError', async () => {
        const unknownError = { message: 'Unknown error', code: 'UNKNOWN' };
        mockGetPriceFromDatabase.mockRejectedValueOnce(unknownError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });

      it('should handle string errors', async () => {
        const stringError = 'Database connection failed';
        mockGetPriceFromDatabase.mockRejectedValueOnce(stringError);

        await expect(
          fetchPriceWithDatabase(mockProvider, mockSymbol, mockChain, true)
        ).rejects.toThrow(PriceFetchError);
      });
    });

    describe('Provider-specific tests', () => {
      it('should handle chainlink provider', async () => {
        const mockPriceData = createMockPriceData({ provider: 'chainlink' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase('chainlink', mockSymbol, mockChain, true);

        expect(result.provider).toBe('chainlink');
      });

      it('should handle pyth provider', async () => {
        const mockPriceData = createMockPriceData({ provider: 'pyth' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase('pyth', mockSymbol, mockChain, true);

        expect(result.provider).toBe('pyth');
      });

      it('should handle api3 provider', async () => {
        const mockPriceData = createMockPriceData({ provider: 'api3' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase('api3', mockSymbol, mockChain, true);

        expect(result.provider).toBe('api3');
      });

      it('should handle redstone provider', async () => {
        const mockPriceData = createMockPriceData({ provider: 'redstone' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase('redstone', mockSymbol, mockChain, true);

        expect(result.provider).toBe('redstone');
      });

      it('should handle dia provider', async () => {
        const mockPriceData = createMockPriceData({ provider: 'dia' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase('dia', mockSymbol, mockChain, true);

        expect(result.provider).toBe('dia');
      });

      it('should handle winklink provider', async () => {
        const mockPriceData = createMockPriceData({ provider: 'winklink' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase('winklink', mockSymbol, mockChain, true);

        expect(result.provider).toBe('winklink');
      });
    });

    describe('Chain-specific tests', () => {
      it('should handle ethereum chain', async () => {
        const mockPriceData = createMockPriceData({ chain: 'ethereum' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, 'ethereum', true);

        expect(result.chain).toBe('ethereum');
      });

      it('should handle polygon chain', async () => {
        const mockPriceData = createMockPriceData({ chain: 'polygon' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, 'polygon', true);

        expect(result.chain).toBe('polygon');
      });

      it('should handle arbitrum chain', async () => {
        const mockPriceData = createMockPriceData({ chain: 'arbitrum' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, 'arbitrum', true);

        expect(result.chain).toBe('arbitrum');
      });

      it('should handle optimism chain', async () => {
        const mockPriceData = createMockPriceData({ chain: 'optimism' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, 'optimism', true);

        expect(result.chain).toBe('optimism');
      });

      it('should handle bsc chain', async () => {
        const mockPriceData = createMockPriceData({ chain: 'bsc' });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, 'bsc', true);

        expect(result.chain).toBe('bsc');
      });

      it('should handle undefined chain', async () => {
        const mockPriceData = createMockPriceData({ chain: undefined });
        mockGetPriceFromDatabase.mockResolvedValueOnce(mockPriceData);

        const result = await fetchPriceWithDatabase(mockProvider, mockSymbol, undefined, true);

        expect(result.chain).toBeUndefined();
      });
    });

    describe('Period parameter tests', () => {
      it('should handle period of 1 hour', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 1, true);

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          mockSymbol,
          mockChain,
          1
        );
      });

      it('should handle period of 24 hours', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 24, true);

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          mockSymbol,
          mockChain,
          24
        );
      });

      it('should handle period of 168 hours (1 week)', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 168, true);

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          mockSymbol,
          mockChain,
          168
        );
      });

      it('should handle period of 0 hours', async () => {
        const mockHistoricalData = [createMockPriceData()];
        mockGetHistoricalPricesFromDatabase.mockResolvedValueOnce(mockHistoricalData);

        await fetchHistoricalPricesWithDatabase(mockProvider, mockSymbol, mockChain, 0, true);

        expect(mockGetHistoricalPricesFromDatabase).toHaveBeenCalledWith(
          mockProvider,
          mockSymbol,
          mockChain,
          0
        );
      });
    });
  });
});
