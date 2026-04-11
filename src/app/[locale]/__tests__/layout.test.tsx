jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

jest.mock('next-intl/server', () => ({
  getMessages: () => Promise.resolve({}),
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en', 'zh-CN'],
    defaultLocale: 'en',
  },
}));

jest.mock('@/components/AppInitializer', () => ({
  AppInitializer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/Footer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/Navbar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/PerformanceMetricsCollector', () => ({
  PerformanceMetricsCollector: () => null,
}));

jest.mock('@/components/realtime/ConnectionStatus', () => ({
  ConnectionStatusIndicator: () => null,
}));

jest.mock('@/providers/ReactQueryProvider', () => ({
  ReactQueryProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { generateStaticParams, metadata } from '../layout';

describe('LocaleLayout', () => {
  describe('静态参数生成', () => {
    it('generateStaticParams 应该返回所有支持的语言', () => {
      const params = generateStaticParams();

      expect(params).toEqual([
        { locale: 'en' },
        { locale: 'zh-CN' },
      ]);
    });
  });

  describe('Metadata', () => {
    it('应该导出正确的 metadata', () => {
      expect(metadata.title).toBe('Insight');
      expect(metadata.description).toBe('Professional oracle analytics platform');
    });
  });
});
