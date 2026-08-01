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
    OracleProvider.PYTH,
    OracleProvider.REDSTONE,
    OracleProvider.API3,
    OracleProvider.DIA,
  ],
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
    it('should render the hero headline and value proposition', () => {
      renderDashboard();

      expect(screen.getByText('Make oracle risk')).toBeInTheDocument();
      expect(screen.getByText('transparent before it strikes.')).toBeInTheDocument();
      expect(
        screen.getByText(/faulty feeds never take your protocol by surprise/i)
      ).toBeInTheDocument();
    });

    it('should render search bar', () => {
      renderDashboard();

      expect(
        screen.getByPlaceholderText('Search BTC, ETH, LINK, PYTH, or an oracle provider...')
      ).toBeInTheDocument();
    });

    it('should render feature entry points', () => {
      renderDashboard();

      expect(screen.getAllByText('Price Insight').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Safety Check').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Daily Reports').length).toBeGreaterThanOrEqual(1);
    });

    it('should render the risk story hook and feature grid', () => {
      renderDashboard();

      expect(
        screen.getByText('Oracle deviation can liquidate healthy positions')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Oracle transparency, from data to risk signals')
      ).toBeInTheDocument();
      expect(screen.getByText('Price Insight')).toBeInTheDocument();
    });
  });

  describe('metadata', () => {
    it('should have correct static metadata', async () => {
      const { metadata } = await import('../page');

      expect(metadata.title).toBe('Insight — Oracle Transparency & Risk Infrastructure for DeFi');
      expect(metadata.description).toContain('Verify, compare, and stress-test');
      expect(metadata.keywords).toEqual(
        expect.arrayContaining(['oracle', 'chainlink', 'pyth', 'price data'])
      );
      expect(metadata.openGraph?.title).toBe(
        'Insight — Oracle Transparency & Risk Infrastructure for DeFi'
      );
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('should include correct OpenGraph information', async () => {
      const { metadata } = await import('../page');

      expect(metadata.openGraph?.type).toBe('website');
    });

    it('should include correct Twitter card information', async () => {
      const { metadata } = await import('../page');

      expect(metadata.twitter?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toBe(
        'Insight — Oracle Transparency & Risk Infrastructure for DeFi'
      );
    });
  });
});
