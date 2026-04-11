import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import HeroContent from '../HeroContent';

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
    <a href={href} className={className} data-testid={`link-${href}`}>
      {children}
    </a>
  ),
}));

describe('HeroContent', () => {
  describe('基础渲染', () => {
    it('应该渲染实时数据状态指示器', () => {
      render(<HeroContent />);

      expect(screen.getByText('home.hero.liveData')).toBeInTheDocument();
    });

    it('应该渲染标题', () => {
      render(<HeroContent />);

      expect(screen.getByText('home.hero.title.part1')).toBeInTheDocument();
      expect(screen.getByText('home.hero.title.part2')).toBeInTheDocument();
    });

    it('应该渲染描述文本', () => {
      render(<HeroContent />);

      expect(screen.getByText('home.hero.description')).toBeInTheDocument();
    });

    it('应该渲染统计数据', () => {
      render(<HeroContent />);

      expect(screen.getByText('home.hero.stats.oracles')).toBeInTheDocument();
      expect(screen.getByText('home.hero.stats.dataSources')).toBeInTheDocument();
      expect(screen.getByText('home.hero.stats.realtime')).toBeInTheDocument();
    });
  });

  describe('CTA 按钮', () => {
    it('应该渲染主要 CTA 按钮', () => {
      render(<HeroContent />);

      const primaryCta = screen.getByText('home.hero.ctaPrimary');
      expect(primaryCta).toBeInTheDocument();

      const link = primaryCta.closest('a');
      expect(link).toHaveAttribute('href', '/price-query');
    });

    it('应该渲染次要 CTA 按钮', () => {
      render(<HeroContent />);

      const secondaryCta = screen.getByText('home.hero.ctaSecondary');
      expect(secondaryCta).toBeInTheDocument();

      const link = secondaryCta.closest('a');
      expect(link).toHaveAttribute('href', '/docs');
    });

    it('主要 CTA 按钮应该有正确的样式', () => {
      render(<HeroContent />);

      const primaryCta = screen.getByText('home.hero.ctaPrimary').closest('a');
      expect(primaryCta).toHaveClass('bg-gray-900');
      expect(primaryCta).toHaveClass('text-white');
    });

    it('次要 CTA 按钮应该有正确的样式', () => {
      render(<HeroContent />);

      const secondaryCta = screen.getByText('home.hero.ctaSecondary').closest('a');
      expect(secondaryCta).toHaveClass('bg-white');
      expect(secondaryCta).toHaveClass('border');
    });
  });

  describe('图标渲染', () => {
    it('应该渲染 ArrowRight 图标', () => {
      render(<HeroContent />);

      const primaryCta = screen.getByTestId('link-/price-query');
      expect(primaryCta.querySelector('svg')).toBeInTheDocument();
    });

    it('应该渲染 BookOpen 图标', () => {
      render(<HeroContent />);

      const secondaryCta = screen.getByTestId('link-/docs');
      expect(secondaryCta.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('动画效果', () => {
    it('实时数据指示器应该有动画效果', () => {
      render(<HeroContent />);

      const pingElement = document.querySelector('.animate-ping');
      expect(pingElement).toBeInTheDocument();
    });
  });
});
