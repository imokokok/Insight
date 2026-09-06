import { NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('ReputationRoute');

const RECALC_INTERVAL_MS = 60 * 60 * 1000;

// NOTE: This module-level lock only prevents concurrent recalculations within a
// single serverless/edge instance. In multi-instance deployments it cannot
// guarantee mutual exclusion across instances. To avoid the lock being held
// forever if a background calculation never settles (e.g. process frozen
// mid-flight), a timestamp-based timeout auto-releases it after
// CALC_LOCK_TIMEOUT_MS.
const CALC_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

let calcInProgress = false;
let calcStartedAt = 0;

function acquireCalcLock(): boolean {
  const now = Date.now();
  if (calcInProgress) {
    if (now - calcStartedAt > CALC_LOCK_TIMEOUT_MS) {
      logger.warn('Reputation calculation lock held beyond timeout, force-releasing', {
        heldMs: now - calcStartedAt,
      });
      calcInProgress = false;
    } else {
      return false;
    }
  }
  calcInProgress = true;
  calcStartedAt = now;
  return true;
}

function releaseCalcLock(): void {
  calcInProgress = false;
  calcStartedAt = 0;
}

function isCalcInProgress(): boolean {
  if (calcInProgress && Date.now() - calcStartedAt > CALC_LOCK_TIMEOUT_MS) {
    logger.warn('Reputation calculation lock held beyond timeout, force-releasing', {
      heldMs: Date.now() - calcStartedAt,
    });
    releaseCalcLock();
  }
  return calcInProgress;
}

export const GET = createApiHandler(
  async () => {
    const reputations = await reputationService.getReputations();

    if (!reputations || reputations.length === 0) {
      await reputationService.seedInitialReputations();

      if (acquireCalcLock()) {
        reputationService
          .calculateAndStore()
          .catch((error) => {
            logger.error('Background reputation calculation failed', normalizeError(error));
          })
          .finally(() => {
            releaseCalcLock();
          });
      }

      const seeded = await reputationService.getReputations();

      const response = NextResponse.json({
        success: true,
        data: seeded,
        meta: {
          calculating: true,
          message: 'First-time calculation in progress, scores will update shortly',
          recalcIntervalMs: RECALC_INTERVAL_MS,
        },
      });
      response.headers.set('Cache-Control', CACHE_PRESETS.noStore);
      return response;
    }

    const now = Date.now();
    const needsRecalc = reputations.some((r) => {
      if (!r.last_calculated_at) return true;
      const lastCalc = new Date(r.last_calculated_at).getTime();
      return now - lastCalc > RECALC_INTERVAL_MS;
    });

    if (needsRecalc && acquireCalcLock()) {
      reputationService
        .calculateAndStore()
        .catch((error) => {
          logger.error('Background reputation calculation failed', normalizeError(error));
        })
        .finally(() => {
          releaseCalcLock();
        });
    }

    const latestCalcAt = reputations.reduce<number | null>((latest, r) => {
      if (!r.last_calculated_at) return latest;
      const ts = new Date(r.last_calculated_at).getTime();
      return latest === null || ts > latest ? ts : latest;
    }, null);

    const calculating = isCalcInProgress();
    const nextRecalcAt = latestCalcAt && !calculating ? latestCalcAt + RECALC_INTERVAL_MS : null;

    const response = NextResponse.json({
      success: true,
      data: reputations,
      meta: {
        calculating,
        message: calculating
          ? 'Recalculation in progress, new data will be combined with historical records'
          : undefined,
        autoRecalc: true,
        recalcIntervalMs: RECALC_INTERVAL_MS,
        nextRecalcAt: nextRecalcAt ? new Date(nextRecalcAt).toISOString() : null,
      },
    });
    response.headers.set(
      'Cache-Control',
      calculating ? CACHE_PRESETS.noStore : CACHE_PRESETS.shortLived
    );
    return response;
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
  }
);

export const POST = createApiHandler(
  async () => {
    if (isCalcInProgress()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CALC_IN_PROGRESS',
            message: 'A calculation is already in progress',
          },
        },
        { status: 409 }
      );
    }

    if (!acquireCalcLock()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CALC_IN_PROGRESS',
            message: 'A calculation is already in progress',
          },
        },
        { status: 409 }
      );
    }

    try {
      const result = await reputationService.calculateAndStore();
      return NextResponse.json({
        success: true,
        data: result,
        message: `Reputation calculation complete: ${result.success} successful, ${result.failed} failed out of ${result.total} queries`,
      });
    } finally {
      releaseCalcLock();
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
      auth: { required: true, allowApiKey: true },
    },
    skipInternalAuthAndRateLimit: true,
  }
);
