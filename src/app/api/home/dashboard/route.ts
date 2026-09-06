import { createCachedJsonResponse } from '@/lib/api/utils';
import { fetchDashboardInitialDataCached } from '@/lib/home/dashboardData';

export const revalidate = 60;

/**
 * Fixed-shape public dashboard snapshot. A GET endpoint lets Vercel's edge
 * cache absorb homepage refreshes instead of repeating a metered POST fan-out
 * for every open tab.
 */
export async function GET() {
  const data = await fetchDashboardInitialDataCached();
  return createCachedJsonResponse({ success: true, data }, { preset: 'shortLived' });
}
