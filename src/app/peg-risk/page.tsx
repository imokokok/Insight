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
  let initialStablecoins: StablecoinDepegSnapshot[] = [];
  let initialWrappedAssets: WrappedAssetSnapshot[] = [];

  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    const [stablecoinResult, wrappedResult] = await Promise.allSettled([
      calculateAllStablecoinSnapshots(),
      calculateAllWrappedAssetSnapshots(),
    ]);

    if (stablecoinResult.status === 'fulfilled') initialStablecoins = stablecoinResult.value;
    if (wrappedResult.status === 'fulfilled') initialWrappedAssets = wrappedResult.value;
  }

  return (
    <PegRiskContent
      initialStablecoins={initialStablecoins}
      initialWrappedAssets={initialWrappedAssets}
    />
  );
}
