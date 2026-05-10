import { NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { reputationService } from '@/lib/oracles/services/reputationService';

const RECALC_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

    return NextResponse.json({
      success: true,
      data: reputations,
      meta: {
        calculating: calcInProgress,
        message: calcInProgress
          ? 'Recalculation in progress, new data will be combined with historical records'
          : undefined,
        autoRecalc: true,
        nextRecalcIn: `${RECALC_INTERVAL_MS / 3600000}h`,
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
