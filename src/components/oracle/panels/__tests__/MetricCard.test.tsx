import { render, screen } from '@testing-library/react';

import { MetricCard } from '../MetricCard';
import { type NetworkMetric } from '../types';

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

const createMockMetric = (overrides?: Partial<NetworkMetric>): NetworkMetric => ({
  title: '测试指标',
  value: '100',
  trend: 5.5,
  trendDirection: 'up',
  icon: <span data-testid="metric-icon">📊</span>,
  ...overrides,
});

describe('MetricCard', () => {
  describe('基础渲染', () => {
    it('应该正确渲染指标卡片', () => {
      const metric = createMockMetric();
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('测试指标')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('应该渲染指标图标', () => {
      const metric = createMockMetric();
      render(<MetricCard metric={metric} />);

      expect(screen.getByTestId('metric-icon')).toBeInTheDocument();
    });

    it('应该渲染单位（如果提供）', () => {
      const metric = createMockMetric({ unit: 'USD' });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    it('应该渲染趋势百分比', () => {
      const metric = createMockMetric({ trend: 10.5 });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('+10.5%')).toBeInTheDocument();
    });

    it('应该渲染负趋势', () => {
      const metric = createMockMetric({ trend: -5.2 });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('-5.2%')).toBeInTheDocument();
    });
  });

  describe('趋势方向样式', () => {
    it('上升趋势应该显示绿色样式', () => {
      const metric = createMockMetric({ trendDirection: 'up' });
      const { container } = render(<MetricCard metric={metric} />);

      const trendElement = container.querySelector('.text-success-600');
      expect(trendElement).toBeInTheDocument();
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('下降趋势应该显示红色样式', () => {
      const metric = createMockMetric({ trendDirection: 'down' });
      const { container } = render(<MetricCard metric={metric} />);

      const trendElement = container.querySelector('.text-danger-600');
      expect(trendElement).toBeInTheDocument();
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('中性趋势应该显示灰色样式', () => {
      const metric = createMockMetric({ trendDirection: 'neutral' });
      const { container } = render(<MetricCard metric={metric} />);

      const trendElement = container.querySelector('.text-gray-500');
      expect(trendElement).toBeInTheDocument();
      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });

  describe('数值类型', () => {
    it('应该正确渲染字符串值', () => {
      const metric = createMockMetric({ value: '1,234.56' });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('1,234.56')).toBeInTheDocument();
    });

    it('应该正确渲染数字值', () => {
      const metric = createMockMetric({ value: 1234 });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('1234')).toBeInTheDocument();
    });
  });

  describe('卡片样式', () => {
    it('应该有正确的卡片样式', () => {
      const metric = createMockMetric();
      const { container } = render(<MetricCard metric={metric} />);

      const card = container.firstChild;
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200', 'rounded-lg');
    });

    it('应该显示 "vsLastWeek" 文本', () => {
      const metric = createMockMetric();
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('networkHealth.vsLastWeek')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理零趋势', () => {
      const metric = createMockMetric({ trend: 0 });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('应该处理没有单位的情况', () => {
      const metric = createMockMetric({ unit: undefined });
      render(<MetricCard metric={metric} />);

      expect(screen.queryByText('USD')).not.toBeInTheDocument();
    });

    it('应该处理大数值', () => {
      const metric = createMockMetric({ value: '1,000,000,000' });
      render(<MetricCard metric={metric} />);

      expect(screen.getByText('1,000,000,000')).toBeInTheDocument();
    });
  });
});
