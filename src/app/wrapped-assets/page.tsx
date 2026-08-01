import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';

import WrappedAssetsContent from './WrappedAssetsContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wrapped Asset Peg Tracker - Insight',
  description:
    'Track wrapped and liquid staking token peg risks against their underlying assets with protocol impact analysis',
};

export default async function WrappedAssetsPage() {
  const initialSnapshots = await calculateAllWrappedAssetSnapshots();

  return <WrappedAssetsContent initialSnapshots={initialSnapshots} />;
}
