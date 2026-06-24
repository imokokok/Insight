import { NextResponse } from 'next/server';

import { reputationService } from '@/lib/oracles/services/reputationService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CronReputation');

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reputationService.calculateAndStore();
    logger.info(
      `Cron reputation calculation: ${result.success} success, ${result.failed} failed out of ${result.total}`
    );
    return NextResponse.json({
      success: true,
      data: result,
      message: `Cron calculation complete: ${result.success}/${result.total} successful`,
    });
  } catch (error) {
    logger.error(
      'Cron reputation calculation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ success: false, error: 'Calculation failed' }, { status: 500 });
  }
}
