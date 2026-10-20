import { PegRiskContent } from '@/components/risk/PegRiskContent';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';
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
export const dynamic = 'force-dynamic';

export default async function PegRiskPage() {
  // Keep partial data when one source is temporarily unavailable.
  const [stablecoinResult, wrappedResult] = await Promise.allSettled([
    calculateAllStablecoinSnapshots(),
    calculateAllWrappedAssetSnapshots(),
  ]);

  let initialStablecoins: StablecoinDepegSnapshot[] = [];
  let initialWrappedAssets: WrappedAssetSnapshot[] = [];
  if (stablecoinResult.status === 'fulfilled') initialStablecoins = stablecoinResult.value;
  if (wrappedResult.status === 'fulfilled') initialWrappedAssets = wrappedResult.value;

  return (
    <PegRiskContent
      initialStablecoins={initialStablecoins}
      initialWrappedAssets={initialWrappedAssets}
    />
  );
}
