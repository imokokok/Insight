import { renderHook, act } from '@testing-library/react';
import { usePriceQueryState } from '../usePriceQueryState';
import { OracleProvider, Blockchain } from '@/lib/oracles';

jest.mock('@/hooks', () => ({
  usePreferences: () => ({
    preferences: {
      defaultOracle: 'chainlink',
      defaultSymbol: 'BTC/USD',
      defaultTimeRange: '24h',
    },
    isLoading: false,
  }),
}));

const mockReplaceState = jest.fn();

describe('usePriceQueryState', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/price-query' },
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { replaceState: mockReplaceState },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  describe('状态初始化', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePriceQueryState());

      expect(result.current.selectedOracles).toEqual([OracleProvider.CHAINLINK]);
      expect(result.current.selectedChains).toEqual([Blockchain.ETHEREUM]);
      expect(result.current.selectedSymbol).toBe('BTC');
      expect(result.current.selectedTimeRange).toBe(24);
      expect(result.current.filterText).toBe('');
      expect(result.current.sortField).toBe('oracle');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.hiddenSeries).toBeInstanceOf(Set);
      expect(result.current.hiddenSeries.size).toBe(0);
      expect(result.current.isCompareMode).toBe(false);
      expect(result.current.compareTimeRange).toBe(24);
      expect(result.current.showBaseline).toBe(false);
      expect(result.current.selectedRow).toBeNull();
    });

    it('should initialize timeComparisonConfig with default values', () => {
      const { result } = renderHook(() => usePriceQueryState());

      expect(result.current.timeComparisonConfig.comparisonType).toBe('previous');
      expect(result.current.timeComparisonConfig.primaryPeriod.range).toBe('24h');
      expect(result.current.timeComparisonConfig.comparisonPeriod.range).toBe('24h');
    });

    it('should initialize refs with default values', () => {
      const { result } = renderHook(() => usePriceQueryState());

      expect(result.current.selectedOraclesRef.current).toEqual([OracleProvider.CHAINLINK]);
      expect(result.current.selectedChainsRef.current).toEqual([Blockchain.ETHEREUM]);
      expect(result.current.selectedSymbolRef.current).toBe('BTC');
      expect(result.current.selectedTimeRangeRef.current).toBe(24);
      expect(result.current.isCompareModeRef.current).toBe(false);
      expect(result.current.compareTimeRangeRef.current).toBe(24);
    });
  });

  describe('状态更新', () => {
    it('should update selectedOracles', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedOracles([OracleProvider.PYTH, OracleProvider.BAND_PROTOCOL]);
      });

      expect(result.current.selectedOracles).toEqual([OracleProvider.PYTH, OracleProvider.BAND_PROTOCOL]);
      expect(result.current.selectedOraclesRef.current).toEqual([OracleProvider.PYTH, OracleProvider.BAND_PROTOCOL]);
    });

    it('should update selectedChains', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedChains([Blockchain.ARBITRUM, Blockchain.POLYGON]);
      });

      expect(result.current.selectedChains).toEqual([Blockchain.ARBITRUM, Blockchain.POLYGON]);
      expect(result.current.selectedChainsRef.current).toEqual([Blockchain.ARBITRUM, Blockchain.POLYGON]);
    });

    it('should update selectedSymbol', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedSymbol('ETH');
      });

      expect(result.current.selectedSymbol).toBe('ETH');
      expect(result.current.selectedSymbolRef.current).toBe('ETH');
    });

    it('should update selectedTimeRange', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedTimeRange(168);
      });

      expect(result.current.selectedTimeRange).toBe(168);
      expect(result.current.selectedTimeRangeRef.current).toBe(168);
    });

    it('should update filterText', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setFilterText('chainlink');
      });

      expect(result.current.filterText).toBe('chainlink');
    });

    it('should update isCompareMode', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setIsCompareMode(true);
      });

      expect(result.current.isCompareMode).toBe(true);
      expect(result.current.isCompareModeRef.current).toBe(true);
    });

    it('should update compareTimeRange', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setCompareTimeRange(72);
      });

      expect(result.current.compareTimeRange).toBe(72);
      expect(result.current.compareTimeRangeRef.current).toBe(72);
    });

    it('should update showBaseline', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setShowBaseline(true);
      });

      expect(result.current.showBaseline).toBe(true);
    });

    it('should update selectedRow', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedRow('row-1');
      });

      expect(result.current.selectedRow).toBe('row-1');
    });

    it('should update timeComparisonConfig', () => {
      const { result } = renderHook(() => usePriceQueryState());
      const newConfig = {
        primaryPeriod: {
          id: 'primary-7d',
          label: 'Last 7d',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-07'),
          range: '7d' as const,
        },
        comparisonPeriod: {
          id: 'comparison-7d',
          label: 'Previous 7d',
          startDate: new Date('2023-12-25'),
          endDate: new Date('2024-01-01'),
          range: '7d' as const,
        },
        comparisonType: 'year_over_year' as const,
      };

      act(() => {
        result.current.setTimeComparisonConfig(newConfig);
      });

      expect(result.current.timeComparisonConfig).toEqual(newConfig);
    });
  });

  describe('排序逻辑', () => {
    it('should handle sort with same field - toggle direction', () => {
      const { result } = renderHook(() => usePriceQueryState());

      expect(result.current.sortField).toBe('oracle');
      expect(result.current.sortDirection).toBe('asc');

      act(() => {
        result.current.handleSort('oracle');
      });

      expect(result.current.sortField).toBe('oracle');
      expect(result.current.sortDirection).toBe('desc');

      act(() => {
        result.current.handleSort('oracle');
      });

      expect(result.current.sortField).toBe('oracle');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should handle sort with different field - reset to asc', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.handleSort('oracle');
      });

      expect(result.current.sortDirection).toBe('desc');

      act(() => {
        result.current.handleSort('price');
      });

      expect(result.current.sortField).toBe('price');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should handle sort for all valid fields', () => {
      const { result } = renderHook(() => usePriceQueryState());
      const fields: Array<'oracle' | 'blockchain' | 'price' | 'timestamp'> = ['oracle', 'blockchain', 'price', 'timestamp'];

      fields.forEach((field) => {
        act(() => {
          result.current.handleSort(field);
        });

        expect(result.current.sortField).toBe(field);
        expect(result.current.sortDirection).toBe('asc');
      });
    });
  });

  describe('toggleSeries', () => {
    it('should add series to hiddenSeries when not present', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.toggleSeries('chainlink-eth');
      });

      expect(result.current.hiddenSeries.has('chainlink-eth')).toBe(true);
    });

    it('should remove series from hiddenSeries when present', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.toggleSeries('chainlink-eth');
      });
      expect(result.current.hiddenSeries.has('chainlink-eth')).toBe(true);

      act(() => {
        result.current.toggleSeries('chainlink-eth');
      });
      expect(result.current.hiddenSeries.has('chainlink-eth')).toBe(false);
    });

    it('should handle multiple series toggles independently', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.toggleSeries('chainlink-eth');
        result.current.toggleSeries('pyth-eth');
      });

      expect(result.current.hiddenSeries.has('chainlink-eth')).toBe(true);
      expect(result.current.hiddenSeries.has('pyth-eth')).toBe(true);
      expect(result.current.hiddenSeries.size).toBe(2);

      act(() => {
        result.current.toggleSeries('chainlink-eth');
      });

      expect(result.current.hiddenSeries.has('chainlink-eth')).toBe(false);
      expect(result.current.hiddenSeries.has('pyth-eth')).toBe(true);
      expect(result.current.hiddenSeries.size).toBe(1);
    });

    it('should replace hiddenSeries via setHiddenSeries', () => {
      const { result } = renderHook(() => usePriceQueryState());

      const newSet = new Set(['series-1', 'series-2', 'series-3']);
      act(() => {
        result.current.setHiddenSeries(newSet);
      });

      expect(result.current.hiddenSeries).toEqual(newSet);
    });
  });

  describe('URL 参数解析', () => {
    it('should set urlParamsParsed to true after mount', async () => {
      const { result } = renderHook(() => usePriceQueryState());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.urlParamsParsed).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('should handle empty oracle selection', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedOracles([]);
      });

      expect(result.current.selectedOracles).toEqual([]);
    });

    it('should handle empty chain selection', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedChains([]);
      });

      expect(result.current.selectedChains).toEqual([]);
    });

    it('should handle empty symbol', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedSymbol('');
      });

      expect(result.current.selectedSymbol).toBe('');
    });

    it('should handle zero time range', () => {
      const { result } = renderHook(() => usePriceQueryState());

      act(() => {
        result.current.setSelectedTimeRange(0);
      });

      expect(result.current.selectedTimeRange).toBe(0);
    });

    it('should handle very long filter text', () => {
      const { result } = renderHook(() => usePriceQueryState());
      const longText = 'a'.repeat(1000);

      act(() => {
        result.current.setFilterText(longText);
      });

      expect(result.current.filterText).toBe(longText);
    });

    it('should handle special characters in filter text', () => {
      const { result } = renderHook(() => usePriceQueryState());
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

      act(() => {
        result.current.setFilterText(specialChars);
      });

      expect(result.current.filterText).toBe(specialChars);
    });

    it('should handle unicode characters in filter text', () => {
      const { result } = renderHook(() => usePriceQueryState());
      const unicodeText = '测试 🚀 ñ 中文';

      act(() => {
        result.current.setFilterText(unicodeText);
      });

      expect(result.current.filterText).toBe(unicodeText);
    });
  });

  describe('返回值完整性', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => usePriceQueryState());

      const expectedProperties = [
        'selectedOracles',
        'setSelectedOracles',
        'selectedChains',
        'setSelectedChains',
        'selectedSymbol',
        'setSelectedSymbol',
        'selectedTimeRange',
        'setSelectedTimeRange',
        'filterText',
        'setFilterText',
        'sortField',
        'sortDirection',
        'hiddenSeries',
        'setHiddenSeries',
        'isCompareMode',
        'setIsCompareMode',
        'compareTimeRange',
        'setCompareTimeRange',
        'showBaseline',
        'setShowBaseline',
        'timeComparisonConfig',
        'setTimeComparisonConfig',
        'urlParamsParsed',
        'selectedRow',
        'setSelectedRow',
        'toggleSeries',
        'handleSort',
        'selectedOraclesRef',
        'selectedChainsRef',
        'selectedSymbolRef',
        'selectedTimeRangeRef',
        'isCompareModeRef',
        'compareTimeRangeRef',
      ];

      expectedProperties.forEach((prop) => {
        expect(result.current).toHaveProperty(prop);
      });
    });
  });
});
