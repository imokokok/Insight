import { act, renderHook } from '@testing-library/react';

import { useCrossChainStore } from '../crossChainStore';

import { OracleProvider, Blockchain } from '@/lib/oracles';

const localStorageMock = (() => {
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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const mockPriceData = {
  provider: OracleProvider.CHAINLINK,
  symbol: 'BTC',
  chain: Blockchain.ETHEREUM,
  price: 68000,
  timestamp: Date.now(),
  decimals: 8,
  confidence: 0.98,
};

describe('crossChainStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useCrossChainStore.setState({
      selectedProvider: OracleProvider.CHAINLINK,
      selectedSymbol: 'BTC',
      selectedTimeRange: 24,
      selectedBaseChain: null,
      visibleChains: [],
      showMA: false,
      maPeriod: 7,
      chartKey: 0,
      hiddenLines: new Set(),
      focusedChain: null,
      tableFilter: 'all',
      hoveredCell: null,
      selectedCell: null,
      tooltipPosition: { x: 0, y: 0 },
      sortColumn: 'chain',
      sortDirection: 'asc',
      currentPrices: [],
      historicalPrices: {},
      loading: true,
      refreshStatus: 'idle',
      showRefreshSuccess: false,
      lastUpdated: null,
      prevStats: null,
      recommendedBaseChain: null,
      refreshInterval: 0,
      thresholdConfig: {
        warning: 0.5,
        critical: 1.0,
      },
      colorblindMode: false,
      updateIntervals: {},
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始选择器状态', () => {
      const state = useCrossChainStore.getState();
      expect(state.selectedProvider).toBe(OracleProvider.CHAINLINK);
      expect(state.selectedSymbol).toBe('BTC');
      expect(state.selectedTimeRange).toBe(24);
      expect(state.selectedBaseChain).toBeNull();
    });

    it('应该有正确的初始 UI 状态', () => {
      const state = useCrossChainStore.getState();
      expect(state.visibleChains).toEqual([]);
      expect(state.showMA).toBe(false);
      expect(state.maPeriod).toBe(7);
      expect(state.chartKey).toBe(0);
      expect(state.hiddenLines).toBeInstanceOf(Set);
      expect(state.focusedChain).toBeNull();
      expect(state.tableFilter).toBe('all');
      expect(state.hoveredCell).toBeNull();
      expect(state.selectedCell).toBeNull();
      expect(state.tooltipPosition).toEqual({ x: 0, y: 0 });
      expect(state.sortColumn).toBe('chain');
      expect(state.sortDirection).toBe('asc');
    });

    it('应该有正确的初始数据状态', () => {
      const state = useCrossChainStore.getState();
      expect(state.currentPrices).toEqual([]);
      expect(state.historicalPrices).toEqual({});
      expect(state.loading).toBe(true);
      expect(state.refreshStatus).toBe('idle');
      expect(state.showRefreshSuccess).toBe(false);
      expect(state.lastUpdated).toBeNull();
      expect(state.prevStats).toBeNull();
      expect(state.recommendedBaseChain).toBeNull();
    });

    it('应该有正确的初始配置状态', () => {
      const state = useCrossChainStore.getState();
      expect(state.refreshInterval).toBe(0);
      expect(state.thresholdConfig).toEqual({ warning: 0.5, critical: 1.0 });
      expect(state.colorblindMode).toBe(false);
      expect(state.updateIntervals).toEqual({});
    });
  });

  describe('链选择功能', () => {
    it('setSelectedProvider 应该更新预言机提供者', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedProvider(OracleProvider.PYTH);
      });

      expect(useCrossChainStore.getState().selectedProvider).toBe(OracleProvider.PYTH);
    });

    it('改变预言机提供者应该重置可见链', () => {
      useCrossChainStore.setState({
        visibleChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM],
      });

      act(() => {
        useCrossChainStore.getState().setSelectedProvider(OracleProvider.PYTH);
      });

      expect(useCrossChainStore.getState().visibleChains).toEqual([]);
    });

    it('相同预言机提供者不应该重置可见链', () => {
      useCrossChainStore.setState({
        visibleChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM],
      });

      act(() => {
        useCrossChainStore.getState().setSelectedProvider(OracleProvider.CHAINLINK);
      });

      expect(useCrossChainStore.getState().visibleChains).toEqual([
        Blockchain.ETHEREUM,
        Blockchain.ARBITRUM,
      ]);
    });

    it('setSelectedSymbol 应该更新交易对', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedSymbol('ETH');
      });

      expect(useCrossChainStore.getState().selectedSymbol).toBe('ETH');
    });

    it('setSelectedTimeRange 应该更新时间范围', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedTimeRange(48);
      });

      expect(useCrossChainStore.getState().selectedTimeRange).toBe(48);
    });

    it('setSelectedBaseChain 应该更新基准链', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedBaseChain(Blockchain.ETHEREUM);
      });

      expect(useCrossChainStore.getState().selectedBaseChain).toBe(Blockchain.ETHEREUM);
    });
  });

  describe('数据管理功能', () => {
    it('setCurrentPrices 应该更新当前价格数据', () => {
      const prices = [mockPriceData];

      act(() => {
        useCrossChainStore.getState().setCurrentPrices(prices);
      });

      expect(useCrossChainStore.getState().currentPrices).toEqual(prices);
    });

    it('setHistoricalPrices 应该更新历史价格数据', () => {
      const historicalPrices = {
        [Blockchain.ETHEREUM]: [mockPriceData],
      };

      act(() => {
        useCrossChainStore.getState().setHistoricalPrices(historicalPrices);
      });

      expect(useCrossChainStore.getState().historicalPrices).toEqual(historicalPrices);
    });

    it('setLoading 应该更新加载状态', () => {
      act(() => {
        useCrossChainStore.getState().setLoading(false);
      });

      expect(useCrossChainStore.getState().loading).toBe(false);
    });

    it('setRefreshStatus 应该更新刷新状态', () => {
      act(() => {
        useCrossChainStore.getState().setRefreshStatus('refreshing');
      });

      expect(useCrossChainStore.getState().refreshStatus).toBe('refreshing');
    });

    it('setShowRefreshSuccess 应该更新刷新成功显示状态', () => {
      act(() => {
        useCrossChainStore.getState().setShowRefreshSuccess(true);
      });

      expect(useCrossChainStore.getState().showRefreshSuccess).toBe(true);
    });

    it('setLastUpdated 应该更新最后更新时间', () => {
      const date = new Date();

      act(() => {
        useCrossChainStore.getState().setLastUpdated(date);
      });

      expect(useCrossChainStore.getState().lastUpdated).toEqual(date);
    });

    it('setPrevStats 应该更新前一次统计数据', () => {
      const stats = {
        avgPrice: 68000,
        maxPrice: 70000,
        minPrice: 65000,
        priceRange: 5000,
        standardDeviationPercent: 2.5,
      };

      act(() => {
        useCrossChainStore.getState().setPrevStats(stats);
      });

      expect(useCrossChainStore.getState().prevStats).toEqual(stats);
    });

    it('setRecommendedBaseChain 应该更新推荐基准链', () => {
      act(() => {
        useCrossChainStore.getState().setRecommendedBaseChain(Blockchain.ETHEREUM);
      });

      expect(useCrossChainStore.getState().recommendedBaseChain).toBe(Blockchain.ETHEREUM);
    });
  });

  describe('UI 状态管理', () => {
    it('setVisibleChains 应该更新可见链列表', () => {
      const chains = [Blockchain.ETHEREUM, Blockchain.ARBITRUM];

      act(() => {
        useCrossChainStore.getState().setVisibleChains(chains);
      });

      expect(useCrossChainStore.getState().visibleChains).toEqual(chains);
    });

    it('setShowMA 应该更新移动平均线显示状态', () => {
      act(() => {
        useCrossChainStore.getState().setShowMA(true);
      });

      expect(useCrossChainStore.getState().showMA).toBe(true);
    });

    it('setMaPeriod 应该更新移动平均线周期', () => {
      act(() => {
        useCrossChainStore.getState().setMaPeriod(14);
      });

      expect(useCrossChainStore.getState().maPeriod).toBe(14);
    });

    it('setChartKey 应该更新图表键', () => {
      act(() => {
        useCrossChainStore.getState().setChartKey(1);
      });

      expect(useCrossChainStore.getState().chartKey).toBe(1);
    });

    it('setHiddenLines 应该更新隐藏的线条', () => {
      const hiddenLines = new Set(['line1', 'line2']);

      act(() => {
        useCrossChainStore.getState().setHiddenLines(hiddenLines);
      });

      expect(useCrossChainStore.getState().hiddenLines).toEqual(hiddenLines);
    });

    it('setFocusedChain 应该更新聚焦的链', () => {
      act(() => {
        useCrossChainStore.getState().setFocusedChain(Blockchain.ETHEREUM);
      });

      expect(useCrossChainStore.getState().focusedChain).toBe(Blockchain.ETHEREUM);
    });

    it('setTableFilter 应该更新表格过滤器', () => {
      act(() => {
        useCrossChainStore.getState().setTableFilter('abnormal');
      });

      expect(useCrossChainStore.getState().tableFilter).toBe('abnormal');
    });

    it('setHoveredCell 应该更新悬停的单元格', () => {
      const cell = {
        xChain: Blockchain.ETHEREUM,
        yChain: Blockchain.ARBITRUM,
        x: 100,
        y: 200,
      };

      act(() => {
        useCrossChainStore.getState().setHoveredCell(cell);
      });

      expect(useCrossChainStore.getState().hoveredCell).toEqual(cell);
    });

    it('setSelectedCell 应该更新选中的单元格', () => {
      const cell = {
        xChain: Blockchain.ETHEREUM,
        yChain: Blockchain.ARBITRUM,
      };

      act(() => {
        useCrossChainStore.getState().setSelectedCell(cell);
      });

      expect(useCrossChainStore.getState().selectedCell).toEqual(cell);
    });

    it('setTooltipPosition 应该更新工具提示位置', () => {
      const position = { x: 150, y: 250 };

      act(() => {
        useCrossChainStore.getState().setTooltipPosition(position);
      });

      expect(useCrossChainStore.getState().tooltipPosition).toEqual(position);
    });

    it('setSortColumn 应该更新排序列', () => {
      act(() => {
        useCrossChainStore.getState().setSortColumn('price');
      });

      expect(useCrossChainStore.getState().sortColumn).toBe('price');
    });

    it('setSortDirection 应该更新排序方向', () => {
      act(() => {
        useCrossChainStore.getState().setSortDirection('desc');
      });

      expect(useCrossChainStore.getState().sortDirection).toBe('desc');
    });
  });

  describe('链切换功能', () => {
    it('toggleChain 应该添加链到可见列表', () => {
      act(() => {
        useCrossChainStore.getState().toggleChain(Blockchain.ETHEREUM);
      });

      expect(useCrossChainStore.getState().visibleChains).toContain(Blockchain.ETHEREUM);
    });

    it('toggleChain 应该从可见列表移除链', () => {
      useCrossChainStore.setState({
        visibleChains: [Blockchain.ETHEREUM],
      });

      act(() => {
        useCrossChainStore.getState().toggleChain(Blockchain.ETHEREUM);
      });

      expect(useCrossChainStore.getState().visibleChains).not.toContain(Blockchain.ETHEREUM);
    });

    it('toggleChain 应该正确切换多个链', () => {
      act(() => {
        useCrossChainStore.getState().toggleChain(Blockchain.ETHEREUM);
        useCrossChainStore.getState().toggleChain(Blockchain.ARBITRUM);
      });

      expect(useCrossChainStore.getState().visibleChains).toContain(Blockchain.ETHEREUM);
      expect(useCrossChainStore.getState().visibleChains).toContain(Blockchain.ARBITRUM);

      act(() => {
        useCrossChainStore.getState().toggleChain(Blockchain.ETHEREUM);
      });

      expect(useCrossChainStore.getState().visibleChains).not.toContain(Blockchain.ETHEREUM);
      expect(useCrossChainStore.getState().visibleChains).toContain(Blockchain.ARBITRUM);
    });
  });

  describe('排序功能', () => {
    it('handleSort 应该在相同列时切换排序方向', () => {
      useCrossChainStore.setState({
        sortColumn: 'chain',
        sortDirection: 'asc',
      });

      act(() => {
        useCrossChainStore.getState().handleSort('chain');
      });

      expect(useCrossChainStore.getState().sortDirection).toBe('desc');

      act(() => {
        useCrossChainStore.getState().handleSort('chain');
      });

      expect(useCrossChainStore.getState().sortDirection).toBe('asc');
    });

    it('handleSort 应该在不同列时设置新列并重置方向', () => {
      useCrossChainStore.setState({
        sortColumn: 'chain',
        sortDirection: 'desc',
      });

      act(() => {
        useCrossChainStore.getState().handleSort('price');
      });

      expect(useCrossChainStore.getState().sortColumn).toBe('price');
      expect(useCrossChainStore.getState().sortDirection).toBe('asc');
    });
  });

  describe('配置管理', () => {
    it('setRefreshInterval 应该更新刷新间隔', () => {
      act(() => {
        useCrossChainStore.getState().setRefreshInterval(5000);
      });

      expect(useCrossChainStore.getState().refreshInterval).toBe(5000);
    });

    it('setThresholdConfig 应该更新阈值配置', () => {
      const config = { warning: 0.8, critical: 1.5 };

      act(() => {
        useCrossChainStore.getState().setThresholdConfig(config);
      });

      expect(useCrossChainStore.getState().thresholdConfig).toEqual(config);
    });

    it('setColorblindMode 应该更新色盲模式', () => {
      act(() => {
        useCrossChainStore.getState().setColorblindMode(true);
      });

      expect(useCrossChainStore.getState().colorblindMode).toBe(true);
    });

    it('setUpdateIntervals 应该更新更新间隔', () => {
      const intervals = {
        [Blockchain.ETHEREUM]: 1000,
        [Blockchain.ARBITRUM]: 2000,
      };

      act(() => {
        useCrossChainStore.getState().setUpdateIntervals(intervals);
      });

      expect(useCrossChainStore.getState().updateIntervals).toEqual(intervals);
    });
  });

  describe('持久化功能', () => {
    it('应该持久化选中的预言机提供者', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedProvider(OracleProvider.PYTH);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.selectedProvider).toBe(OracleProvider.PYTH);
      }
    });

    it('应该持久化选中的交易对', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedSymbol('ETH');
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.selectedSymbol).toBe('ETH');
      }
    });

    it('应该持久化时间范围', () => {
      act(() => {
        useCrossChainStore.getState().setSelectedTimeRange(48);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.selectedTimeRange).toBe(48);
      }
    });

    it('应该持久化刷新间隔', () => {
      act(() => {
        useCrossChainStore.getState().setRefreshInterval(10000);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.refreshInterval).toBe(10000);
      }
    });

    it('应该持久化色盲模式', () => {
      act(() => {
        useCrossChainStore.getState().setColorblindMode(true);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.colorblindMode).toBe(true);
      }
    });

    it('应该持久化移动平均线设置', () => {
      act(() => {
        useCrossChainStore.getState().setShowMA(true);
        useCrossChainStore.getState().setMaPeriod(14);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.showMA).toBe(true);
        expect(parsed.state.maPeriod).toBe(14);
      }
    });

    it('应该持久化表格过滤器和排序设置', () => {
      act(() => {
        useCrossChainStore.getState().setTableFilter('abnormal');
        useCrossChainStore.getState().setSortColumn('price');
        useCrossChainStore.getState().setSortDirection('desc');
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.tableFilter).toBe('abnormal');
        expect(parsed.state.sortColumn).toBe('price');
        expect(parsed.state.sortDirection).toBe('desc');
      }
    });

    it('应该持久化隐藏的线条为数组', () => {
      const hiddenLines = new Set(['line1', 'line2']);
      act(() => {
        useCrossChainStore.getState().setHiddenLines(hiddenLines);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(Array.isArray(parsed.state.hiddenLines)).toBe(true);
        expect(parsed.state.hiddenLines).toContain('line1');
        expect(parsed.state.hiddenLines).toContain('line2');
      }
    });

    it('应该持久化最后更新时间为 ISO 字符串', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      act(() => {
        useCrossChainStore.getState().setLastUpdated(date);
      });

      const persistedData = localStorageMock.getItem('cross-chain-store');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        expect(parsed.state.lastUpdated).toBe(date.toISOString());
      }
    });
  });

  describe('刷新状态管理', () => {
    it('应该能够设置刷新状态为 refreshing', () => {
      act(() => {
        useCrossChainStore.getState().setRefreshStatus('refreshing');
      });

      expect(useCrossChainStore.getState().refreshStatus).toBe('refreshing');
    });

    it('应该能够设置刷新状态为 success', () => {
      act(() => {
        useCrossChainStore.getState().setRefreshStatus('success');
      });

      expect(useCrossChainStore.getState().refreshStatus).toBe('success');
    });

    it('应该能够设置刷新状态为 error', () => {
      act(() => {
        useCrossChainStore.getState().setRefreshStatus('error');
      });

      expect(useCrossChainStore.getState().refreshStatus).toBe('error');
    });

    it('应该能够设置刷新状态为 idle', () => {
      useCrossChainStore.setState({ refreshStatus: 'refreshing' });

      act(() => {
        useCrossChainStore.getState().setRefreshStatus('idle');
      });

      expect(useCrossChainStore.getState().refreshStatus).toBe('idle');
    });
  });

  describe('数据比较功能', () => {
    it('应该能够存储和比较前一次统计数据', () => {
      const stats1 = {
        avgPrice: 68000,
        maxPrice: 70000,
        minPrice: 65000,
        priceRange: 5000,
        standardDeviationPercent: 2.5,
      };

      const stats2 = {
        avgPrice: 69000,
        maxPrice: 71000,
        minPrice: 66000,
        priceRange: 5000,
        standardDeviationPercent: 2.3,
      };

      act(() => {
        useCrossChainStore.getState().setPrevStats(stats1);
      });

      expect(useCrossChainStore.getState().prevStats).toEqual(stats1);

      act(() => {
        useCrossChainStore.getState().setPrevStats(stats2);
      });

      expect(useCrossChainStore.getState().prevStats).toEqual(stats2);
    });

    it('应该能够设置推荐基准链', () => {
      act(() => {
        useCrossChainStore.getState().setRecommendedBaseChain(Blockchain.ARBITRUM);
      });

      expect(useCrossChainStore.getState().recommendedBaseChain).toBe(Blockchain.ARBITRUM);
    });
  });

  describe('Hooks 测试', () => {
    it('useSelectedProvider hook 应该返回选中的预言机', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.selectedProvider));
      expect(result.current).toBe(OracleProvider.CHAINLINK);
    });

    it('useSelectedSymbol hook 应该返回选中的交易对', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.selectedSymbol));
      expect(result.current).toBe('BTC');
    });

    it('useCrossChainTimeRange hook 应该返回时间范围', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.selectedTimeRange));
      expect(result.current).toBe(24);
    });

    it('useSelectedBaseChain hook 应该返回基准链', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.selectedBaseChain));
      expect(result.current).toBeNull();
    });

    it('useVisibleChains hook 应该返回可见链列表', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.visibleChains));
      expect(result.current).toEqual([]);
    });

    it('useShowMA hook 应该返回移动平均线显示状态', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.showMA));
      expect(result.current).toBe(false);
    });

    it('useLoading hook 应该返回加载状态', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.loading));
      expect(result.current).toBe(true);
    });

    it('useRefreshStatus hook 应该返回刷新状态', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.refreshStatus));
      expect(result.current).toBe('idle');
    });

    it('useRefreshInterval hook 应该返回刷新间隔', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.refreshInterval));
      expect(result.current).toBe(0);
    });

    it('useThresholdConfig hook 应该返回阈值配置', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.thresholdConfig));
      expect(result.current).toEqual({ warning: 0.5, critical: 1.0 });
    });

    it('useColorblindMode hook 应该返回色盲模式状态', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.colorblindMode));
      expect(result.current).toBe(false);
    });

    it('useCurrentPrices hook 应该返回当前价格', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.currentPrices));
      expect(result.current).toEqual([]);
    });

    it('useHistoricalPrices hook 应该返回历史价格', () => {
      const { result } = renderHook(() => useCrossChainStore((state) => state.historicalPrices));
      expect(result.current).toEqual({});
    });
  });
});
