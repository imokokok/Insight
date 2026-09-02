import { ApiPageContent } from './ApiPageContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight API — Oracle Reliability for DeFi',
  description:
    '15-minute oracle reliability assessment: cross-provider reputation, deviation, depeg risk, liquidation stress tests and anomaly detection via REST API. Credit-metered per call — subscribe or top up.',
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
      '15-minute reliability assessment across 11+ oracle providers and 40+ chains — reputation, deviation, depeg and liquidation risk.',
    type: 'website',
  },
};

export default function ApiPage() {
  return <ApiPageContent />;
}
