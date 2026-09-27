import { Suspense } from 'react';

import { HomeLiveDashboardFallback } from '@/components/home/DashboardContent';

import { DashboardDataFetcher } from './DashboardDataFetcher';
import HomeContent from './HomeContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight — Oracle Transparency & Risk Intelligence for DeFi',
  description:
    'Oracle transparency and risk intelligence for DeFi. Compare sources, assess deviation, freshness and independence, and preserve signed assessment evidence for protocols and AI agents.',
  keywords: [
    'oracle',
    'chainlink',
    'price data',
    'blockchain',
    'DeFi',
    'risk',
    'liquidation',
    'transparency',
    'oracle risk intelligence',
    'AI agents',
    'MCP',
    'DeFi agent SDK',
    'execution receipt',
    'pre-trade safety',
    'uni',
  ],
  openGraph: {
    title: 'Insight — Oracle Transparency & Risk Intelligence for DeFi',
    description:
      'See the oracles behind the price. Compare sources, understand oracle risk, and retain verifiable assessment evidence for DeFi.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insight — Oracle Transparency & Risk Intelligence for DeFi',
    description:
      'See the oracles behind the price. Compare sources, understand oracle risk, and retain verifiable assessment evidence for DeFi.',
  },
};

export const revalidate = 60;

export default function HomePage() {
  return (
    <HomeContent>
      <Suspense fallback={<HomeLiveDashboardFallback />}>
        <DashboardDataFetcher />
      </Suspense>
    </HomeContent>
  );
}
