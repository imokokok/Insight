import { useSearchParams, usePathname, useRouter } from 'next/navigation';

import { renderHook, act } from '@testing-library/react';

import { useMarketFilter, MARKET_SHARE_OPTIONS, CHAINS_OPTIONS } from '../hooks/useMarketFilter';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('useMarketFilter', () => {
  const mockPush = jest.fn();
  const mockPathname = '/market-overview';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
    mockUsePathname.mockReturnValue(mockPathname);
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  describe('Initial State', () => {
    it('should initialize with default values when no URL params', () => {
      const { result } = renderHook(() => useMarketFilter());

      expect(result.current.filters.marketShareMin).toBeNull();
      expect(result.current.filters.change24hFilter).toBe('all');
      expect(result.current.filters.chainsMin).toBeNull();
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.filters.oracleFilter).toBeNull();
      expect(result.current.filters.changeMagnitude).toBe('all');
    });

    it('should parse URL params correctly', () => {
      const params = new URLSearchParams({
        ms: '10',
        ch: 'positive',
        cn: '50',
        q: 'bitcoin',
        oracle: 'Chainlink',
        cm: 'high',
      });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useMarketFilter());

      expect(result.current.filters.marketShareMin).toBe(10);
      expect(result.current.filters.change24hFilter).toBe('positive');
      expect(result.current.filters.chainsMin).toBe(50);
      expect(result.current.filters.searchQuery).toBe('bitcoin');
      expect(result.current.filters.oracleFilter).toBe('Chainlink');
      expect(result.current.filters.changeMagnitude).toBe('high');
    });

    it('should handle invalid URL params gracefully', () => {
      const params = new URLSearchParams({
        ms: 'invalid',
        ch: 'invalid',
        cn: 'invalid',
      });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useMarketFilter());

      expect(result.current.filters.marketShareMin).toBeNull();
      expect(result.current.filters.change24hFilter).toBe('all');
      expect(result.current.filters.chainsMin).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('should update marketShareMin and sync to URL', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setMarketShareMin(10);
      });

      expect(result.current.filters.marketShareMin).toBe(10);
      expect(mockPush).toHaveBeenCalled();
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('ms=10');
    });

    it('should update change24hFilter and sync to URL', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setChange24hFilter('positive');
      });

      expect(result.current.filters.change24hFilter).toBe('positive');
      expect(mockPush).toHaveBeenCalled();
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('ch=positive');
    });

    it('should update chainsMin and sync to URL', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setChainsMin(50);
      });

      expect(result.current.filters.chainsMin).toBe(50);
      expect(mockPush).toHaveBeenCalled();
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('cn=50');
    });

    it('should update searchQuery and sync to URL', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setSearchQuery('bitcoin');
      });

      expect(result.current.filters.searchQuery).toBe('bitcoin');
      expect(mockPush).toHaveBeenCalled();
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('q=bitcoin');
    });

    it('should update oracleFilter and sync to URL', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setOracleFilter('Chainlink');
      });

      expect(result.current.filters.oracleFilter).toBe('Chainlink');
      expect(mockPush).toHaveBeenCalled();
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('oracle=Chainlink');
    });

    it('should update changeMagnitude and sync to URL', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setChangeMagnitude('high');
      });

      expect(result.current.filters.changeMagnitude).toBe('high');
      expect(mockPush).toHaveBeenCalled();
      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('cm=high');
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters', () => {
      const params = new URLSearchParams({
        ms: '10',
        ch: 'positive',
        cn: '50',
        q: 'bitcoin',
      });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.marketShareMin).toBeNull();
      expect(result.current.filters.change24hFilter).toBe('all');
      expect(result.current.filters.chainsMin).toBeNull();
      expect(result.current.filters.searchQuery).toBe('');
    });
  });

  describe('Active Filters Detection', () => {
    it('should detect active filters correctly', () => {
      const { result } = renderHook(() => useMarketFilter());

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setMarketShareMin(10);
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should count active filters correctly', () => {
      const { result } = renderHook(() => useMarketFilter());

      expect(result.current.activeFilterCount).toBe(0);

      act(() => {
        result.current.setMarketShareMin(10);
        result.current.setChange24hFilter('positive');
      });

      expect(result.current.activeFilterCount).toBe(2);
    });

    it('should not count default values as active filters', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setChange24hFilter('all');
        result.current.setChangeMagnitude('all');
      });

      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('Filter Logic', () => {
    it('should filter oracle data by market share', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setMarketShareMin(10);
      });

      const mockOracleData = [
        { name: 'Chainlink', share: 45.5 },
        { name: 'Pyth', share: 25.3 },
        { name: 'Band', share: 5.2 },
      ];

      const filtered = mockOracleData.filter(
        (o) =>
          !result.current.filters.marketShareMin || o.share >= result.current.filters.marketShareMin
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.find((o) => o.name === 'Band')).toBeUndefined();
    });

    it('should filter oracle data by 24h change', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setChange24hFilter('positive');
      });

      const mockOracleData = [
        { name: 'Chainlink', change24h: 2.5 },
        { name: 'Pyth', change24h: -1.5 },
        { name: 'Band', change24h: 0.8 },
      ];

      const filtered = mockOracleData.filter((o) => {
        if (result.current.filters.change24hFilter === 'all') return true;
        if (result.current.filters.change24hFilter === 'positive') return o.change24h > 0;
        if (result.current.filters.change24hFilter === 'negative') return o.change24h < 0;
        return true;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.find((o) => o.name === 'Pyth')).toBeUndefined();
    });

    it('should filter assets by search query', () => {
      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setSearchQuery('btc');
      });

      const mockAssets = [
        { symbol: 'BTC', name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum' },
        { symbol: 'BNB', name: 'Binance Coin' },
      ];

      const query = result.current.filters.searchQuery.toLowerCase();
      const filtered = mockAssets.filter(
        (a) => a.symbol.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].symbol).toBe('BTC');
    });
  });

  describe('Constants', () => {
    it('should have correct market share options', () => {
      expect(MARKET_SHARE_OPTIONS).toEqual([
        { value: null, label: 'All' },
        { value: 5, label: '> 5%' },
        { value: 10, label: '> 10%' },
        { value: 20, label: '> 20%' },
      ]);
    });

    it('should have correct chains options', () => {
      expect(CHAINS_OPTIONS).toEqual([
        { value: null, label: 'All' },
        { value: 10, label: '> 10' },
        { value: 50, label: '> 50' },
        { value: 100, label: '> 100' },
      ]);
    });
  });

  describe('URL Sync', () => {
    it('should preserve existing URL params when updating filters', () => {
      const params = new URLSearchParams({ existing: 'value' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setMarketShareMin(10);
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain('existing=value');
      expect(calledUrl).toContain('ms=10');
    });

    it('should remove null values from URL', () => {
      const params = new URLSearchParams({ ms: '10' });
      mockUseSearchParams.mockReturnValue(params);

      const { result } = renderHook(() => useMarketFilter());

      act(() => {
        result.current.setMarketShareMin(null);
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).not.toContain('ms=');
    });
  });
});
