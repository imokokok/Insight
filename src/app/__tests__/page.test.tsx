import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import HomePage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/data/useReputations', () => ({
  useReputations: () => ({ data: null, isLoading: false }),
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
  describe('Basic rendering', () => {
    it('should render the dashboard', () => {
      renderHomePage();

      expect(screen.getByText('Insight Dashboard')).toBeInTheDocument();
    });

    it('should render search bar', () => {
      renderHomePage();

      expect(screen.getByPlaceholderText('Search BTC, ETH, oracle...')).toBeInTheDocument();
    });

    it('should render consensus price section', () => {
      renderHomePage();

      expect(screen.getByText('Live Consensus Prices')).toBeInTheDocument();
    });
  });

  describe('metadata', () => {
    it('should have correct static metadata', async () => {
      const { metadata } = await import('../page');

      expect(metadata.title).toBe('Insight - Oracle Data Platform');
      expect(metadata.description).toContain('Comprehensive analysis and comparison');
      expect(metadata.keywords).toEqual(
        expect.arrayContaining(['oracle', 'chainlink', 'pyth', 'price data'])
      );
      expect(metadata.openGraph?.title).toBe('Insight - Oracle Data Platform');
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('should include correct OpenGraph information', async () => {
      const { metadata } = await import('../page');

      expect(metadata.openGraph?.type).toBe('website');
    });

    it('should include correct Twitter card information', async () => {
      const { metadata } = await import('../page');

      expect(metadata.twitter?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toBe('Insight - Oracle Data Platform');
    });
  });
});
