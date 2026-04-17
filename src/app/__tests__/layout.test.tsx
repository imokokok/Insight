import { metadata } from '../layout';

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
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

describe('RootLayout', () => {
  describe('Metadata', () => {
    it('should export correct metadata', () => {
      expect(metadata.title).toBe('Insight');
      expect(metadata.description).toBe('Professional oracle analytics platform');
    });
  });
});
