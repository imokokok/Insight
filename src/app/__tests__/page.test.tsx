import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import HomePage from '../page';

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_importFn: () => Promise<unknown>, _options?: { loading?: () => ReactNode }) => {
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
  describe('Basic rendering', () => {
    it('should render the home page correctly', () => {
      renderHomePage();

      expect(screen.getByTestId('professional-hero')).toBeInTheDocument();
    });

    it('should render the main container', () => {
      renderHomePage();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('min-h-screen', 'rounded-lg');
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
      expect(metadata.openGraph?.locale).toBe('en_US');
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
