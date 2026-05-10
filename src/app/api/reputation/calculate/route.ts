import { NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { reputationService } from '@/lib/oracles/services/reputationService';

export const POST = createApiHandler(
  async () => {
    const result = await reputationService.calculateAndStore();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Reputation calculation complete: ${result.success} successful, ${result.failed} failed out of ${result.total} queries`,
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
      auth: { required: false },
    },
  }
);

export const GET = createApiHandler(
  async () => {
    await reputationService.seedInitialReputations();

    return NextResponse.json({
      success: true,
      message: 'Seeded initial oracle reputation records',
    });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'strict' },
    },
  }
);
