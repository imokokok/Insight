import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import Footer from '../Footer';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, width, height }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
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
  describe('基础渲染', () => {
    it('应该正确渲染页脚', () => {
      renderFooter();

      expect(screen.getByAltText('Insight Logo')).toBeInTheDocument();
      expect(screen.getByText('Insight')).toBeInTheDocument();
    });

    it('应该渲染描述文字', () => {
      renderFooter();

      expect(screen.getByText('footer.description')).toBeInTheDocument();
    });

    it('应该渲染版权信息', () => {
      renderFooter();

      expect(screen.getByText('footer.copyright')).toBeInTheDocument();
    });
  });

  describe('平台链接', () => {
    it('应该渲染平台链接标题', () => {
      renderFooter();

      expect(screen.getByText('footer.links.platform')).toBeInTheDocument();
    });

    it('应该渲染首页链接', () => {
      renderFooter();

      const homeLink = screen.getByText('navbar.home').closest('a');
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('应该渲染价格查询链接', () => {
      renderFooter();

      const priceQueryLink = screen.getByText('navbar.priceQuery').closest('a');
      expect(priceQueryLink).toHaveAttribute('href', '/price-query');
    });

    it('应该渲染跨预言机链接', () => {
      renderFooter();

      const crossOracleLink = screen.getByText('navbar.crossOracle').closest('a');
      expect(crossOracleLink).toHaveAttribute('href', '/cross-oracle');
    });

    it('应该渲染跨链链接', () => {
      renderFooter();

      const crossChainLink = screen.getByText('navbar.crossChain').closest('a');
      expect(crossChainLink).toHaveAttribute('href', '/cross-chain');
    });
  });

  describe('资源链接', () => {
    it('应该渲染资源链接标题', () => {
      renderFooter();

      expect(screen.getByText('footer.links.resources')).toBeInTheDocument();
    });

    it('应该渲染文档链接', () => {
      renderFooter();

      const docsLink = screen.getByText('footer.documentation').closest('a');
      expect(docsLink).toHaveAttribute('href', '/docs');
    });

    it('应该渲染 GitHub 链接', () => {
      renderFooter();

      const githubLink = screen.getByText('footer.github').closest('a');
      expect(githubLink).toHaveAttribute('href', 'https://github.com');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('应该渲染 API 链接', () => {
      renderFooter();

      const apiLink = screen.getByText('footer.api').closest('a');
      expect(apiLink).toHaveAttribute('href', '/api');
    });
  });

  describe('社交媒体链接', () => {
    it('应该渲染 Twitter 链接', () => {
      renderFooter();

      const twitterLink = screen.getByLabelText('Twitter');
      expect(twitterLink).toBeInTheDocument();
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('应该渲染 GitHub 社交链接', () => {
      renderFooter();

      const githubLinks = screen.getAllByLabelText('GitHub');
      expect(githubLinks.length).toBeGreaterThan(0);

      const socialGithubLink = githubLinks.find(
        (link) => link.getAttribute('href') === 'https://github.com'
      );
      expect(socialGithubLink).toBeDefined();
      expect(socialGithubLink).toHaveAttribute('target', '_blank');
      expect(socialGithubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('应该渲染 Discord 链接', () => {
      renderFooter();

      const discordLink = screen.getByLabelText('Discord');
      expect(discordLink).toBeInTheDocument();
      expect(discordLink).toHaveAttribute('href', 'https://discord.com');
      expect(discordLink).toHaveAttribute('target', '_blank');
      expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('应该渲染 Telegram 链接', () => {
      renderFooter();

      const telegramLink = screen.getByLabelText('Telegram');
      expect(telegramLink).toBeInTheDocument();
      expect(telegramLink).toHaveAttribute('href', 'https://telegram.org');
      expect(telegramLink).toHaveAttribute('target', '_blank');
      expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('底部链接', () => {
    it('应该渲染隐私政策链接', () => {
      renderFooter();

      const privacyLink = screen.getByText('footer.privacy').closest('a');
      expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('应该渲染服务条款链接', () => {
      renderFooter();

      const termsLink = screen.getByText('footer.terms').closest('a');
      expect(termsLink).toHaveAttribute('href', '/terms');
    });

    it('应该渲染联系我们链接', () => {
      renderFooter();

      const contactLink = screen.getByText('footer.contact').closest('a');
      expect(contactLink).toHaveAttribute('href', '/contact');
    });
  });

  describe('Logo 链接', () => {
    it('Logo 应该链接到首页', () => {
      renderFooter();

      const logoLink = screen.getByAltText('Insight Logo').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('外部链接安全属性', () => {
    it('外部链接应该有正确的安全属性', () => {
      renderFooter();

      const externalLinks = screen.getAllByRole('link').filter(
        (link) => link.getAttribute('href')?.startsWith('http')
      );

      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });
});
