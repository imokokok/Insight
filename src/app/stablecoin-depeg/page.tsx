import StablecoinDepegContent from './StablecoinDepegContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stablecoin Depeg Monitor - Insight',
  description:
    'Real-time stablecoin depeg risk monitoring across oracle providers and chains with protocol impact analysis',
};

export default function StablecoinDepegPage() {
  return <StablecoinDepegContent />;
}
