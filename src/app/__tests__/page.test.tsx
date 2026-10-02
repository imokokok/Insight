import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import DashboardContent from '@/components/home/DashboardContent';
import type { ServerDashboardData } from '@/lib/home/dashboardData';
import { OracleProvider } from '@/types/oracle';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/data/useReputations', () => ({
  useReputations: () => ({ data: null, isLoading: false }),
}));

const mockInitialData: ServerDashboardData = {
  prices: [],
  fetchedAt: Date.now(),
  hasError: false,
  mainOracles: [
    OracleProvider.CHAINLINK,
    OracleProvider.REDSTONE,
    OracleProvider.API3,
    OracleProvider.DIA,
  ],
  reputations: [],
};

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

const renderDashboard = () => {
  return render(<DashboardContent initialData={mockInitialData} />, { wrapper: createWrapper() });
};

describe('HomePage', () => {
  describe('Basic rendering', () => {
    it('should render an accessible hero headline and value proposition', () => {
      renderDashboard();

      const hero = screen.getByRole('heading', { level: 1 });
      expect(hero.textContent?.trim()).toBeTruthy();
      expect(
        hero.closest('section')?.querySelector('p.home-hero-description')?.textContent?.trim()
      ).toBeTruthy();
    });

    it('should lead into source evidence without a duplicate hero search', () => {
      renderDashboard();

      expect(document.querySelector('a[href="#live-evidence"]')).toBeInTheDocument();
      expect(document.getElementById('live-evidence')).toBeInTheDocument();
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('should render feature entry points', () => {
      renderDashboard();

      for (const href of ['/price-insight', '/safety-check', '/reports']) {
        expect(document.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
      }
    });

    it('should render the risk story hook and feature grid', () => {
      renderDashboard();

      expect(document.getElementById('risk-threshold-title')).toBeInTheDocument();
      expect(document.querySelector('a[href="/safety-check"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/price-insight"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/sdk"]')).toBeInTheDocument();
    });
  });

  describe('metadata', () => {
    it('should have correct static metadata', async () => {
      const { metadata } = await import('../page');

      expect(metadata.title).toMatch(/Insight/);
      expect(metadata.description?.length).toBeGreaterThan(30);
      expect(metadata.keywords).toEqual(
        expect.arrayContaining(['oracle', 'chainlink', 'uni', 'price data'])
      );
      expect(metadata.openGraph?.title).toBe(metadata.title);
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('should include correct OpenGraph information', async () => {
      const { metadata } = await import('../page');

      expect(metadata.openGraph?.type).toBe('website');
    });

    it('should include correct Twitter card information', async () => {
      const { metadata } = await import('../page');

      expect(metadata.twitter?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toBe(metadata.title);
    });
  });
});
