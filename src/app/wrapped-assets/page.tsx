import { PegMonitorContent } from '@/components/risk/PegMonitorContent';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wrapped Asset Peg Tracker - Insight',
  description:
    'Track wrapped and liquid staking token peg risks against their underlying assets with protocol impact analysis',
};

export default async function WrappedAssetsPage() {
  const initialSnapshots = await calculateAllWrappedAssetSnapshots();

  return <PegMonitorContent kind="wrapped" initialSnapshots={initialSnapshots} />;
}
