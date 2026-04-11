import { render, screen } from '@testing-library/react';

import { InteractivePriceChart, type ChartDataPoint } from '../index';

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/lib/config/colors', () => ({
  chartColors: {
    recharts: {
      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryDark: '#2563eb',
      purple: '#8b5cf6',
      purpleDark: '#7c3aed',
      warning: '#f59e0b',
      success: '#10b981',
      grid: '#e5e7eb',
      axis: '#9ca3af',
      tick: '#6b7280',
      backgroundLight: '#f9fafb',
    },
  },
  baseColors: {
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    primary: {
      400: '#60a5fa',
    },
  },
}));

const createMockData = (count: number = 10): ChartDataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    timestamp: Date.now() + i * 86400000,
    price: 100 + i * 10,
    volume: 1000 + i * 100,
    ma7: 100 + i * 8,
    ma14: 100 + i * 6,
    ma30: 100 + i * 4,
  }));
};

describe('InteractivePriceChart', () => {
  describe('基础渲染', () => {
    it('应该正确渲染图表', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该渲染指定高度', () => {
      const data = createMockData();
      const { container } = render(<InteractivePriceChart data={data} symbol="BTC" height={400} />);

      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该显示交易量图例', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该显示 MA7 图例（默认显示）', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('MA7')).toBeInTheDocument();
    });
  });

  describe('Props 处理', () => {
    it('应该处理空数据', () => {
      render(<InteractivePriceChart data={[]} symbol="BTC" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该处理自定义 chartId', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" chartId="custom-chart" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该处理 isMobile 属性', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" isMobile />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该处理自定义类名', () => {
      const data = createMockData();
      const { container } = render(
        <InteractivePriceChart data={data} symbol="BTC" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('比较数据', () => {
    it('应该渲染比较数据', () => {
      const data = createMockData();
      const comparisonData = createMockData().map((d) => ({
        ...d,
        price: d.price + 5,
      }));

      render(<InteractivePriceChart data={data} symbol="BTC" comparisonData={comparisonData} />);

      expect(screen.getByText('legend.comparison')).toBeInTheDocument();
    });

    it('没有比较数据时不显示比较图例', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.queryByText('legend.comparison')).not.toBeInTheDocument();
    });
  });

  describe('移动平均线', () => {
    it('应该显示 MA14 图例', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('MA7')).toBeInTheDocument();
    });

    it('应该显示 MA30 图例', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('MA7')).toBeInTheDocument();
    });
  });

  describe('价格变化计算', () => {
    it('应该正确计算价格上涨', () => {
      const data: ChartDataPoint[] = [
        { time: '2024-01-01', timestamp: 1000, price: 100, volume: 1000 },
        { time: '2024-01-02', timestamp: 2000, price: 110, volume: 1100 },
      ];

      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该正确计算价格下跌', () => {
      const data: ChartDataPoint[] = [
        { time: '2024-01-01', timestamp: 1000, price: 110, volume: 1000 },
        { time: '2024-01-02', timestamp: 2000, price: 100, volume: 1100 },
      ];

      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该处理单条数据', () => {
      const data: ChartDataPoint[] = [
        { time: '2024-01-01', timestamp: 1000, price: 100, volume: 1000 },
      ];

      render(<InteractivePriceChart data={data} symbol="BTC" />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });
  });

  describe('showGuide 属性', () => {
    it('应该处理 showGuide=true', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" showGuide />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });

    it('应该处理 showGuide=false', () => {
      const data = createMockData();
      render(<InteractivePriceChart data={data} symbol="BTC" showGuide={false} />);

      expect(screen.getByText('legend.price')).toBeInTheDocument();
    });
  });
});
