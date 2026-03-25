'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import { useLocale } from '@/i18n';
import { SearchResult, SearchGroup, UseGlobalSearchOptions, UseGlobalSearchReturn } from './types';
import { getAllSearchResults, searchGroupLabels } from './data';

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
  const locale = useLocale();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create Fuse instance with all searchable items
  const fuseRef = useRef<Fuse<SearchResult> | null>(null);

  // Use a single object for filter options to reduce useMemo dependencies
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
      const allItems = getAllSearchResults(locale);

      // Filter by type if needed
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
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load search data'));
      return [];
    }
  }, [locale, filterOptions]);

  // Initialize Fuse instance with optimized options
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
        minMatchCharLength: 2, // Changed from 1 to 2 for better performance
        ignoreLocation: true,
        findAllMatches: false, // Changed from true to false for better performance
        distance: 100, // Limit match distance
        useExtendedSearch: false, // Disable extended search for better performance
      };

      return new Fuse(searchableItems, fuseOptions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize search'));
      return null;
    }
  }, [searchableItems, mergedOptions.threshold]);

  // Update ref for use in search function
  fuseRef.current = fuse;

  // Group results by type
  const groupResults = useCallback(
    (fuseResults: FuseResult[]): SearchGroup[] => {
      const groups: Record<string, SearchResult[]> = {};

      // Sort by score (lower is better) and priority (higher is better)
      const sortedResults = fuseResults
        .sort((a, b) => {
          const scoreDiff = (a.score || 0) - (b.score || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return (b.item.priority || 0) - (a.item.priority || 0);
        })
        .slice(0, mergedOptions.maxResults);

      // Group by type
      sortedResults.forEach((result) => {
        const type = result.item.type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(result.item);
      });

      // Convert to array with labels
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

  // Search function
  const search = useCallback((query: string) => {
    setSearchQuery(query);
    setError(null);

    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
    setError(null);
  }, []);

  // Retry search
  const retry = useCallback(() => {
    setError(null);
    search(searchQuery);
  }, [search, searchQuery]);

  // Get grouped results
  const results = useMemo(() => {
    if (!searchQuery.trim() || !fuseRef.current) {
      return [];
    }

    try {
      const fuseResults = fuseRef.current.search(searchQuery) as FuseResult[];
      return groupResults(fuseResults);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
      return [];
    }
  }, [searchQuery, groupResults]);

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
