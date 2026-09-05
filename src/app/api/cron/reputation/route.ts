import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('CronReputation');

export interface ReputationCronResult {
  status: number;
  body: Record<string, unknown>;
}

/** Shared pipeline for the GitHub Actions runner and the manual HTTP fallback. */
export async function runReputationCalculation(): Promise<ReputationCronResult> {
  try {
    const result = await reputationService.calculateAndStore();
    logger.info(
      `Cron reputation calculation: ${result.success} success, ${result.failed} failed out of ${result.total}`
    );
    return {
      status: 200,
      body: {
        success: true,
        data: result,
        message: `Cron calculation complete: ${result.success}/${result.total} successful`,
      },
    };
  } catch (error) {
    logger.error('Cron reputation calculation failed', normalizeError(error));
    return { status: 500, body: { success: false, error: 'Calculation failed' } };
  }
}

/** Manual authenticated fallback; scheduled execution runs directly on GitHub Actions. */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runReputationCalculation();
  return NextResponse.json(body, { status });
}
