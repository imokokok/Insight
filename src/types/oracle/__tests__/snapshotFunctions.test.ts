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

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
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
      timestamp: Date.now(),
      provider: 'chainlink',
    },
    {
      symbol: 'BTC/USD',
      price: 50100,
      timestamp: Date.now(),
      provider: 'pyth',
    },
  ];

  return {
    timestamp: Date.now(),
    symbol: 'BTC/USD',
    selectedOracles: ['chainlink', 'pyth'],
    priceData: defaultPriceData,
    stats: defaultStats,
    ...overrides,
  };
};

describe('snapshotFunctions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('generateSnapshotId', () => {
    it('应该生成唯一 ID', () => {
      const id1 = generateSnapshotId();
      const id2 = generateSnapshotId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^snapshot-\d+-[a-z0-9]+$/);
    });

    it('应该包含时间戳', () => {
      const beforeTime = Date.now();
      const id = generateSnapshotId();
      const afterTime = Date.now();

      const timestampMatch = id.match(/^snapshot-(\d+)-/);
      expect(timestampMatch).not.toBeNull();

      const timestamp = parseInt(timestampMatch![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('saveSnapshot', () => {
    it('应该保存快照并返回带 ID 的快照', () => {
      const snapshotData = createMockSnapshot();
      const savedSnapshot = saveSnapshot(snapshotData);

      expect(savedSnapshot.id).toBeDefined();
      expect(savedSnapshot.id).toMatch(/^snapshot-/);
      expect(savedSnapshot.timestamp).toBe(snapshotData.timestamp);
      expect(savedSnapshot.symbol).toBe(snapshotData.symbol);
    });

    it('应该将快照保存到 localStorage', () => {
      const snapshotData = createMockSnapshot();
      saveSnapshot(snapshotData);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(Array.isArray(savedData)).toBe(true);
      expect(savedData[0].symbol).toBe('BTC/USD');
    });

    it('应该限制最大快照数量为 10', () => {
      for (let i = 0; i < 15; i++) {
        saveSnapshot(createMockSnapshot({ timestamp: Date.now() + i }));
      }

      const snapshots = getSnapshots();
      expect(snapshots.length).toBe(10);
    });

    it('新快照应该添加到列表开头', () => {
      const firstSnapshot = saveSnapshot(createMockSnapshot({ symbol: 'FIRST/USD' }));
      const secondSnapshot = saveSnapshot(createMockSnapshot({ symbol: 'SECOND/USD' }));

      const snapshots = getSnapshots();
      expect(snapshots[0].id).toBe(secondSnapshot.id);
      expect(snapshots[1].id).toBe(firstSnapshot.id);
    });

    it('应该处理 localStorage 写入错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const snapshotData = createMockSnapshot();
      const result = saveSnapshot(snapshotData);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^snapshot-/);

      consoleSpy.mockRestore();
    });
  });

  describe('getSnapshots', () => {
    it('应该返回空数组当 localStorage 为空时', () => {
      const snapshots = getSnapshots();
      expect(snapshots).toEqual([]);
    });

    it('应该返回所有快照并按时间戳降序排列', () => {
      const now = Date.now();
      const snapshot1 = saveSnapshot(createMockSnapshot({ timestamp: now - 1000 }));
      const snapshot2 = saveSnapshot(createMockSnapshot({ timestamp: now }));
      const snapshot3 = saveSnapshot(createMockSnapshot({ timestamp: now - 500 }));

      const snapshots = getSnapshots();

      expect(snapshots.length).toBe(3);
      expect(snapshots[0].id).toBe(snapshot2.id);
      expect(snapshots[1].id).toBe(snapshot3.id);
      expect(snapshots[2].id).toBe(snapshot1.id);
    });

    it('应该处理 localStorage 读取错误', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json');

      const snapshots = getSnapshots();
      expect(snapshots).toEqual([]);
    });

    it('应该处理 localStorage 返回非数组数据', () => {
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({ not: 'array' }));

      const snapshots = getSnapshots();
      expect(snapshots).toEqual([]);
    });
  });

  describe('getSnapshotById', () => {
    it('应该根据 ID 返回快照', () => {
      const savedSnapshot = saveSnapshot(createMockSnapshot());
      const found = getSnapshotById(savedSnapshot.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(savedSnapshot.id);
    });

    it('应该返回 null 当 ID 不存在时', () => {
      const found = getSnapshotById('non-existent-id');
      expect(found).toBeNull();
    });

    it('应该返回 null 当快照列表为空时', () => {
      const found = getSnapshotById('any-id');
      expect(found).toBeNull();
    });
  });

  describe('deleteSnapshot', () => {
    it('应该成功删除存在的快照', () => {
      const savedSnapshot = saveSnapshot(createMockSnapshot());
      const result = deleteSnapshot(savedSnapshot.id);

      expect(result).toBe(true);

      const found = getSnapshotById(savedSnapshot.id);
      expect(found).toBeNull();
    });

    it('应该返回 false 当快照不存在时', () => {
      const result = deleteSnapshot('non-existent-id');
      expect(result).toBe(false);
    });

    it('应该更新 localStorage 删除后', () => {
      const snapshot1 = saveSnapshot(createMockSnapshot({ symbol: 'FIRST/USD' }));
      const snapshot2 = saveSnapshot(createMockSnapshot({ symbol: 'SECOND/USD' }));

      deleteSnapshot(snapshot1.id);

      const snapshots = getSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(snapshot2.id);
    });

    it('应该处理 localStorage 写入错误', () => {
      const savedSnapshot = saveSnapshot(createMockSnapshot());

      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = deleteSnapshot(savedSnapshot.id);
      expect(result).toBe(false);
    });
  });

  describe('clearAllSnapshots', () => {
    it('应该清除所有快照', () => {
      saveSnapshot(createMockSnapshot());
      saveSnapshot(createMockSnapshot());
      saveSnapshot(createMockSnapshot());

      const result = clearAllSnapshots();

      expect(result).toBe(true);
      expect(getSnapshots()).toEqual([]);
    });

    it('应该调用 localStorage.removeItem', () => {
      clearAllSnapshots();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('oracle-snapshots');
    });

    it('应该处理 localStorage 错误', () => {
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = clearAllSnapshots();
      expect(result).toBe(false);
    });
  });

  describe('compareSnapshots', () => {
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
        timestamp: Date.now(),
        provider: 'chainlink',
      },
    ];

    it('应该正确计算价格变化', () => {
      const currentStats = createStats({ avgPrice: 55000, maxPrice: 56000, minPrice: 54000 });
      const previousStats = createStats({ avgPrice: 50000, maxPrice: 51000, minPrice: 49000 });

      const snapshot: OracleSnapshot = {
        id: 'test-snapshot',
        timestamp: Date.now() - 3600000,
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

    it('应该正确计算 oracle 数量变化', () => {
      const currentPriceData: PriceData[] = [
        { symbol: 'BTC/USD', price: 50000, timestamp: Date.now(), provider: 'chainlink' },
        { symbol: 'BTC/USD', price: 50100, timestamp: Date.now(), provider: 'pyth' },
        { symbol: 'BTC/USD', price: 50200, timestamp: Date.now(), provider: 'api3' },
      ];

      const previousPriceData: PriceData[] = [
        { symbol: 'BTC/USD', price: 50000, timestamp: Date.now(), provider: 'chainlink' },
        { symbol: 'BTC/USD', price: 50100, timestamp: Date.now(), provider: 'pyth' },
      ];

      const snapshot: OracleSnapshot = {
        id: 'test-snapshot',
        timestamp: Date.now() - 3600000,
        symbol: 'BTC/USD',
        selectedOracles: ['chainlink', 'pyth'],
        priceData: previousPriceData,
        stats: createStats(),
      };

      const result = compareSnapshots(createStats(), currentPriceData, 'BTC/USD', snapshot);

      expect(result.oracleCountChange).toBe(1);
    });

    it('应该正确计算统计变化', () => {
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
        timestamp: Date.now() - 3600000,
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

    it('应该处理零值除法', () => {
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
        timestamp: Date.now() - 3600000,
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

    it('应该返回正确的快照元数据', () => {
      const snapshotTimestamp = Date.now() - 3600000;
      const snapshot: OracleSnapshot = {
        id: 'test-snapshot-id',
        timestamp: snapshotTimestamp,
        symbol: 'BTC/USD',
        selectedOracles: ['chainlink'],
        priceData: createPriceData(50000),
        stats: createStats(),
      };

      const result = compareSnapshots(createStats(), createPriceData(50000), 'BTC/USD', snapshot);

      expect(result.snapshotId).toBe('test-snapshot-id');
      expect(result.snapshotTimestamp).toBe(snapshotTimestamp);
    });
  });

  describe('集成测试', () => {
    it('完整的快照生命周期', () => {
      const snapshotData1 = createMockSnapshot({ symbol: 'BTC/USD' });
      const snapshotData2 = createMockSnapshot({ symbol: 'ETH/USD' });

      const saved1 = saveSnapshot(snapshotData1);
      const saved2 = saveSnapshot(snapshotData2);

      expect(getSnapshots().length).toBe(2);

      const found = getSnapshotById(saved1.id);
      expect(found?.symbol).toBe('BTC/USD');

      deleteSnapshot(saved1.id);
      expect(getSnapshots().length).toBe(1);

      clearAllSnapshots();
      expect(getSnapshots().length).toBe(0);
    });

    it('多个快照的排序和限制', () => {
      const timestamps: number[] = [];
      for (let i = 0; i < 12; i++) {
        const timestamp = Date.now() - i * 1000;
        timestamps.push(timestamp);
        saveSnapshot(createMockSnapshot({ timestamp }));
      }

      const snapshots = getSnapshots();

      expect(snapshots.length).toBe(10);

      for (let i = 0; i < snapshots.length - 1; i++) {
        expect(snapshots[i].timestamp).toBeGreaterThanOrEqual(snapshots[i + 1].timestamp);
      }
    });
  });
});
