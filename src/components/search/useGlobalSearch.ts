'use client';

import { useState, useMemo, useCallback } from 'react';

import Fuse from 'fuse.js';

import { getAllSearchResults, searchGroupLabels } from './data';
import {
  type SearchResult,
  type SearchGroup,
  type UseGlobalSearchOptions,
  type UseGlobalSearchReturn,
} from './types';

const DEFAULT_OPTIONS: Required<UseGlobalSearchOptions> = {
  maxResults: 50,
  threshold: 0.3,
  includeOracles: true,
  includePairs: true,
  includeBlockchains: true,
  includePages: true,
  includeFeatures: true,
  includeDocumentation: true,
};

interface FuseResult {
  item: SearchResult;
  score: number;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}): UseGlobalSearchReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const filterOptions = useMemo(
    () => ({
      includeOracles: mergedOptions.includeOracles,
      includePairs: mergedOptions.includePairs,
      includeBlockchains: mergedOptions.includeBlockchains,
      includePages: mergedOptions.includePages,
      includeFeatures: mergedOptions.includeFeatures,
      includeDocumentation: mergedOptions.includeDocumentation,
    }),
    [
      mergedOptions.includeOracles,
      mergedOptions.includePairs,
      mergedOptions.includeBlockchains,
      mergedOptions.includePages,
      mergedOptions.includeFeatures,
      mergedOptions.includeDocumentation,
    ]
  );

  const searchableItems = useMemo(() => {
    try {
      const allItems = getAllSearchResults('en');

      return allItems.filter((item) => {
        switch (item.type) {
          case 'oracle':
            return filterOptions.includeOracles;
          case 'pair':
            return filterOptions.includePairs;
          case 'blockchain':
            return filterOptions.includeBlockchains;
          case 'page':
            return filterOptions.includePages;
          case 'feature':
            return filterOptions.includeFeatures;
          case 'documentation':
            return filterOptions.includeDocumentation;
          default:
            return true;
        }
      });
    } catch {
      return [];
    }
  }, [filterOptions]);

  const fuse = useMemo(() => {
    try {
      const fuseOptions = {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'description', weight: 0.2 },
          { name: 'keywords', weight: 0.3 },
          { name: 'type', weight: 0.1 },
        ],
        threshold: mergedOptions.threshold,
        includeScore: true,
        minMatchCharLength: 2,
        ignoreLocation: true,
        findAllMatches: false,
        distance: 100,
        useExtendedSearch: false,
      };

      return new Fuse(searchableItems, fuseOptions);
    } catch {
      return null;
    }
  }, [searchableItems, mergedOptions.threshold]);

  const groupResults = useCallback(
    (fuseResults: FuseResult[]): SearchGroup[] => {
      const groups: Record<string, SearchResult[]> = {};

      const sortedResults = fuseResults
        .sort((a, b) => {
          const scoreDiff = (a.score || 0) - (b.score || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return (b.item.priority || 0) - (a.item.priority || 0);
        })
        .slice(0, mergedOptions.maxResults);

      sortedResults.forEach((result) => {
        const type = result.item.type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(result.item);
      });

      const typeOrder: Array<SearchResult['type']> = [
        'oracle',
        'pair',
        'blockchain',
        'page',
        'feature',
        'documentation',
      ];

      return typeOrder
        .filter((type) => groups[type] && groups[type].length > 0)
        .map((type) => ({
          type,
          label: searchGroupLabels[type],
          results: groups[type],
        }));
    },
    [mergedOptions.maxResults]
  );

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);

    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    search(searchQuery);
  }, [search, searchQuery]);

  const results = useMemo(() => {
    if (!searchQuery.trim() || !fuse) {
      return [];
    }

    try {
      const fuseResults = fuse.search(searchQuery) as FuseResult[];
      return groupResults(fuseResults);
    } catch {
      return [];
    }
  }, [searchQuery, groupResults, fuse]);

  return {
    results,
    isSearching: isSearching && searchQuery.trim().length > 0,
    error,
    search,
    clearSearch,
    retry,
  };
}

export default useGlobalSearch;
