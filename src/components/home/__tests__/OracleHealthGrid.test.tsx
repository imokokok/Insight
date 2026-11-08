import { type ReactNode } from 'react';

import { render, screen } from '@testing-library/react';

import { OracleHealthGrid } from '../OracleHealthGrid';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // Test double for next/image; optimization is intentionally outside jsdom.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    'aria-label': ariaLabel,
  }: {
    href: string;
    children: ReactNode;
    'aria-label'?: string;
  }) => (
    <a href={href} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

describe('OracleHealthGrid', () => {
  it('does not present an unavailable provider snapshot as an all-provider outage', () => {
    render(
      <OracleHealthGrid
        now={Date.UTC(2026, 10, 9)}
        reputations={[]}
        dataState="unavailable"
        unavailableMessage="Live source data is temporarily unavailable."
        displayLimit={1}
      />
    );

    expect(screen.getByText('Provider data unavailable')).toBeInTheDocument();
    expect(screen.getByText('Live source data is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('100% of network')).not.toBeInTheDocument();
    expect(screen.queryByText('13')).not.toBeInTheDocument();
  });

  it('keeps measured zero scores distinct from unavailable data', () => {
    render(
      <OracleHealthGrid
        now={Date.UTC(2026, 10, 9)}
        reputations={[
          {
            provider: 'chainlink',
            overall_score: 0,
            accuracy_score: 0,
            uptime_percentage: 0,
            avg_latency_ms: 0,
            avg_deviation_pct: 0,
            reliability_score: 0,
            freshness_score: 0,
            total_queries: 0,
            failed_queries: 0,
            supported_symbols_count: 0,
            supported_chains_count: 0,
            last_calculated_at: null,
          },
        ]}
      />
    );

    expect(screen.getAllByText('down')).not.toHaveLength(0);
    expect(screen.getByText('100% of network')).toBeInTheDocument();
  });
});
