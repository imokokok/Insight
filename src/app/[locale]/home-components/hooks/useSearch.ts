import { useState, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useLocale } from '@/i18n';
import { searchAll, getTokenSymbol, type SearchResult } from '@/lib/constants/searchConfig';
import {
  getSearchHistory,
  saveSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  type SearchHistoryItem,
} from '@/lib/utils/searchHistory';

export function useSearch() {
  const locale = useLocale();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory());

  const searchResults = searchQuery.trim() ? searchAll(searchQuery) : [];

  const handleSearch = useCallback(
    (searchItem: string | SearchResult) => {
      let path: string;
      let symbolToSave: string | null = null;

      if (typeof searchItem === 'string') {
        const normalizedSymbol = searchItem.trim().toUpperCase();
        if (!normalizedSymbol) return;
        symbolToSave = normalizedSymbol;
        path = `/${locale}/price-query?symbol=${normalizedSymbol}`;
      } else {
        const result = searchItem as SearchResult;
        path = `/${locale}${result.item.path}`;
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
    [locale, router]
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
