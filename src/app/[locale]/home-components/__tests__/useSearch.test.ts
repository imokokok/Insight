import { renderHook, act } from '@testing-library/react';

import { useSearch } from '../hooks/useSearch';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/constants/searchConfig', () => ({
  searchAll: (query: string) => {
    if (query.toLowerCase() === 'btc') {
      return [
        {
          item: { type: 'token', symbol: 'BTC', name: 'Bitcoin', path: '/price-query?symbol=BTC' },
          matches: [],
          score: 1,
        },
      ];
    }
    return [];
  },
  getTokenSymbol: (query: string) => {
    const upper = query.toUpperCase();
    if (['BTC', 'ETH', 'USDT'].includes(upper)) {
      return upper;
    }
    return null;
  },
}));

jest.mock('@/lib/utils/searchHistory', () => ({
  getSearchHistory: () => [
    { symbol: 'ETH', timestamp: Date.now() },
    { symbol: 'BTC', timestamp: Date.now() - 1000 },
  ],
  saveSearchHistory: jest.fn(),
  clearSearchHistory: jest.fn(),
  removeFromSearchHistory: jest.fn(),
}));

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchHistory.length).toBe(2);
      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('搜索词管理', () => {
    it('setSearchQuery 应该更新搜索词', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.searchQuery).toBe('BTC');
    });

    it('更新搜索词应该更新搜索结果', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('BTC');
      });

      expect(result.current.searchResults.length).toBe(1);
    });

    it('空搜索词应该返回空结果', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setSearchQuery('   ');
      });

      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('搜索处理', () => {
    it('handleSearch 使用字符串应该导航到价格查询页面', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleSearch('BTC');
      });

      expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=BTC');
    });

    it('handleSearch 应该规范化代币符号', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleSearch('btc');
      });

      expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=BTC');
    });

    it('handleSearch 使用空字符串不应该导航', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleSearch('   ');
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handleSearch 使用搜索结果应该导航到正确路径', () => {
      const { result } = renderHook(() => useSearch());

      const searchResult = {
        item: { type: 'token', symbol: 'ETH', name: 'Ethereum', path: '/price-query?symbol=ETH' },
        matches: [],
        score: 1,
      };

      act(() => {
        result.current.handleSearch(searchResult);
      });

      expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=ETH');
    });
  });

  describe('历史记录管理', () => {
    it('handleClearHistory 应该调用 clearSearchHistory', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleClearHistory();
      });

      const { clearSearchHistory } = jest.requireMock('@/lib/utils/searchHistory');
      expect(clearSearchHistory).toHaveBeenCalled();
    });

    it('handleRemoveHistoryItem 应该调用 removeFromSearchHistory', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.handleRemoveHistoryItem('ETH');
      });

      const { removeFromSearchHistory } = jest.requireMock('@/lib/utils/searchHistory');
      expect(removeFromSearchHistory).toHaveBeenCalledWith('ETH');
    });
  });

  describe('工具函数', () => {
    it('getTokenSymbolFromQuery 应该返回正确的代币符号', () => {
      const { result } = renderHook(() => useSearch());

      const symbol = result.current.getTokenSymbolFromQuery('btc');
      expect(symbol).toBe('BTC');
    });

    it('getTokenSymbolFromQuery 对于未知代币应该返回 null', () => {
      const { result } = renderHook(() => useSearch());

      const symbol = result.current.getTokenSymbolFromQuery('UNKNOWN');
      expect(symbol).toBeNull();
    });
  });
});
