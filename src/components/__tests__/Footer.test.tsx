import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import Footer from '../Footer';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img src={src} alt={alt} width={width} height={height} />,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    'aria-label'?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
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

const renderFooter = () => {
  return render(<Footer />, { wrapper: createWrapper() });
};

describe('Footer', () => {
  describe('Basic rendering', () => {
    it('should render footer logo and brand', () => {
      renderFooter();

      expect(screen.getByAltText('Insight Logo')).toBeInTheDocument();
      expect(screen.getByText('Insight')).toBeInTheDocument();
    });

    it('should render tagline', () => {
      renderFooter();

      expect(
        screen.getByText(/Oracle transparency and risk infrastructure for DeFi/i)
      ).toBeInTheDocument();
    });

    it('should render copyright info', () => {
      renderFooter();

      expect(screen.getByText(/© 2026 Insight\. All rights reserved\./i)).toBeInTheDocument();
    });
  });

  describe('Platform links', () => {
    it.each([
      ['Home', '/'],
      ['Price Query', '/price-query'],
      ['Price Insight', '/price-insight'],
      ['Oracle Directory', '/reputation'],
      ['Daily Reports', '/reports'],
      ['API', '/api'],
      ['Pricing', '/api#pricing'],
      ['AI Agents', '/ai'],
    ])('should render %s link', (label, href) => {
      renderFooter();

      const link = screen.getByText(label).closest('a');
      expect(link).toHaveAttribute('href', href);
    });
  });

  describe('Safety links', () => {
    it.each([
      ['Safety Check', '/safety-check'],
      ['Pre-Trade Safety Check', '/ai#safety-check'],
      ['Stablecoin Depeg', '/stablecoin-depeg'],
      ['Wrapped Asset Peg', '/wrapped-assets'],
    ])('should render %s link', (label, href) => {
      renderFooter();

      const link = screen.getByText(label).closest('a');
      expect(link).toHaveAttribute('href', href);
    });
  });

  describe('Resource links', () => {
    it('should render documentation link', () => {
      renderFooter();

      const docsLink = screen.getByText('Documentation').closest('a');
      expect(docsLink).toHaveAttribute('href', '/docs');
    });

    it('should render API reference link', () => {
      renderFooter();

      const apiLink = screen.getByText('API Reference').closest('a');
      expect(apiLink).toHaveAttribute('href', '/docs/api');
    });

    it('should render AI / MCP docs link', () => {
      renderFooter();

      const mcpLink = screen.getByText('AI / MCP Docs').closest('a');
      expect(mcpLink).toHaveAttribute('href', '/ai');
    });

    it('should render GitHub link as external', () => {
      renderFooter();

      const githubLink = screen.getByText('GitHub').closest('a');
      expect(githubLink).toHaveAttribute('href', 'https://github.com/imokokok/Insight');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Social links', () => {
    it.each([
      ['Email', '/contact'],
      ['Twitter', 'https://x.com/imokokok27'],
      ['Discord', 'https://discord.gg/YSNgebjBqh'],
      ['Telegram', 'https://t.me/+6_HoDnRoDK0zNWI1'],
    ])('should render %s social link', (label, href) => {
      renderFooter();

      const link = screen.getByLabelText(label);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', href);
    });
  });

  describe('Legal links', () => {
    it.each([
      ['Privacy Policy', '/privacy'],
      ['Terms of Service', '/terms'],
      ['Refund Policy', '/refund'],
      ['Contact', '/contact'],
    ])('should render %s link', (label, href) => {
      renderFooter();

      const link = screen.getByText(label).closest('a');
      expect(link).toHaveAttribute('href', href);
    });
  });

  describe('External link properties', () => {
    it('should open external links in a new tab with proper security attributes', () => {
      renderFooter();

      const externalLinks = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('http'));

      expect(externalLinks.length).toBeGreaterThan(0);
      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });
});
