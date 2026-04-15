import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import type { SearchResult } from '@/lib/constants/searchConfig';
import type { SearchHistoryItem } from '@/lib/utils/searchHistory';

interface HistoryDropdownItem {
  type: 'history';
  item: { symbol: string };
}

interface PopularDropdownItem {
  type: 'popular';
  item: { symbol: string };
}

interface SearchDropdownItem {
  type: 'search';
  item: SearchResult;
  resultType: 'token' | 'oracle' | 'chain' | 'protocol';
}

export type DropdownItem = HistoryDropdownItem | PopularDropdownItem | SearchDropdownItem;

const POPULAR_TOKENS = ['BTC', 'ETH', 'BNB', 'AVAX', 'MATIC', 'USDT', 'USDC'];

export function useDropdown(
  searchQuery: string,
  searchResults: SearchResult[],
  searchHistory: SearchHistoryItem[]
) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dropdownItems: DropdownItem[] = useMemo(() => {
    const items: DropdownItem[] = [];

    if (!searchQuery.trim() && searchHistory.length > 0) {
      searchHistory.slice(0, 3).forEach((historyItem) => {
        items.push({ type: 'history', item: { symbol: historyItem.symbol } });
      });
    }

    if (!searchQuery.trim()) {
      POPULAR_TOKENS.forEach((symbol) => {
        if (!items.some((i) => 'symbol' in i.item && i.item.symbol === symbol)) {
          items.push({ type: 'popular', item: { symbol } });
        }
      });
    }

    searchResults.forEach((result) => {
      items.push({
        type: 'search',
        item: result,
        resultType: result.item.type as 'token' | 'oracle' | 'chain' | 'protocol',
      });
    });

    return items.slice(0, 10);
  }, [searchQuery, searchResults, searchHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, onSelectItem: () => void) => {
      if (!isDropdownOpen) {
        if (e.key === 'ArrowDown' && dropdownItems.length > 0) {
          e.preventDefault();
          setIsDropdownOpen(true);
          setHighlightedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < dropdownItems.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          onSelectItem();
          break;
        case 'Escape':
          setIsDropdownOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isDropdownOpen, dropdownItems.length]
  );

  const openDropdown = useCallback(() => {
    setIsDropdownOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  }, []);

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    highlightedIndex,
    setHighlightedIndex,
    dropdownItems,
    dropdownRef,
    inputRef,
    handleKeyDown,
    openDropdown,
    closeDropdown,
    POPULAR_TOKENS,
  };
}
