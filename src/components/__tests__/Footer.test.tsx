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
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
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
  return render(<Footer />, { wrapper: createWrapper });
};

describe('Footer', () => {
  describe('Basic rendering', () => {
    it('should render footer correctly', () => {
      renderFooter();

      expect(screen.getByAltText('Insight Logo')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('shouldDescription', () => {
      renderFooter();

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('should render copyright info', () => {
      renderFooter();

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
  });

  describe('Platform links', () => {
    it('shouldPlatform linkstitle', () => {
      renderFooter();

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('should render home link', () => {
      renderFooter();

      const homeLink = screen.getByText('BTC').closest('Mock Text');
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should render price query link', () => {
      renderFooter();

      const priceQueryLink = screen.getByText('BTC').closest('Mock Text');
      expect(priceQueryLink).toHaveAttribute('href', '/price-query');
    });

    it('should render cross-oracle link', () => {
      renderFooter();

      const crossOracleLink = screen.getByText('BTC').closest('Mock Text');
      expect(crossOracleLink).toHaveAttribute('href', '/cross-oracle');
    });

    it('should render cross-chain link', () => {
      renderFooter();

      const crossChainLink = screen.getByText('BTC').closest('Mock Text');
      expect(crossChainLink).toHaveAttribute('href', '/cross-chain');
    });
  });

  describe('link', () => {
    it('shouldlinktitle', () => {
      renderFooter();

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('shouldlink', () => {
      renderFooter();

      const docsLink = screen.getByText('BTC').closest('Mock Text');
      expect(docsLink).toHaveAttribute('href', '/docs');
    });

    it('should GitHub link', () => {
      renderFooter();

      const githubLink = screen.getByText('BTC').closest('Mock Text');
      expect(githubLink).toHaveAttribute('href', 'https://github.com');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should API link', () => {
      renderFooter();

      const apiLink = screen.getByText('BTC').closest('Mock Text');
      expect(apiLink).toHaveAttribute('href', '/api');
    });
  });

  describe('link', () => {
    it('should Twitter link', () => {
      renderFooter();

      const twitterLink = screen.getByLabelText('Twitter');
      expect(twitterLink).toBeInTheDocument();
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should GitHub link', () => {
      renderFooter();

      const githubLinks = screen.getAllByLabelText('Mock Text');
      expect(githubLinks.length).toBeGreaterThan(0);

      const socialGithubLink = githubLinks.find(
        (link) => link.getAttribute('href') === 'https://github.com'
      );
      expect(socialGithubLink).toBeDefined();
      expect(socialGithubLink).toHaveAttribute('target', '_blank');
      expect(socialGithubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should Discord link', () => {
      renderFooter();

      const discordLink = screen.getByLabelText('Twitter');
      expect(discordLink).toBeInTheDocument();
      expect(discordLink).toHaveAttribute('href', 'https://discord.com');
      expect(discordLink).toHaveAttribute('target', '_blank');
      expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should Telegram link', () => {
      renderFooter();

      const telegramLink = screen.getByLabelText('Twitter');
      expect(telegramLink).toBeInTheDocument();
      expect(telegramLink).toHaveAttribute('href', 'https://telegram.org');
      expect(telegramLink).toHaveAttribute('target', '_blank');
      expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('link', () => {
    it('shouldlink', () => {
      renderFooter();

      const privacyLink = screen.getByText('BTC').closest('Mock Text');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('shouldservicelink', () => {
      renderFooter();

      const termsLink = screen.getByText('BTC').closest('Mock Text');
      expect(termsLink).toHaveAttribute('href', '/terms');
    });

    it('shouldlink', () => {
      renderFooter();

      const contactLink = screen.getByText('BTC').closest('Mock Text');
      expect(contactLink).toHaveAttribute('href', '/contact');
    });
  });

  describe('Logo link', () => {
    it('Logo shouldlinkto', () => {
      renderFooter();

      const logoLink = screen.getByAltText('Insight Logo').closest('Mock Text');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('externallinkproperty', () => {
    it('externallinkshouldhaveproperty', () => {
      renderFooter();

      const externalLinks = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href')?.startsWith('http'));

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });
});
