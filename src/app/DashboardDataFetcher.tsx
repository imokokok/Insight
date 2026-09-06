import {
  createEmptyDashboardData,
  fetchDashboardInitialDataCached,
} from '@/lib/home/dashboardData';

import HomeContent from './HomeContent';

/**
 * Server Component responsible for fetching the cached dashboard initial data
 * and streaming the result to the client via Suspense.
 *
 * Keeping the data fetch in a separate Server Component allows the parent
 * page.tsx to render the shell immediately and show the Suspense fallback
 * while prices are resolved, instead of blocking the HTML response.
 */
export async function DashboardDataFetcher() {
  // Deploys must not depend on the availability of live oracle/RPC services.
  // The browser immediately hydrates this empty build-time shell from the
  // cached dashboard endpoint; ISR requests after deployment still receive a
  // fully populated server snapshot.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return <HomeContent initialData={createEmptyDashboardData()} />;
  }
  const initialData = await fetchDashboardInitialDataCached();
  return <HomeContent initialData={initialData} />;
}
