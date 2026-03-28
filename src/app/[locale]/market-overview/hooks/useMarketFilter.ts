'use client';

import { useState, useMemo, useCallback } from 'react';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

import { type OracleMarketData, type AssetData } from '../types';

export interface MarketFilterState {
  marketShareMin: number | null;
  change24hFilter: 'all' | 'positive' | 'negative';
  chainsMin: number | null;
  searchQuery: string;
  oracleFilter: string | null;
  changeMagnitude: 'all' | 'high' | 'medium' | 'low';
}

export interface UseMarketFilterReturn {
  filters: MarketFilterState;
  setMarketShareMin: (value: number | null) => void;
  setChange24hFilter: (value: 'all' | 'positive' | 'negative') => void;
  setChainsMin: (value: number | null) => void;
  setSearchQuery: (value: string) => void;
  setOracleFilter: (value: string | null) => void;
  setChangeMagnitude: (value: 'all' | 'high' | 'medium' | 'low') => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  filteredOracleData: OracleMarketData[];
  filteredAssets: AssetData[];
}

const DEFAULT_FILTERS: MarketFilterState = {
  marketShareMin: null,
  change24hFilter: 'all',
  chainsMin: null,
  searchQuery: '',
  oracleFilter: null,
  changeMagnitude: 'all',
};

const MARKET_SHARE_OPTIONS = [5, 10, 20];
const CHAINS_OPTIONS = [10, 50, 100];

export function useMarketFilter(
  oracleData: OracleMarketData[],
  assets: AssetData[]
): UseMarketFilterReturn {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const parseFiltersFromURL = useCallback((): MarketFilterState => {
    return {
      marketShareMin: searchParams.get('ms') ? parseInt(searchParams.get('ms')!) : null,
      change24hFilter: (searchParams.get('ch') as 'all' | 'positive' | 'negative') || 'all',
      chainsMin: searchParams.get('cn') ? parseInt(searchParams.get('cn')!) : null,
      searchQuery: searchParams.get('q') || '',
      oracleFilter: searchParams.get('oracle') || null,
      changeMagnitude: (searchParams.get('cm') as 'all' | 'high' | 'medium' | 'low') || 'all',
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<MarketFilterState>(parseFiltersFromURL);

  const updateURL = useCallback(
    (newFilters: MarketFilterState) => {
      const params = new URLSearchParams();

      if (newFilters.marketShareMin) params.set('ms', newFilters.marketShareMin.toString());
      if (newFilters.change24hFilter !== 'all') params.set('ch', newFilters.change24hFilter);
      if (newFilters.chainsMin) params.set('cn', newFilters.chainsMin.toString());
      if (newFilters.searchQuery) params.set('q', newFilters.searchQuery);
      if (newFilters.oracleFilter) params.set('oracle', newFilters.oracleFilter);
      if (newFilters.changeMagnitude !== 'all') params.set('cm', newFilters.changeMagnitude);

      const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newURL, { scroll: false });
    },
    [pathname, router]
  );

  const updateFilters = useCallback(
    (updates: Partial<MarketFilterState>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      updateURL(newFilters);
    },
    [filters, updateURL]
  );

  const setMarketShareMin = useCallback(
    (value: number | null) => updateFilters({ marketShareMin: value }),
    [updateFilters]
  );

  const setChange24hFilter = useCallback(
    (value: 'all' | 'positive' | 'negative') => updateFilters({ change24hFilter: value }),
    [updateFilters]
  );

  const setChainsMin = useCallback(
    (value: number | null) => updateFilters({ chainsMin: value }),
    [updateFilters]
  );

  const setSearchQuery = useCallback(
    (value: string) => updateFilters({ searchQuery: value }),
    [updateFilters]
  );

  const setOracleFilter = useCallback(
    (value: string | null) => updateFilters({ oracleFilter: value }),
    [updateFilters]
  );

  const setChangeMagnitude = useCallback(
    (value: 'all' | 'high' | 'medium' | 'low') => updateFilters({ changeMagnitude: value }),
    [updateFilters]
  );

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.marketShareMin !== null ||
      filters.change24hFilter !== 'all' ||
      filters.chainsMin !== null ||
      filters.searchQuery !== '' ||
      filters.oracleFilter !== null ||
      filters.changeMagnitude !== 'all'
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.marketShareMin !== null) count++;
    if (filters.change24hFilter !== 'all') count++;
    if (filters.chainsMin !== null) count++;
    if (filters.searchQuery !== '') count++;
    if (filters.oracleFilter !== null) count++;
    if (filters.changeMagnitude !== 'all') count++;
    return count;
  }, [filters]);

  const filteredOracleData = useMemo(() => {
    let result = [...oracleData];

    if (filters.marketShareMin !== null) {
      result = result.filter((item) => item.share >= filters.marketShareMin!);
    }

    if (filters.change24hFilter !== 'all') {
      result = result.filter((item) =>
        filters.change24hFilter === 'positive' ? item.change24h >= 0 : item.change24h < 0
      );
    }

    if (filters.chainsMin !== null) {
      result = result.filter((item) => item.chains >= filters.chainsMin!);
    }

    return result;
  }, [oracleData, filters.marketShareMin, filters.change24hFilter, filters.chainsMin]);

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.symbol.toLowerCase().includes(query) ||
          item.primaryOracle.toLowerCase().includes(query)
      );
    }

    if (filters.oracleFilter) {
      result = result.filter((item) => item.primaryOracle === filters.oracleFilter);
    }

    if (filters.changeMagnitude !== 'all') {
      const absChange = Math.abs;
      result = result.filter((item) => {
        const change = absChange(item.change24h);
        switch (filters.changeMagnitude) {
          case 'high':
            return change >= 10;
          case 'medium':
            return change >= 5 && change < 10;
          case 'low':
            return change < 5;
          default:
            return true;
        }
      });
    }

    return result;
  }, [assets, filters.searchQuery, filters.oracleFilter, filters.changeMagnitude]);

  return {
    filters,
    setMarketShareMin,
    setChange24hFilter,
    setChainsMin,
    setSearchQuery,
    setOracleFilter,
    setChangeMagnitude,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    filteredOracleData,
    filteredAssets,
  };
}

export { MARKET_SHARE_OPTIONS, CHAINS_OPTIONS };
