import { ApiPageContent } from './ApiPageContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight API — Oracle Transparency & Risk Intelligence',
  description:
    'Oracle prices, cross-source comparison, freshness, reputation, Peg Risk, and protocol stress tests through one credit-metered REST API.',
  keywords: ['oracle API', 'DeFi API', 'Chainlink API', 'oracle reliability API', 'peg risk API'],
  openGraph: {
    title: 'Insight API — Oracle Transparency & Risk Intelligence',
    description:
      'Oracle transparency and risk intelligence across 10 providers and 40+ chains: source comparison, freshness, Peg Risk, and protocol exposure.',
    type: 'website',
  },
};

export default function ApiPage() {
  return <ApiPageContent />;
}
