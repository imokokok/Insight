import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';

import StablecoinDepegContent from './StablecoinDepegContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stablecoin Depeg Tracker - Insight',
  description:
    'Hourly stablecoin depeg risk tracking across oracle providers and chains with protocol impact analysis',
};

export default async function StablecoinDepegPage() {
  const initialSnapshots = await calculateAllStablecoinSnapshots();

  return <StablecoinDepegContent initialSnapshots={initialSnapshots} />;
}
