import { useState, useCallback, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { searchAll, getTokenSymbol, type SearchResult } from '@/lib/constants/searchConfig';
import {
  getSearchHistory,
  saveSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryItem,
} from '@/lib/utils/searchHistory';

export function useSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory());

  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchAll(searchQuery) : []),
    [searchQuery]
  );

  const handleSearch = useCallback(
    (searchItem: string | SearchResult) => {
      let path: string;
      let symbolToSave: string | null = null;

      if (typeof searchItem === 'string') {
        const normalizedSymbol = searchItem.trim().toUpperCase();
        if (!normalizedSymbol) return;
        symbolToSave = normalizedSymbol;
        path = `/price-query?symbol=${encodeURIComponent(normalizedSymbol)}`;
      } else {
        const result = searchItem as SearchResult;
        path = result.item.path;
        if (result.item.type === 'token' && result.item.symbol) {
          symbolToSave = result.item.symbol;
        }
      }

      if (symbolToSave) {
        saveSearchHistory(symbolToSave);
        setSearchHistory(getSearchHistory());
      }

      router.push(path);
    },
    [router]
  );

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const handleRemoveHistoryItem = useCallback((symbol: string) => {
    removeFromSearchHistory(symbol);
    setSearchHistory(getSearchHistory());
  }, []);

  const getTokenSymbolFromQuery = useCallback((query: string) => {
    return getTokenSymbol(query);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchHistory,
    searchResults,
    handleSearch,
    handleClearHistory,
    handleRemoveHistoryItem,
    getTokenSymbolFromQuery,
  };
}
