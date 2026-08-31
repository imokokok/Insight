import { PegMonitorContent } from '@/components/risk/PegMonitorContent';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stablecoin Depeg Tracker - Insight',
  description:
    '15-minute stablecoin depeg risk tracking across oracle providers and chains with protocol impact analysis',
};

export default async function StablecoinDepegPage() {
  const initialSnapshots = await calculateAllStablecoinSnapshots();

  return <PegMonitorContent kind="stablecoin" initialSnapshots={initialSnapshots} />;
}
