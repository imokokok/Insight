import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('CronReputation');

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

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
    logger.error('Cron reputation calculation failed', normalizeError(error));
    return NextResponse.json({ success: false, error: 'Calculation failed' }, { status: 500 });
  }
}
