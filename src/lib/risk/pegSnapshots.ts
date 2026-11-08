import { unstable_cache } from 'next/cache';

import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import type { StablecoinDepegSnapshot } from '@/lib/stablecoins/monitor';
import { calculateAllWrappedAssetSnapshots } from '@/lib/wrapped-assets/monitor';
import type { WrappedAssetSnapshot } from '@/lib/wrapped-assets/monitor';

import { PEG_SNAPSHOT_TTL_SECONDS, newestSnapshotAsOf } from './snapshotFreshness';

export interface CachedPegSnapshots<T> {
  snapshots: T[];
  /** Newest `lastUpdated` in the set; moves only when the set is recomputed. */
  asOf: string;
}

/**
 * Shared Data Cache for the stablecoin fan-out.
 *
 * Both the `/peg-risk` page render and `/api/stablecoin-depeg` read this entry,
 * so one recomputation serves every request inside the three-minute window
 * (across instances and route paths). The HTTP response for the metered API is
 * still forced to `private, no-store` by the handler's auth policy, so this
 * cache cannot bypass quota metering.
 */
export const getStablecoinSnapshotsCached = unstable_cache(
  async (): Promise<CachedPegSnapshots<StablecoinDepegSnapshot>> => {
    const snapshots = await calculateAllStablecoinSnapshots();
    return { snapshots, asOf: newestSnapshotAsOf(snapshots) };
  },
  ['peg-stablecoin-snapshots-v1'],
  { revalidate: PEG_SNAPSHOT_TTL_SECONDS, tags: ['peg-snapshots'] }
);

/**
 * Shared Data Cache for the wrapped-asset fan-out, used by the page render.
 *
 * `/api/wrapped-assets` is a public endpoint, so it stays on the CDN layer
 * (`s-maxage=180`) instead of stacking this cache on top — two 180 s layers
 * would make a response up to six minutes old.
 */
export const getWrappedAssetSnapshotsCached = unstable_cache(
  async (): Promise<CachedPegSnapshots<WrappedAssetSnapshot>> => {
    const snapshots = await calculateAllWrappedAssetSnapshots();
    return { snapshots, asOf: newestSnapshotAsOf(snapshots) };
  },
  ['peg-wrapped-asset-snapshots-v1'],
  { revalidate: PEG_SNAPSHOT_TTL_SECONDS, tags: ['peg-snapshots'] }
);
