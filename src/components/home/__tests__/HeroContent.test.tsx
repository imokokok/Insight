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
  describe('Basic rendering', () => {
    it('shouldstate', () => {
      render(<HeroContent />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('shouldtitle', () => {
      render(<HeroContent />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('shouldDescriptiontext', () => {
      render(<HeroContent />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('should', () => {
      render(<HeroContent />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
    });
  });

  describe('CTA button', () => {
    it('should CTA button', () => {
      render(<HeroContent />);

      const primaryCta = screen.getByText('BTC');
      expect(primaryCta).toBeInTheDocument();

      const link = primaryCta.closest('Mock Text');
      expect(link).toHaveAttribute('href', '/price-query');
    });

    it('should CTA button', () => {
      render(<HeroContent />);

      const secondaryCta = screen.getByText('BTC');
      expect(secondaryCta).toBeInTheDocument();

      const link = secondaryCta.closest('Mock Text');
      expect(link).toHaveAttribute('href', '/docs');
    });

    it(' CTA buttonshouldhavestyle', () => {
      render(<HeroContent />);

      const primaryCta = screen.getByText('BTC').closest('Mock Text');
      expect(primaryCta).toHaveClass('bg-gray-900');
      expect(primaryCta).toHaveClass('text-white');
    });

    it(' CTA buttonshouldhavestyle', () => {
      render(<HeroContent />);

      const secondaryCta = screen.getByText('BTC').closest('Mock Text');
      expect(secondaryCta).toHaveClass('bg-white');
      expect(secondaryCta).toHaveClass('border');
    });
  });

  describe('icon', () => {
    it('should ArrowRight icon', () => {
      render(<HeroContent />);

      const primaryCta = screen.getByTestId('link-/price-query');
      expect(primaryCta.querySelector('svg')).toBeInTheDocument();
    });

    it('should BookOpen icon', () => {
      render(<HeroContent />);

      const secondaryCta = screen.getByTestId('link-/docs');
      expect(secondaryCta.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('shouldhaveanimation', () => {
      render(<HeroContent />);

      const pingElement = document.querySelector('.animate-ping');
      expect(pingElement).toBeInTheDocument();
    });
  });
});
