/**
 * Public catalog of built-in oracle scenario fixtures.
 *
 * GET /api/v1/testing/scenarios
 *   → the full list of replayable scenarios (mechanism reconstructions of
 *     publicly documented oracle failures + clearly-labeled synthetic ones),
 *     each with its incident provenance. Unauthenticated by design: the
 *     scenarios are the public vocabulary of the harness.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getFixtures } from '@/lib/testing/oracleScenario/fixtures';
import { SCENARIO_KINDS } from '@/lib/testing/oracleScenario/schema';

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  {
    count: number;
    kinds: readonly string[];
    scenarios: Array<{ scenario: unknown; incident: unknown }>;
  },
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const scenarios = getFixtures().map((f) => ({
      scenario: f.scenario,
      incident: f.incident,
    }));

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          count: scenarios.length,
          kinds: SCENARIO_KINDS,
          scenarios,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
