import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { OracleProvider } from '@/types/oracle';

import { CrossOracleComparison } from '../index';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/config/colors', () => ({
  chartColors: {
    oracle: {
      chainlink: '#375BD2',
      pyth: '#EC255A',
      api3: '#45BBA8',
      redstone: '#FF4D4D',
      dia: '#1E88E5',
      winklink: '#F0B90B',
    },
  },
}));

jest.mock('../useCrossOraclePrices', () => ({
  useCrossOraclePrices: () => ({
    priceData: [
      { provider: OracleProvider.CHAINLINK, price: 50000, timestamp: Date.now() },
      { provider: OracleProvider.PYTH, price: 50010, timestamp: Date.now() },
    ],
    isLoading: false,
    isError: false,
    errors: [],
    lastUpdated: Date.now(),
    refetchAll: jest.fn(),
    priceHistory: [],
  }),
}));

jest.mock('../useComparisonStats', () => ({
  useComparisonStats: () => ({
    performanceData: [],
    priceStats: {
      avgPrice: 50005,
      minPrice: 50000,
      maxPrice: 50010,
      priceRange: 10,
      medianPrice: 50005,
    },
    deviationData: [],
    deviationChartData: [],
    chartData: [],
    radarData: [],
    lineChartData: [],
    extendedStats: {
      totalOracles: 2,
      activeOracles: 2,
      avgResponseTime: 100,
      avgConfidence: 99,
    },
    deviationAlerts: [],
    consistencyScore: 95,
    exportData: [],
    getConsistencyLabel: (score: number) => 'High',
    getConsistencyColor: (score: number) => 'text-green-600',
  }),
}));

jest.mock('../useSorting', () => ({
  useSorting: () => ({
    handleSort: jest.fn(),
    getSortIcon: () => null,
    sortedPriceData: [],
  }),
}));

jest.mock('../CrossOracleSubTabs', () => ({
  CrossOracleSubTabs: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <div data-testid="sub-tabs" data-active={activeTab}>
      <button onClick={() => onTabChange('overview')}>Overview</button>
      <button onClick={() => onTabChange('charts')}>Charts</button>
      <button onClick={() => onTabChange('data')}>Data</button>
      <button onClick={() => onTabChange('settings')}>Settings</button>
    </div>
  ),
}));

jest.mock('../OverviewTab', () => ({
  OverviewTab: () => <div data-testid="overview-tab">Overview Content</div>,
}));

jest.mock('../ChartsTab', () => ({
  ChartsTab: () => <div data-testid="charts-tab">Charts Content</div>,
}));

jest.mock('../DataTab', () => ({
  DataTab: () => <div data-testid="data-tab">Data Content</div>,
}));

jest.mock('../SettingsTab', () => ({
  SettingsTab: ({
    selectedSymbol,
    selectedOracles,
    onSymbolChange,
    onToggleOracle,
  }: {
    selectedSymbol: string;
    selectedOracles: OracleProvider[];
    onSymbolChange: (symbol: string) => void;
    onToggleOracle: (provider: OracleProvider) => void;
  }) => (
    <div data-testid="settings-tab">
      <span data-testid="selected-symbol">{selectedSymbol}</span>
      <span data-testid="selected-oracles">{selectedOracles.length}</span>
      <button onClick={() => onSymbolChange('ETH')} data-testid="change-symbol">
        Change Symbol
      </button>
      <button onClick={() => onToggleOracle(OracleProvider.DIA)} data-testid="toggle-oracle">
        Toggle Oracle
      </button>
    </div>
  ),
}));

describe('CrossOracleComparison', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('基础渲染', () => {
    it('应该正确渲染组件', () => {
      render(<CrossOracleComparison />);

      expect(screen.getByTestId('sub-tabs')).toBeInTheDocument();
    });

    it('应该默认显示概览标签页', () => {
      render(<CrossOracleComparison />);

      expect(screen.getByTestId('sub-tabs')).toHaveAttribute('data-active', 'overview');
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });

    it('应该渲染子标签导航', () => {
      render(<CrossOracleComparison />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Charts')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('标签页切换', () => {
    it('应该切换到图表标签页', () => {
      render(<CrossOracleComparison />);

      fireEvent.click(screen.getByText('Charts'));

      expect(screen.getByTestId('sub-tabs')).toHaveAttribute('data-active', 'charts');
      expect(screen.getByTestId('charts-tab')).toBeInTheDocument();
    });

    it('应该切换到数据标签页', () => {
      render(<CrossOracleComparison />);

      fireEvent.click(screen.getByText('Data'));

      expect(screen.getByTestId('sub-tabs')).toHaveAttribute('data-active', 'data');
      expect(screen.getByTestId('data-tab')).toBeInTheDocument();
    });

    it('应该切换到设置标签页', () => {
      render(<CrossOracleComparison />);

      fireEvent.click(screen.getByText('Settings'));

      expect(screen.getByTestId('sub-tabs')).toHaveAttribute('data-active', 'settings');
      expect(screen.getByTestId('settings-tab')).toBeInTheDocument();
    });

    it('应该能够切换回概览标签页', () => {
      render(<CrossOracleComparison />);

      fireEvent.click(screen.getByText('Charts'));
      expect(screen.getByTestId('charts-tab')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Overview'));
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
    });
  });

  describe('设置标签页交互', () => {
    it('应该显示当前选中的交易对', () => {
      render(<CrossOracleComparison />);

      fireEvent.click(screen.getByText('Settings'));

      expect(screen.getByTestId('selected-symbol')).toHaveTextContent('BTC');
    });

    it('应该显示选中的预言机数量', () => {
      render(<CrossOracleComparison />);

      fireEvent.click(screen.getByText('Settings'));

      expect(screen.getByTestId('selected-oracles')).toHaveTextContent('4');
    });
  });

  describe('组件结构', () => {
    it('应该有正确的容器结构', () => {
      const { container } = render(<CrossOracleComparison />);

      const mainContainer = container.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });

    it('应该包含标签导航容器', () => {
      const { container } = render(<CrossOracleComparison />);

      const navContainer = container.querySelector('.bg-white.border.border-gray-200');
      expect(navContainer).toBeInTheDocument();
    });
  });
});
