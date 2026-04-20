import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import PriceQueryPage from '../page';

jest.mock('../components', () => ({
  QueryHeader: () => <div data-testid="query-header">QueryHeader</div>,
  QueryForm: () => (
    <div data-testid="query-form">
      <button data-testid="query-button">Query</button>
    </div>
  ),
  QueryResults: () => <div data-testid="query-results">QueryResults</div>,
}));

jest.mock('../contexts', () => ({
  UnifiedQueryProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useUnifiedQuery: () => ({
    // Params
    selectedOracle: null,
    setSelectedOracle: jest.fn(),
    selectedChain: null,
    setSelectedChain: jest.fn(),
    selectedSymbol: 'BTC',
    setSelectedSymbol: jest.fn(),
    selectedTimeRange: 24,
    setSelectedTimeRange: jest.fn(),
    isCompareMode: false,
    setIsCompareMode: jest.fn(),
    compareTimeRange: 24,
    setCompareTimeRange: jest.fn(),
    urlParamsParsed: true,
    // Data
    queryResults: [],
    compareQueryResults: [],
    primaryDataFetchTime: null,
    compareDataFetchTime: null,
    supportedChainsBySelectedOracles: new Set(),
    isLoading: false,
    isFetching: false,
    queryDuration: null,
    queryProgress: { completed: 0, total: 0 },
    currentQueryTarget: { oracle: null, chain: null },
    queryErrors: [],
    clearErrors: jest.fn(),
    retryDataSource: jest.fn(),
    retryAllErrors: jest.fn(),
    refetch: jest.fn(),
    validationWarnings: [],
    dataAnomalies: [],
    hasDataQualityIssues: false,
    stats: {
      validPrices: [],
      avgPrice: 0,
      avgChange24hPercent: undefined,
      maxPrice: 0,
      minPrice: 0,
      priceRange: 0,
      compareValidPrices: [],
      compareAvgPrice: 0,
      compareAvgChange24hPercent: undefined,
      compareMaxPrice: 0,
      compareMinPrice: 0,
      comparePriceRange: 0,
      variance: 0,
      standardDeviation: 0,
      standardDeviationPercent: 0,
    },
    autoRefresh: {
      isAutoRefreshEnabled: false,
      refreshInterval: 0,
      lastRefreshedAt: null,
      nextRefreshAt: null,
      setRefreshInterval: jest.fn(),
      toggleAutoRefresh: jest.fn(),
      isRefreshing: false,
    },
    // UI
    ui: {
      filterText: '',
      setFilterText: jest.fn(),
      sortField: 'oracle' as const,
      sortDirection: 'asc' as const,
      hiddenSeries: new Set(),
      setHiddenSeries: jest.fn(),
      toggleSeries: jest.fn(),
      handleSort: jest.fn(),
      selectedRow: null,
      setSelectedRow: jest.fn(),
      showBaseline: false,
      setShowBaseline: jest.fn(),
      showFavoritesDropdown: false,
      setShowFavoritesDropdown: jest.fn(),
      favoritesDropdownRef: { current: null },
    },
  }),
}));

jest.mock('@/hooks', () => ({
  useCommonShortcuts: jest.fn(),
  useDIAOnChainData: () => ({ data: null, isLoading: false }),
  useWINkLinkOnChainData: () => ({ data: null, isLoading: false }),
  useRedStoneOnChainData: () => ({ data: null, isLoading: false }),
  useAllOnChainData: () => ({
    diaOnChainData: null,
    isDIADataLoading: false,
    winklinkOnChainData: null,
    isWINkLinkDataLoading: false,
    redstoneOnChainData: null,
    isRedStoneDataLoading: false,
    supraOnChainData: null,
    isSupraDataLoading: false,
    twapOnChainData: null,
    isTwapDataLoading: false,
    reflectorOnChainData: null,
    isReflectorDataLoading: false,
    flareOnChainData: null,
    isFlareDataLoading: false,
  }),
}));

jest.mock('@/components/ui', () => ({
  LiveStatusBar: ({ isConnected, latency }: { isConnected: boolean; latency?: number }) => (
    <div data-testid="live-status" data-connected={isConnected} data-latency={latency}>
      LiveStatusBar
    </div>
  ),
}));

jest.mock('@/lib/oracles', () => ({
  OracleProvider: {
    CHAINLINK: 'chainlink',
    PYTH: 'pyth',
    DIA: 'dia',
    REDSTONE: 'redstone',
    WINKLINK: 'winklink',
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const renderPriceQueryPage = () => {
  const Wrapper = createWrapper();
  return render(<PriceQueryPage />, { wrapper: Wrapper });
};

describe('PriceQueryPage', () => {
  describe('Basic rendering', () => {
    it('should render page correctly', () => {
      renderPriceQueryPage();

      expect(screen.getByTestId('query-header')).toBeInTheDocument();
      expect(screen.getByTestId('query-form')).toBeInTheDocument();
      expect(screen.getByTestId('query-results')).toBeInTheDocument();
    });

    it('should render LiveStatusBar', () => {
      renderPriceQueryPage();

      expect(screen.getByTestId('live-status')).toBeInTheDocument();
    });
  });

  describe('Layout structure', () => {
    it('should have correct container styles', () => {
      renderPriceQueryPage();

      const container = screen.getByTestId('query-header').parentElement?.parentElement;
      expect(container).toHaveClass('max-w-[1600px]');
      expect(container).toHaveClass('mx-auto');
    });

    it('should render screen reader notification area', () => {
      renderPriceQueryPage();

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Initial state', () => {
    it('QueryHeader should be in the document', () => {
      renderPriceQueryPage();

      const header = screen.getByTestId('query-header');
      expect(header).toBeInTheDocument();
    });

    it('QueryResults should be in the document', () => {
      renderPriceQueryPage();

      const results = screen.getByTestId('query-results');
      expect(results).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('shouldhave aria-live usestatenotification', () => {
      renderPriceQueryPage();

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveClass('sr-only');
    });
  });
});
