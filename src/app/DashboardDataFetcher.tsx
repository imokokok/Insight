import { fetchDashboardInitialDataCached } from '@/lib/home/dashboardData';

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
  const initialData = await fetchDashboardInitialDataCached();
  return <HomeContent initialData={initialData} />;
}
