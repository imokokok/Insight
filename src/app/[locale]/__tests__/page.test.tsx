import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import HomePage, { generateMetadata } from '../page';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (importFn: () => Promise<unknown>, options?: { loading?: () => ReactNode }) => {
    const MockComponent = () => <div data-testid="professional-hero">ProfessionalHero</div>;
    MockComponent.displayName = 'DynamicComponent';
    return MockComponent;
  },
}));

jest.mock('@/components/ui', () => ({
  HeroSkeleton: () => <div data-testid="hero-skeleton">Loading...</div>,
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

const renderHomePage = () => {
  return render(<HomePage />, { wrapper: createWrapper() });
};

describe('HomePage', () => {
  describe('基础渲染', () => {
    it('应该正确渲染首页', () => {
      renderHomePage();

      expect(screen.getByTestId('professional-hero')).toBeInTheDocument();
    });

    it('应该渲染 main 容器', () => {
      renderHomePage();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('min-h-screen', 'rounded-lg');
    });
  });

  describe('generateMetadata', () => {
    it('应该为英文生成正确的 metadata', async () => {
      const params = Promise.resolve({ locale: 'en' });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe('Insight - Oracle Data Platform');
      expect(metadata.description).toContain('Comprehensive analysis and comparison');
      expect(metadata.keywords).toEqual(
        expect.arrayContaining(['oracle', 'chainlink', 'pyth', 'price data'])
      );
      expect(metadata.openGraph?.title).toBe('Insight - Oracle Data Platform');
      expect(metadata.openGraph?.locale).toBe('en_US');
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('应该为中文生成正确的 metadata', async () => {
      const params = Promise.resolve({ locale: 'zh-CN' });
      const metadata = await generateMetadata({ params });

      expect(metadata.title).toBe('Insight - 预言机数据平台');
      expect(metadata.description).toContain('全面分析和比较');
      expect(metadata.keywords).toEqual(expect.arrayContaining(['预言机', 'oracle', 'chainlink']));
      expect(metadata.openGraph?.title).toBe('Insight - 预言机数据平台');
      expect(metadata.openGraph?.locale).toBe('zh_CN');
    });

    it('应该包含正确的 OpenGraph 信息', async () => {
      const params = Promise.resolve({ locale: 'en' });
      const metadata = await generateMetadata({ params });

      expect(metadata.openGraph?.type).toBe('website');
    });

    it('应该包含正确的 Twitter 卡片信息', async () => {
      const params = Promise.resolve({ locale: 'en' });
      const metadata = await generateMetadata({ params });

      expect(metadata.twitter?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toBe('Insight - Oracle Data Platform');
    });
  });
});
