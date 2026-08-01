import type { ReputationListData } from '@/hooks/data/useReputations';
import { reputationService, type OracleReputation } from '@/lib/oracles/services/reputationService';

import ReputationContent from './ReputationContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oracle Directory - Insight',
  description:
    'Explore oracle providers, their unique capabilities, and historical performance tracking',
};

// Re-generate the server-rendered HTML at most once per minute. The client
// still refetches from the API for live `calculating`/`nextRecalcAt` state,
// but ISR lets us ship a fully populated directory on first paint instead of
// a loading spinner.
export const revalidate = 60;

export default async function ReputationPage() {
  let initialData: ReputationListData | undefined;
  try {
    const data: OracleReputation[] = await reputationService.getReputations();
    initialData = { data, calculating: false, nextRecalcAt: null };
  } catch {
    // If Supabase is unavailable at request time, fall back to client-side
    // fetching so the page still renders.
    initialData = undefined;
  }

  return <ReputationContent initialData={initialData} />;
}
