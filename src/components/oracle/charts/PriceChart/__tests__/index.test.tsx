import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import { PriceChart } from '../index';

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/config/colors', () => ({
  baseColors: {
    gray: {
      50: '#f9fafb',
    },
    primary: {
      400: '#60a5fa',
    },
  },
}));

jest.mock('@/components/ui', () => ({
  ChartSkeleton: ({
    height,
    showToolbar,
    variant,
  }: {
    height?: number;
    showToolbar?: boolean;
    variant?: string;
  }) => (
    <div data-testid="chart-skeleton" data-height={height} data-toolbar={showToolbar} data-variant={variant}>
      Loading Chart...
    </div>
  ),
}));

jest.mock('@/hooks', () => ({
  useBrushZoom: () => ({
    brushRange: { startIndex: 0, endIndex: 10 },
    setBrushRange: jest.fn(),
  }),
}));

jest.mock('@/stores/uiStore', () => ({
  useSelectedTimeRange: () => null,
  useTimeRangeCallback: () => ({
    registerTimeRangeCallback: jest.fn(),
    unregisterTimeRangeCallback: jest.fn(),
  }),
  useSyncEnabled: () => false,
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock('../ChartCanvas', () => ({
  ChartCanvas: ({
    data,
    chartType,
    isMobile,
    showVolume,
    showBollingerBands,
    showMA7,
    showRSI,
    showMACD,
  }: {
    data: unknown[];
    chartType?: string;
    isMobile?: boolean;
    showVolume?: boolean;
    showBollingerBands?: boolean;
    showMA7?: boolean;
    showRSI?: boolean;
    showMACD?: boolean;
  }) => (
    <div
      data-testid="chart-canvas"
      data-points={data.length}
      data-chart-type={chartType}
      data-mobile={isMobile}
      data-volume={showVolume}
      data-bollinger={showBollingerBands}
      data-ma7={showMA7}
      data-rsi={showRSI}
      data-macd={showMACD}
    >
      Chart Canvas
    </div>
  ),
}));

jest.mock('../ChartLegend', () => ({
  ChartLegend: ({
    chartType,
    isMobile,
    comparisonEnabled,
    showMA7,
    showBollingerBands,
    showRSI,
    showMACD,
    showVolume,
    anomalyDetectionEnabled,
    anomaliesCount,
  }: {
    chartType?: string;
    isMobile?: boolean;
    comparisonEnabled?: boolean;
    showMA7?: boolean;
    showBollingerBands?: boolean;
    showRSI?: boolean;
    showMACD?: boolean;
    showVolume?: boolean;
    anomalyDetectionEnabled?: boolean;
    anomaliesCount?: number;
  }) => (
    <div
      data-testid="chart-legend"
      data-chart-type={chartType}
      data-mobile={isMobile}
      data-comparison={comparisonEnabled}
      data-ma7={showMA7}
      data-bollinger={showBollingerBands}
      data-rsi={showRSI}
      data-macd={showMACD}
      data-volume={showVolume}
      data-anomaly={anomalyDetectionEnabled}
      data-anomalies={anomaliesCount}
    >
      Chart Legend
    </div>
  ),
}));

jest.mock('../chartUtils', () => ({
  calculateChartHeights: (height: number, showToolbar: boolean) => ({
    priceChartHeight: height - 100,
    volumeChartHeight: 80,
    rsiChartHeight: 60,
    macdChartHeight: 60,
  }),
}));

jest.mock('../priceChartUtils', () => ({
  calculatePredictionIntervals: (data: unknown[]) => data,
}));

jest.mock('../usePriceChartData', () => ({
  usePriceChartData: () => ({
    data: [],
    comparisonData: [],
    isLoading: false,
    currentPrice: 100,
    granularity: '1h',
    setGranularity: jest.fn(),
    comparison: { enabled: false },
    setComparison: jest.fn(),
    anomalies: [],
    setAnomalies: jest.fn(),
    isRefreshing: false,
    chartOpacity: 1,
    setChartOpacity: jest.fn(),
    brushStartIndex: 0,
    setBrushStartIndex: jest.fn(),
    brushEndIndex: 10,
    setBrushEndIndex: jest.fn(),
    isTransitioning: false,
    setIsTransitioning: jest.fn(),
    abortControllerRef: { current: null },
    priceRange: { min: 90, max: 110 },
    volumeRange: { min: 0, max: 1000 },
    priceChange: { value: 10, percent: 10 },
    detectedAnomalies: [],
    showMA7: true,
    showMA14: false,
    showMA30: false,
    showMA60: false,
    showMA20: false,
    showBollingerBands: false,
    showRSI: false,
    showMACD: false,
    showVolume: true,
    toggleMA7: jest.fn(),
    toggleMA14: jest.fn(),
    toggleMA30: jest.fn(),
    toggleMA60: jest.fn(),
    toggleMA20: jest.fn(),
    toggleBollingerBands: jest.fn(),
    toggleRSI: jest.fn(),
    toggleMACD: jest.fn(),
    toggleVolume: jest.fn(),
    indicatorsLoaded: true,
    fetchData: jest.fn(),
    fetchComparisonData: jest.fn(),
    chartState: {
      showComparisonPanel: false,
      setShowComparisonPanel: jest.fn(),
      showAnomalyStats: false,
      setShowAnomalyStats: jest.fn(),
      setBrushRange: jest.fn(),
      handleBrushChange: jest.fn(),
      handleComparisonApply: jest.fn(),
      cancelComparison: jest.fn(),
      chartType: 'candlestick',
    },
  }),
}));

jest.mock('../usePriceChartSettings', () => ({
  useChartSettings: () => ({
    settings: {
      anomalyDetectionEnabled: false,
      showPredictionInterval: false,
      confidenceLevel: 0.95,
    },
    updateSettings: jest.fn(),
    isLoaded: true,
  }),
  useScreenSize: () => 'desktop',
}));

const createMockClient = () => ({
  getProviderName: () => 'mock',
  getPrice: jest.fn(),
  getPriceHistory: jest.fn(),
  subscribeToPrice: jest.fn(),
  unsubscribeFromPrice: jest.fn(),
});

describe('PriceChart', () => {
  describe('基础渲染', () => {
    it('应该渲染图表组件', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    });
  });

  describe('Props 处理', () => {
    it('应该接受 symbol 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="ETH" />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('应该接受 chain 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" chain="ethereum" />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('应该接受 height 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" height={800} />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('应该接受 showToolbar 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" showToolbar={false} />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('应该接受 defaultPrice 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" defaultPrice={50000} />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('应该接受 enableRealtime 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" enableRealtime={false} />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('应该接受 autoDownsample 属性', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" autoDownsample={false} />);

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });
  });

  describe('图表类型', () => {
    it('应该传递正确的图表类型', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" />);

      const canvas = screen.getByTestId('chart-canvas');
      expect(canvas).toHaveAttribute('data-chart-type', 'candlestick');
    });
  });

  describe('指标显示', () => {
    it('应该显示 MA7 指标', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" />);

      const canvas = screen.getByTestId('chart-canvas');
      expect(canvas).toHaveAttribute('data-ma7', 'true');
    });

    it('应该显示交易量', () => {
      const client = createMockClient();
      render(<PriceChart client={client as any} symbol="BTC" />);

      const canvas = screen.getByTestId('chart-canvas');
      expect(canvas).toHaveAttribute('data-volume', 'true');
    });
  });
});
