import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { updateAllFeedStalenessBaselines } from '@/lib/oracles/feedCadence';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('CronFeedCadence');

export interface FeedCadenceCronResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Backfills oracle_feed staleness baselines (observed_data_age_p90_s) so the
 * pre-trade cadence-relative staleness check has data to read. Scheduled runs
 * execute directly on GitHub Actions; the HTTP route is retained as a manual
 * authenticated fallback.
 */
export async function runFeedCadenceBackfill(): Promise<FeedCadenceCronResult> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await updateAllFeedStalenessBaselines(supabase);
    logger.info(`Cron feed-cadence baseline backfill complete: ${updated} feeds updated`);
    return {
      status: 200,
      body: {
        success: true,
        data: { updated },
        message: `Feed-cadence baseline backfill complete: ${updated} feeds updated`,
      },
    };
  } catch (error) {
    logger.error('Cron feed-cadence baseline backfill failed', normalizeError(error));
    return { status: 500, body: { success: false, error: 'Backfill failed' } };
  }
}

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runFeedCadenceBackfill();
  return NextResponse.json(body, { status });
}
