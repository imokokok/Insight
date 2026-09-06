import { PegMonitorContent } from '@/components/risk/PegMonitorContent';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wrapped Asset Peg Tracker - Insight',
  description:
    'Track wrapped and liquid staking token peg risks against their underlying assets with protocol impact analysis',
};

export default async function WrappedAssetsPage() {
  // Keep deployments independent from live RPC/oracle availability. The
  // client immediately fetches the same API when this build-time shell is
  // empty, while runtime rendering can still provide an initial snapshot.
  const initialSnapshots =
    process.env.NEXT_PHASE === 'phase-production-build'
      ? []
      : await calculateAllWrappedAssetSnapshots();

  return <PegMonitorContent kind="wrapped" initialSnapshots={initialSnapshots} />;
}
