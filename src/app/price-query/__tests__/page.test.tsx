import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import PriceQueryPage from '../page';

jest.mock('../components', () => ({
  QueryHeader: ({
    loading,
    queryResultsLength,
  }: {
    loading: boolean;
    queryResultsLength: number;
  }) => (
    <div data-testid="query-header" data-loading={loading} data-results={queryResultsLength}>
      QueryHeader
    </div>
  ),
  QueryForm: ({ isLoading, onQuery }: { isLoading: boolean; onQuery: () => void }) => (
    <div data-testid="query-form" data-loading={isLoading}>
      <button onClick={onQuery} data-testid="query-button">
        Query
      </button>
    </div>
  ),
  QueryResults: ({ queryResults, isLoading }: { queryResults: unknown[]; isLoading: boolean }) => (
    <div data-testid="query-results" data-loading={isLoading} data-count={queryResults.length}>
      QueryResults
    </div>
  ),
  ExportConfig: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="export-config" data-open={isOpen}>
      ExportConfig
    </div>
  ),
}));

jest.mock('../hooks/usePriceQuery', () => ({
  usePriceQuery: () => ({
    selectedOracle: null,
    setSelectedOracle: jest.fn(),
    selectedChain: null,
    setSelectedChain: jest.fn(),
    selectedSymbol: '',
    setSelectedSymbol: jest.fn(),
    selectedTimeRange: 24,
    setSelectedTimeRange: jest.fn(),
    queryResults: [],
    isLoading: false,
    queryDuration: null,
    queryProgress: 0,
    currentQueryTarget: null,
    showExportConfig: false,
    setShowExportConfig: jest.fn(),
    chartContainerRef: { current: null },
    validPrices: [],
    avgPrice: null,
    avgChange24hPercent: null,
    maxPrice: null,
    minPrice: null,
    priceRange: null,
    standardDeviation: null,
    standardDeviationPercent: null,
    supportedChainsBySelectedOracles: [],
    fetchQueryData: jest.fn(),
    handleExportCSV: jest.fn(),
    handleExportJSON: jest.fn(),
    symbolFavorites: [],
    currentFavoriteConfig: null,
    showFavoritesDropdown: false,
    setShowFavoritesDropdown: jest.fn(),
    favoritesDropdownRef: { current: null },
    handleApplyFavorite: jest.fn(),
    queryErrors: [],
    clearErrors: jest.fn(),
    retryDataSource: jest.fn(),
    retryAllErrors: jest.fn(),
  }),
}));

jest.mock('../utils/exportUtils', () => ({
  exportToCSV: jest.fn(),
  exportToJSON: jest.fn(),
  exportToPDF: jest.fn(),
}));

jest.mock('@/hooks', () => ({
  useCommonShortcuts: jest.fn(),
  useDIAOnChainData: () => ({ data: null, isLoading: false }),
  useWINkLinkOnChainData: () => ({ data: null, isLoading: false }),
  useRedStoneOnChainData: () => ({ data: null, isLoading: false }),
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
  return render(<PriceQueryPage />, { wrapper: createWrapper });
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

    it('should render ExportConfig', () => {
      renderPriceQueryPage();

      expect(screen.getByTestId('export-config')).toBeInTheDocument();
    });
  });

  describe('Layout structure', () => {
    it('should have correct container styles', () => {
      renderPriceQueryPage();

      const container = screen.getByTestId('query-header').closest('Mock Text')
        ?.parentElement?.parentElement;
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
    it('QueryHeader should display non-loading state', () => {
      renderPriceQueryPage();

      const header = screen.getByTestId('query-header');
      expect(header).toHaveAttribute('data-loading', 'false');
    });

    it('QueryResults should display empty results', () => {
      renderPriceQueryPage();

      const results = screen.getByTestId('query-results');
      expect(results).toHaveAttribute('data-count', '0');
    });

    it('ExportConfig shoulddefaultclose', () => {
      renderPriceQueryPage();

      const exportConfig = screen.getByTestId('export-config');
      expect(exportConfig).toHaveAttribute('data-open', 'false');
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
