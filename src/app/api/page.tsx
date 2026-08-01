import { ApiPageContent } from './ApiPageContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight API — Oracle Reliability for DeFi',
  description:
    'Hourly oracle reliability assessment: cross-provider reputation, deviation, depeg risk, liquidation stress tests and anomaly detection via REST API. Free 1,000 calls/mo.',
  keywords: [
    'oracle API',
    'DeFi API',
    'Chainlink API',
    'oracle reliability API',
    'stablecoin depeg API',
  ],
  openGraph: {
    title: 'Insight API — Oracle Reliability for DeFi',
    description:
      'Hourly reliability assessment across 11+ oracle providers and 40+ chains — reputation, deviation, depeg and liquidation risk.',
    type: 'website',
  },
};

export default function ApiPage() {
  return <ApiPageContent />;
}
