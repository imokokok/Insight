import { Suspense } from 'react';

import { HeroSkeleton } from '@/components/ui';

import { DashboardDataFetcher } from './DashboardDataFetcher';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight — Oracle Transparency & Risk Infrastructure for DeFi',
  description:
    'Independent oracle transparency and risk infrastructure for DeFi. Verify, compare, and stress-test oracle prices across Chainlink, RedStone, API3 and more. Give AI agents a pre-trade oracle safety checkpoint via MCP.',
  keywords: [
    'oracle',
    'chainlink',
    'price data',
    'blockchain',
    'DeFi',
    'risk',
    'liquidation',
    'transparency',
    'infrastructure',
    'AI agents',
    'MCP',
    'pre-trade safety',
    'uni',
  ],
  openGraph: {
    title: 'Insight — Oracle Transparency & Risk Infrastructure for DeFi',
    description:
      'Independent oracle transparency and risk infrastructure for DeFi. Verify, compare, and stress-test oracle prices across Chainlink, RedStone, API3 and more.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insight — Oracle Transparency & Risk Infrastructure for DeFi',
    description:
      'Independent oracle transparency and risk infrastructure for DeFi. Verify, compare, and stress-test oracle prices across Chainlink, RedStone, API3 and more.',
  },
};

export const revalidate = 15;

export default function HomePage() {
  return (
    <Suspense fallback={<HeroSkeleton />}>
      <DashboardDataFetcher />
    </Suspense>
  );
}
