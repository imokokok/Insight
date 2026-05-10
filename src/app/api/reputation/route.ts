import { NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { reputationService } from '@/lib/oracles/services/reputationService';

const RECALC_INTERVAL_MS = 60 * 60 * 1000;

let calcInProgress = false;

export const GET = createApiHandler(
  async () => {
    const reputations = await reputationService.getReputations();

    if (!reputations || reputations.length === 0) {
      await reputationService.seedInitialReputations();

      if (!calcInProgress) {
        calcInProgress = true;
        reputationService
          .calculateAndStore()
          .catch(() => {})
          .finally(() => {
            calcInProgress = false;
          });
      }

      const seeded = await reputationService.getReputations();

      return NextResponse.json({
        success: true,
        data: seeded,
        meta: {
          calculating: true,
          message: 'First-time calculation in progress, scores will update shortly',
          recalcIntervalMs: RECALC_INTERVAL_MS,
        },
      });
    }

    const now = Date.now();
    const needsRecalc = reputations.some((r) => {
      if (!r.last_calculated_at) return true;
      const lastCalc = new Date(r.last_calculated_at).getTime();
      return now - lastCalc > RECALC_INTERVAL_MS;
    });

    if (needsRecalc && !calcInProgress) {
      calcInProgress = true;
      reputationService
        .calculateAndStore()
        .catch(() => {})
        .finally(() => {
          calcInProgress = false;
        });
    }

    const latestCalcAt = reputations.reduce<number | null>((latest, r) => {
      if (!r.last_calculated_at) return latest;
      const ts = new Date(r.last_calculated_at).getTime();
      return latest === null || ts > latest ? ts : latest;
    }, null);

    const nextRecalcAt = latestCalcAt && !calcInProgress ? latestCalcAt + RECALC_INTERVAL_MS : null;

    return NextResponse.json({
      success: true,
      data: reputations,
      meta: {
        calculating: calcInProgress,
        message: calcInProgress
          ? 'Recalculation in progress, new data will be combined with historical records'
          : undefined,
        autoRecalc: true,
        recalcIntervalMs: RECALC_INTERVAL_MS,
        nextRecalcAt: nextRecalcAt ? new Date(nextRecalcAt).toISOString() : null,
      },
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
    },
  }
);

export const POST = createApiHandler(
  async () => {
    if (calcInProgress) {
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

    calcInProgress = true;

    try {
      const result = await reputationService.calculateAndStore();
      return NextResponse.json({
        success: true,
        data: result,
        message: `Reputation calculation complete: ${result.success} successful, ${result.failed} failed out of ${result.total} queries`,
      });
    } finally {
      calcInProgress = false;
    }
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
    },
  }
);
