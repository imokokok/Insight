import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { updateAllFeedStalenessBaselines } from '@/lib/oracles/feedCadence';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('CronFeedCadence');

/**
 * Backfills oracle_feed staleness baselines (observed_data_age_p90_s) so the
 * pre-trade cadence-relative staleness check has data to read. Triggered by the
 * pg_cron job `feed-cadence-baselines` (registered in migration 0032) via the
 * SECURITY DEFINER SQL fn `trigger_feed_cadence_backfill()`, which POSTs here
 * exactly like `trigger_reputation_fetch` -> /api/cron/reputation.
 */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  try {
    const supabase = createServiceRoleClient();
    const updated = await updateAllFeedStalenessBaselines(supabase);
    logger.info(`Cron feed-cadence baseline backfill complete: ${updated} feeds updated`);
    return NextResponse.json({
      success: true,
      data: { updated },
      message: `Feed-cadence baseline backfill complete: ${updated} feeds updated`,
    });
  } catch (error) {
    logger.error('Cron feed-cadence baseline backfill failed', normalizeError(error));
    return NextResponse.json({ success: false, error: 'Backfill failed' }, { status: 500 });
  }
}
