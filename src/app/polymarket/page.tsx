import { PolymarketPositionsClient } from './PolymarketPositionsClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polymarket Positions — Insight',
  description:
    'View public Polymarket open positions and reported value with a read-only wallet address.',
  robots: { index: false, follow: false },
};

export default function PolymarketPositionsPage() {
  return <PolymarketPositionsClient />;
}
