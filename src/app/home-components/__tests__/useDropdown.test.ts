import { renderHook, act } from '@testing-library/react';

import { useDropdown } from '../hooks/useDropdown';

const mockSearchResults = [
  {
    item: { type: 'token', symbol: 'BTC', name: 'Bitcoin', path: '/price-query?symbol=BTC' },
    matches: [],
    score: 1,
  },
  {
    item: { type: 'token', symbol: 'ETH', name: 'Ethereum', path: '/price-query?symbol=ETH' },
    matches: [],
    score: 0.9,
  },
];

const mockSearchHistory = [
  { symbol: 'BTC', timestamp: Date.now() },
  { symbol: 'ETH', timestamp: Date.now() - 1000 },
];

describe('useDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      expect(result.current.isDropdownOpen).toBe(false);
      expect(result.current.highlightedIndex).toBe(-1);
      expect(result.current.POPULAR_TOKENS).toEqual([
        'BTC',
        'ETH',
        'BNB',
        'AVAX',
        'MATIC',
        'USDT',
        'USDC',
      ]);
    });
  });

  describe('下拉菜单项目', () => {
    it('当没有搜索词且有历史记录时，应该显示历史记录', () => {
      const { result } = renderHook(() => useDropdown('', [], mockSearchHistory));

      const historyItems = result.current.dropdownItems.filter((item) => item.type === 'history');
      expect(historyItems.length).toBe(2);
    });

    it('当没有搜索词时，应该显示热门代币', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      const popularItems = result.current.dropdownItems.filter((item) => item.type === 'popular');
      expect(popularItems.length).toBeGreaterThan(0);
    });

    it('当有搜索词时，应该显示搜索结果', () => {
      const { result } = renderHook(() => useDropdown('BTC', mockSearchResults, []));

      const searchItems = result.current.dropdownItems.filter((item) => item.type === 'search');
      expect(searchItems.length).toBe(2);
    });

    it('下拉菜单项目应该限制在10个以内', () => {
      const manyResults = Array.from({ length: 15 }, (_, i) => ({
        item: {
          type: 'token',
          symbol: `TOKEN${i}`,
          name: `Token ${i}`,
          path: `/price-query?symbol=TOKEN${i}`,
        },
        matches: [],
        score: 1 - i * 0.01,
      }));

      const { result } = renderHook(() => useDropdown('TOKEN', manyResults, []));

      expect(result.current.dropdownItems.length).toBeLessThanOrEqual(10);
    });
  });

  describe('下拉菜单控制', () => {
    it('openDropdown 应该打开下拉菜单', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.openDropdown();
      });

      expect(result.current.isDropdownOpen).toBe(true);
    });

    it('closeDropdown 应该关闭下拉菜单并重置高亮索引', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.openDropdown();
        result.current.setHighlightedIndex(2);
      });

      act(() => {
        result.current.closeDropdown();
      });

      expect(result.current.isDropdownOpen).toBe(false);
      expect(result.current.highlightedIndex).toBe(-1);
    });

    it('setIsDropdownOpen 应该更新下拉菜单状态', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
      });

      expect(result.current.isDropdownOpen).toBe(true);
    });
  });

  describe('键盘导航', () => {
    it('按下箭头键应该向下移动高亮', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
      });

      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(result.current.highlightedIndex).toBe(0);
    });

    it('按下上箭头键应该向上移动高亮', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
        result.current.setHighlightedIndex(2);
      });

      const mockEvent = {
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(result.current.highlightedIndex).toBe(1);
    });

    it('按下 Escape 键应该关闭下拉菜单', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
      });

      const mockEvent = {
        key: 'Escape',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(result.current.isDropdownOpen).toBe(false);
    });

    it('按下 Enter 键应该调用 onSelectItem', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
      });

      const mockEvent = {
        key: 'Enter',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(mockOnSelect).toHaveBeenCalled();
    });

    it('当下拉菜单关闭时，按下箭头键应该打开它', () => {
      const { result } = renderHook(() => useDropdown('', [], mockSearchHistory));

      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(result.current.isDropdownOpen).toBe(true);
      expect(result.current.highlightedIndex).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('高亮索引不应该超过项目数量', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
      });

      const maxIndex = result.current.dropdownItems.length - 1;

      act(() => {
        result.current.setHighlightedIndex(maxIndex);
      });

      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(result.current.highlightedIndex).toBe(maxIndex);
    });

    it('高亮索引不应该小于 -1', () => {
      const { result } = renderHook(() => useDropdown('', [], []));

      act(() => {
        result.current.setIsDropdownOpen(true);
        result.current.setHighlightedIndex(0);
      });

      const mockEvent = {
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent;
      const mockOnSelect = jest.fn();

      act(() => {
        result.current.handleKeyDown(mockEvent, mockOnSelect);
      });

      expect(result.current.highlightedIndex).toBe(-1);
    });
  });
});
