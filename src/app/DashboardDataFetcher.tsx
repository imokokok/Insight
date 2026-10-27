import { HomeLiveDashboard } from '@/components/home/HomeLiveDashboard';
import { createEmptyDashboardData } from '@/lib/home/dashboardData';

/**
 * Server Component responsible for shipping a static dashboard shell.
 *
 * The client hydrates this shell from the separately cached dashboard endpoint.
 * Keeping live oracle work out of the public page means crawlers and ISR
 * regeneration cannot fan out to upstream price providers.
 */
export function DashboardDataFetcher() {
  return <HomeLiveDashboard initialData={createEmptyDashboardData()} />;
}
