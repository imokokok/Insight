import { PegRiskContent } from '@/components/risk/PegRiskContent';
import {
  getStablecoinSnapshotsCached,
  getWrappedAssetSnapshotsCached,
} from '@/lib/risk/pegSnapshots';
import { oldestIsoTimestamp } from '@/lib/risk/snapshotFreshness';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import type { WrappedAssetSnapshot } from '@/lib/wrapped-assets/monitor';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Peg Risk - Insight',
  description:
    'Assess stablecoin, wrapped-asset, and liquid-staking-token peg risk across oracle sources, markets, and affected DeFi protocols.',
};

// These snapshots rely on Supabase and multiple oracle/RPC providers. Render
// them only for a real request so a transient upstream outage cannot fail a
// production deployment. This does not use NEXT_PHASE: Vercel can retain that
// build-time value in a function runtime, which would freeze the page empty.
//
// The expensive fan-out itself lives in the shared Data Cache (see
// `lib/risk/pegSnapshots.ts`), so request-time rendering reuses one computation
// for three minutes instead of recomputing all 57 assets per navigation.
export const dynamic = 'force-dynamic';

// Every request fans out across all configured stablecoin and wrapped-asset
// sources. Bound the worst case so one hung upstream cannot hold a 2 GB Fluid
// instance for the 300s Hobby default; normal renders are well below this.
export const maxDuration = 60;

export default async function PegRiskPage() {
  // Keep partial data when one source is temporarily unavailable.
  const [stablecoinResult, wrappedResult] = await Promise.allSettled([
    getStablecoinSnapshotsCached(),
    getWrappedAssetSnapshotsCached(),
  ]);

  let initialStablecoins: StablecoinDepegSnapshot[] = [];
  let initialWrappedAssets: WrappedAssetSnapshot[] = [];
  const asOfCandidates: Array<string | null> = [];
  if (stablecoinResult.status === 'fulfilled') {
    initialStablecoins = stablecoinResult.value.snapshots;
    asOfCandidates.push(stablecoinResult.value.asOf);
  }
  if (wrappedResult.status === 'fulfilled') {
    initialWrappedAssets = wrappedResult.value.snapshots;
    asOfCandidates.push(wrappedResult.value.asOf);
  }

  return (
    <PegRiskContent
      initialStablecoins={initialStablecoins}
      initialWrappedAssets={initialWrappedAssets}
      initialAsOf={oldestIsoTimestamp(asOfCandidates)}
    />
  );
}
