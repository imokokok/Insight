import { unstable_cache } from 'next/cache';

import type { ReputationListData } from '@/hooks/data/useReputations';
import { reputationService, type OracleReputation } from '@/lib/oracles/services/reputationService';
import { QueryProvider } from '@/providers/QueryProvider';

import ReputationContent from './ReputationContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oracle Directory - Insight',
  description:
    'Explore oracle providers, their unique capabilities, and historical performance tracking',
};

// Keep deployment independent of Supabase availability while preserving a
// warm, server-rendered first paint. The client still refetches live
// `calculating`/`nextRecalcAt` state after hydration.
export const dynamic = 'force-dynamic';

const getReputationsCached = unstable_cache(
  () => reputationService.getReputations(),
  ['reputation-directory'],
  { revalidate: 60, tags: ['oracle-reputations'] }
);

export default async function ReputationPage() {
  let initialData: ReputationListData | undefined;
  try {
    const data: OracleReputation[] = await getReputationsCached();
    initialData = { data, calculating: false, nextRecalcAt: null };
  } catch {
    // If Supabase is unavailable at request time, fall back to client-side
    // fetching so the page still renders.
    initialData = undefined;
  }

  return (
    <QueryProvider>
      <ReputationContent initialData={initialData} />
    </QueryProvider>
  );
}
