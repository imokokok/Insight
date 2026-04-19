import HomeContent from './HomeContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight - Oracle Data Platform',
  description:
    'Comprehensive analysis and comparison of major oracle protocols. Real-time price monitoring, protocol performance evaluation for Web3 developers and analysts.',
  keywords: ['oracle', 'chainlink', 'pyth', 'price data', 'blockchain', 'DeFi', 'data analytics'],
  openGraph: {
    title: 'Insight - Oracle Data Platform',
    description: 'Comprehensive analysis and comparison of major oracle protocols.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insight - Oracle Data Platform',
    description: 'Comprehensive analysis and comparison of major oracle protocols.',
  },
};

export default function HomePage() {
  return <HomeContent />;
}
