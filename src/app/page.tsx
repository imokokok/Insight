import { Suspense } from 'react';

import { HomeLiveDashboardFallback } from '@/components/home/DashboardContent';

import { DashboardDataFetcher } from './DashboardDataFetcher';
import HomeContent from './HomeContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight — Decision-Input Integrity for AI Agents & Oracle Risk Intelligence',
  description:
    'Before an AI agent acts on a price, verify that the price can be trusted. Multi-source assessment, signed pre-trade verdicts, and preserved evidence — decision-input integrity for onchain agents, with oracle risk as the first assessment domain.',
  keywords: [
    'decision-input integrity',
    'pre-trade safety',
    'agent safety',
    'AI agents',
    'MCP',
    'oracle',
    'oracle risk intelligence',
    'chainlink',
    'price data',
    'blockchain',
    'DeFi',
    'risk',
    'liquidation',
    'transparency',
    'DeFi agent SDK',
    'execution receipt',
    'uni',
  ],
  openGraph: {
    title: 'Insight — Decision-Input Integrity for AI Agents & Oracle Risk Intelligence',
    description:
      'Before an agent acts on a price, verify the price. Multi-source assessment, signed pre-trade verdicts, and verifiable evidence for agents and DeFi.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insight — Decision-Input Integrity for AI Agents & Oracle Risk Intelligence',
    description:
      'Before an agent acts on a price, verify the price. Multi-source assessment, signed pre-trade verdicts, and verifiable evidence for agents and DeFi.',
  },
};

// The live price grid hydrates from its separately cached JSON endpoint. Keep
// the public marketing shell static so crawlers cannot trigger upstream oracle
// fan-out through ISR regeneration.
export const revalidate = 3600;

export default function HomePage() {
  return (
    <HomeContent>
      <Suspense fallback={<HomeLiveDashboardFallback />}>
        <DashboardDataFetcher />
      </Suspense>
    </HomeContent>
  );
}
