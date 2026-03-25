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

  // Create Fuse instance with all searchable items
  const fuseRef = useRef<Fuse<SearchResult> | null>(null);

  const searchableItems = useMemo(() => {
    const allItems = getAllSearchResults(locale);

    // Filter by type if needed
    return allItems.filter((item) => {
      switch (item.type) {
        case 'oracle':
          return mergedOptions.includeOracles;
        case 'pair':
          return mergedOptions.includePairs;
        case 'blockchain':
          return mergedOptions.includeBlockchains;
        case 'page':
          return mergedOptions.includePages;
        case 'feature':
          return mergedOptions.includeFeatures;
        case 'documentation':
          return mergedOptions.includeDocumentation;
        default:
          return true;
      }
    });
  }, [
    locale,
    mergedOptions.includeOracles,
    mergedOptions.includePairs,
    mergedOptions.includeBlockchains,
    mergedOptions.includePages,
    mergedOptions.includeFeatures,
    mergedOptions.includeDocumentation,
  ]);

  // Initialize Fuse instance
  const fuse = useMemo(() => {
    const fuseOptions = {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.2 },
        { name: 'keywords', weight: 0.3 },
        { name: 'type', weight: 0.1 },
      ],
      threshold: mergedOptions.threshold,
      includeScore: true,
      minMatchCharLength: 1,
      ignoreLocation: true,
      findAllMatches: true,
    };

    return new Fuse(searchableItems, fuseOptions);
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
  }, []);

  // Get grouped results
  const results = useMemo(() => {
    if (!searchQuery.trim() || !fuseRef.current) {
      return [];
    }

    const fuseResults = fuseRef.current.search(searchQuery) as FuseResult[];
    return groupResults(fuseResults);
  }, [searchQuery, groupResults]);

  return {
    results,
    isSearching: isSearching && searchQuery.trim().length > 0,
    search,
    clearSearch,
  };
}

export default useGlobalSearch;
