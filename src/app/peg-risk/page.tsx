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

export default async function PegRiskPage() {
  // No NEXT_PHASE build guard: on Vercel that comparison is true at runtime
  // (build env leak), which kept this page on its empty build render forever.
  // Local/CI builds without data-source env degrade via Promise.allSettled.
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
