import { PegMonitorContent } from '@/components/risk/PegMonitorContent';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stablecoin Depeg Tracker - Insight',
  description:
    '15-minute stablecoin depeg risk tracking across oracle providers and chains with protocol impact analysis',
};

export default async function StablecoinDepegPage() {
  // Keep deployments independent from live RPC/oracle availability. The
  // client immediately fetches the same API when this build-time shell is
  // empty, while runtime rendering can still provide an initial snapshot.
  const initialSnapshots =
    process.env.NEXT_PHASE === 'phase-production-build'
      ? []
      : await calculateAllStablecoinSnapshots();

  return <PegMonitorContent kind="stablecoin" initialSnapshots={initialSnapshots} />;
}
