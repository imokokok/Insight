import {
 generateSnapshotId,
 saveSnapshot,
 getSnapshots,
 getSnapshotById,
 deleteSnapshot,
 clearAllSnapshots,
 compareSnapshots,
} from '../snapshotFunctions';

import type { OracleSnapshot, SnapshotStats, PriceData } from '../snapshot';

const mockLocalStorage = ( => {
 let store: Record<string, string> = {};
 return {
 getItem: jest.fn((key: string) => store[key] || null),
 setItem: jest.fn((key: string, value: string) => {
 store[key] = value;
 }),
 removeItem: jest.fn((key: string) => {
 delete store[key];
 }),
 clear: jest.fn( => {
 store = {};
 }),
 };
});

Object.defineProperty(global, 'localStorage', {
 value: mockLocalStorage,
});

jest.mock('@/lib/utils/logger',  => ({
 createLogger: jest.fn( => ({
 info: jest.fn,
 warn: jest.fn,
 error: jest.fn,
 debug: jest.fn,
 })),
}));

const createMockSnapshot = (
 overrides: Partial<Omit<OracleSnapshot, 'id'>> = {}
): Omit<OracleSnapshot, 'id'> => {
 const defaultStats: SnapshotStats = {
 avgPrice: 50000,
 weightedAvgPrice: 50100,
 maxPrice: 50500,
 minPrice: 49500,
 priceRange: 1000,
 variance: 250000,
 standardDeviation: 500,
 standardDeviationPercent: 1,
 };

 const defaultPriceData: PriceData[] = [
 {
 symbol: 'BTC/USD',
 price: 50000,
 timestamp: Date.now,
 provider: 'chainlink',
 },
 {
 symbol: 'BTC/USD',
 price: 50100,
 timestamp: Date.now,
 provider: 'pyth',
 },
 ];

 return {
 timestamp: Date.now,
 symbol: 'BTC/USD',
 selectedOracles: ['chainlink', 'pyth'],
 priceData: defaultPriceData,
 stats: defaultStats,
 ...overrides,
 };
};

describe('snapshotFunctions',  => {
 beforeEach( => {
 jest.clearAllMocks;
 mockLocalStorage.clear;
 });

 describe('generateSnapshotId',  => {
 it('shouldgenerate ID',  => {
 const id1 = generateSnapshotId;
 const id2 = generateSnapshotId;

 expect(id1).not.toBe(id2);
 expect(id1).toMatch(/^snapshot-\d+-[a-z0-9]+$/);
 });

 it('shouldincludetime',  => {
 const beforeTime = Date.now;
 const id = generateSnapshotId;
 const afterTime = Date.now;

 const timestampMatch = id.match(/^snapshot-(\d+)-/);
 expect(timestampMatch).not.toBeNull;

 const timestamp = parseInt(timestampMatch![1], 10);
 expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
 expect(timestamp).toBeLessThanOrEqual(afterTime);
 });
 });

 describe('saveSnapshot',  => {
 it('shouldsavereturn ID ',  => {
 const snapshotData = createMockSnapshot;
 const savedSnapshot = saveSnapshot(snapshotData);

 expect(savedSnapshot.id).toBeDefined;
 expect(savedSnapshot.id).toMatch(/^snapshot-/);
 expect(savedSnapshot.timestamp).toBe(snapshotData.timestamp);
 expect(savedSnapshot.symbol).toBe(snapshotData.symbol);
 });

 it('shouldwillsaveto localStorage',  => {
 const snapshotData = createMockSnapshot;
 saveSnapshot(snapshotData);

 expect(mockLocalStorage.setItem).toHaveBeenCalled;
 const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
 expect(Array.isArray(savedData)).toBe(true);
 expect(savedData[0].symbol).toBe('BTC/USD');
 });

 it('shouldmaximumcountas 10',  => {
 for (let i = 0; i < 15; i++) {
 saveSnapshot(createMockSnapshot({ timestamp: Date.now + i }));
 }

 const snapshots = getSnapshots;
 expect(snapshots.length).toBe(10);
 });

 it('newshouldaddtolisthead',  => {
 const firstSnapshot = saveSnapshot(createMockSnapshot({ symbol: 'FIRST/USD' }));
 const secondSnapshot = saveSnapshot(createMockSnapshot({ symbol: 'SECOND/USD' }));

 const snapshots = getSnapshots;
 expect(snapshots[0].id).toBe(secondSnapshot.id);
 expect(snapshots[1].id).toBe(firstSnapshot.id);
 });

 it('shouldhandle localStorage writeerror',  => {
 const consoleSpy = jest.spyOn(console, 'error').mockImplementation;
 mockLocalStorage.setItem.mockImplementationOnce( => {
 throw new Error('QuotaExceededError');
 });

 const snapshotData = createMockSnapshot;
 const result = saveSnapshot(snapshotData);

 expect(result).toBeDefined;
 expect(result.id).toMatch(/^snapshot-/);

 consoleSpy.mockRestore;
 });
 });

 describe('getSnapshots',  => {
 it('shouldreturnemptyarraywhen localStorage asempty',  => {
 const snapshots = getSnapshots;
 expect(snapshots).toEqual([]);
 });

 it('shouldreturnallbytime',  => {
 const now = Date.now;
 const snapshot1 = saveSnapshot(createMockSnapshot({ timestamp: now - 1000 }));
 const snapshot2 = saveSnapshot(createMockSnapshot({ timestamp: now }));
 const snapshot3 = saveSnapshot(createMockSnapshot({ timestamp: now - 500 }));

 const snapshots = getSnapshots;

 expect(snapshots.length).toBe(3);
 expect(snapshots[0].id).toBe(snapshot2.id);
 expect(snapshots[1].id).toBe(snapshot3.id);
 expect(snapshots[2].id).toBe(snapshot1.id);
 });

 it('shouldhandle localStorage readerror',  => {
 mockLocalStorage.getItem.mockReturnValueOnce('invalid json');

 const snapshots = getSnapshots;
 expect(snapshots).toEqual([]);
 });

 it('shouldhandle localStorage returnarray',  => {
 mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({ not: 'array' }));

 const snapshots = getSnapshots;
 expect(snapshots).toEqual([]);
 });
 });

 describe('getSnapshotById',  => {
 it('should ID return',  => {
 const savedSnapshot = saveSnapshot(createMockSnapshot);
 const found = getSnapshotById(savedSnapshot.id);

 expect(found).not.toBeNull;
 expect(found?.id).toBe(savedSnapshot.id);
 });

 it('shouldreturn null when ID notin',  => {
 const found = getSnapshotById('non-existent-id');
 expect(found).toBeNull;
 });

 it('shouldreturn null whenlistasempty',  => {
 const found = getSnapshotById('any-id');
 expect(found).toBeNull;
 });
 });

 describe('deleteSnapshot',  => {
 it('shouldsuccessdeletein',  => {
 const savedSnapshot = saveSnapshot(createMockSnapshot);
 const result = deleteSnapshot(savedSnapshot.id);

 expect(result).toBe(true);

 const found = getSnapshotById(savedSnapshot.id);
 expect(found).toBeNull;
 });

 it('shouldreturn false whennotin',  => {
 const result = deleteSnapshot('non-existent-id');
 expect(result).toBe(false);
 });

 it('shouldupdate localStorage deleteafter',  => {
 const snapshot1 = saveSnapshot(createMockSnapshot({ symbol: 'FIRST/USD' }));
 const snapshot2 = saveSnapshot(createMockSnapshot({ symbol: 'SECOND/USD' }));

 deleteSnapshot(snapshot1.id);

 const snapshots = getSnapshots;
 expect(snapshots.length).toBe(1);
 expect(snapshots[0].id).toBe(snapshot2.id);
 });

 it('shouldhandle localStorage writeerror',  => {
 const savedSnapshot = saveSnapshot(createMockSnapshot);

 mockLocalStorage.setItem.mockImplementationOnce( => {
 throw new Error('Storage error');
 });

 const result = deleteSnapshot(savedSnapshot.id);
 expect(result).toBe(false);
 });
 });

 describe('clearAllSnapshots',  => {
 it('shouldall',  => {
 saveSnapshot(createMockSnapshot);
 saveSnapshot(createMockSnapshot);
 saveSnapshot(createMockSnapshot);

 const result = clearAllSnapshots;

 expect(result).toBe(true);
 expect(getSnapshots).toEqual([]);
 });

 it('shoulduse localStorage.removeItem',  => {
 clearAllSnapshots;
 expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('oracle-snapshots');
 });

 it('shouldhandle localStorage error',  => {
 mockLocalStorage.removeItem.mockImplementationOnce( => {
 throw new Error('Storage error');
 });

 const result = clearAllSnapshots;
 expect(result).toBe(false);
 });
 });

 describe('compareSnapshots',  => {
 const createStats = (overrides: Partial<SnapshotStats> = {}): SnapshotStats => ({
 avgPrice: 50000,
 weightedAvgPrice: 50100,
 maxPrice: 50500,
 minPrice: 49500,
 priceRange: 1000,
 variance: 250000,
 standardDeviation: 500,
 standardDeviationPercent: 1,
 ...overrides,
 });

 const createPriceData = (price: number): PriceData[] => [
 {
 symbol: 'BTC/USD',
 price,
 timestamp: Date.now,
 provider: 'chainlink',
 },
 ];

 it('shouldcalculate',  => {
 const currentStats = createStats({ avgPrice: 55000, maxPrice: 56000, minPrice: 54000 });
 const previousStats = createStats({ avgPrice: 50000, maxPrice: 51000, minPrice: 49000 });

 const snapshot: OracleSnapshot = {
 id: 'test-snapshot',
 timestamp: Date.now - 3600000,
 symbol: 'BTC/USD',
 selectedOracles: ['chainlink'],
 priceData: createPriceData(50000),
 stats: previousStats,
 };

 const result = compareSnapshots(currentStats, createPriceData(55000), 'BTC/USD', snapshot);

 expect(result.priceChange.avgPrice).toBe(5000);
 expect(result.priceChange.avgPricePercent).toBe(10);
 expect(result.priceChange.maxPrice).toBe(5000);
 expect(result.priceChange.minPrice).toBe(5000);
 });

 it('shouldcalculate oracle count',  => {
 const currentPriceData: PriceData[] = [
 { symbol: 'BTC/USD', price: 50000, timestamp: Date.now, provider: 'chainlink' },
 { symbol: 'BTC/USD', price: 50100, timestamp: Date.now, provider: 'pyth' },
 { symbol: 'BTC/USD', price: 50200, timestamp: Date.now, provider: 'api3' },
 ];

 const previousPriceData: PriceData[] = [
 { symbol: 'BTC/USD', price: 50000, timestamp: Date.now, provider: 'chainlink' },
 { symbol: 'BTC/USD', price: 50100, timestamp: Date.now, provider: 'pyth' },
 ];

 const snapshot: OracleSnapshot = {
 id: 'test-snapshot',
 timestamp: Date.now - 3600000,
 symbol: 'BTC/USD',
 selectedOracles: ['chainlink', 'pyth'],
 priceData: previousPriceData,
 stats: createStats,
 };

 const result = compareSnapshots(createStats, currentPriceData, 'BTC/USD', snapshot);

 expect(result.oracleCountChange).toBe(1);
 });

 it('shouldcalculate',  => {
 const currentStats = createStats({
 priceRange: 2000,
 standardDeviationPercent: 2,
 variance: 500000,
 });
 const previousStats = createStats({
 priceRange: 1000,
 standardDeviationPercent: 1,
 variance: 250000,
 });

 const snapshot: OracleSnapshot = {
 id: 'test-snapshot',
 timestamp: Date.now - 3600000,
 symbol: 'BTC/USD',
 selectedOracles: ['chainlink'],
 priceData: createPriceData(50000),
 stats: previousStats,
 };

 const result = compareSnapshots(currentStats, createPriceData(50000), 'BTC/USD', snapshot);

 expect(result.statsChange.priceRange).toBe(1000);
 expect(result.statsChange.priceRangePercent).toBe(100);
 expect(result.statsChange.standardDeviationPercent).toBe(1);
 expect(result.statsChange.variance).toBe(250000);
 expect(result.statsChange.variancePercent).toBe(100);
 });

 it('shouldhandlevalue',  => {
 const currentStats = createStats({ avgPrice: 50000 });
 const previousStats = createStats({
 avgPrice: 0,
 maxPrice: 0,
 minPrice: 0,
 priceRange: 0,
 variance: 0,
 standardDeviationPercent: 0,
 });

 const snapshot: OracleSnapshot = {
 id: 'test-snapshot',
 timestamp: Date.now - 3600000,
 symbol: 'BTC/USD',
 selectedOracles: ['chainlink'],
 priceData: createPriceData(50000),
 stats: previousStats,
 };

 const result = compareSnapshots(currentStats, createPriceData(50000), 'BTC/USD', snapshot);

 expect(result.priceChange.avgPricePercent).toBe(0);
 expect(result.priceChange.maxPricePercent).toBe(0);
 expect(result.priceChange.minPricePercent).toBe(0);
 expect(result.statsChange.priceRangePercent).toBe(0);
 expect(result.statsChange.variancePercent).toBe(0);
 });

 it('shouldreturnmetadata',  => {
 const snapshotTimestamp = Date.now - 3600000;
 const snapshot: OracleSnapshot = {
 id: 'test-snapshot-id',
 timestamp: snapshotTimestamp,
 symbol: 'BTC/USD',
 selectedOracles: ['chainlink'],
 priceData: createPriceData(50000),
 stats: createStats,
 };

 const result = compareSnapshots(createStats, createPriceData(50000), 'BTC/USD', snapshot);

 expect(result.snapshotId).toBe('test-snapshot-id');
 expect(result.snapshotTimestamp).toBe(snapshotTimestamp);
 });
 });

 describe('test',  => {
 it('periodic',  => {
 const snapshotData1 = createMockSnapshot({ symbol: 'BTC/USD' });
 const snapshotData2 = createMockSnapshot({ symbol: 'ETH/USD' });

 const saved1 = saveSnapshot(snapshotData1);
 saveSnapshot(snapshotData2);

 expect(getSnapshots.length).toBe(2);

 const found = getSnapshotById(saved1.id);
 expect(found?.symbol).toBe('BTC/USD');

 deleteSnapshot(saved1.id);
 expect(getSnapshots.length).toBe(1);

 clearAllSnapshots;
 expect(getSnapshots.length).toBe(0);
 });

 it('sortand',  => {
 const timestamps: number[] = [];
 for (let i = 0; i < 12; i++) {
 const timestamp = Date.now - i * 1000;
 timestamps.push(timestamp);
 saveSnapshot(createMockSnapshot({ timestamp }));
 }

 const snapshots = getSnapshots;

 expect(snapshots.length).toBe(10);

 for (let i = 0; i < snapshots.length - 1; i++) {
 expect(snapshots[i].timestamp).toBeGreaterThanOrEqual(snapshots[i + 1].timestamp);
 }
 });
 });
});
