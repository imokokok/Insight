/**
 * Execute an oracle scenario against the replay engine.
 *
 * POST /api/v1/testing/runs
 * body: { "scenarioId": "euler-redstone-stale-data" }
 *    or { "scenario": { ...inline OracleScenario... } }
 *   → deterministic run result; when an attester key is configured the
 *     response additionally carries an EIP-712 signed Oracle Test Attestation
 *     binding the verdict to the canonical scenario hash. Signing is additive:
 *     a run without a key still returns the full result (attestation: null).
 *
 * GET /api/v1/testing/runs
 *   → harness metadata (version, expected detection per scenario kind, the
 *     run/attestation contract) so integrators can build against it.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import { signTestAttestation } from '@/lib/testing/oracleScenario/attestation';
import {
  EXPECTED_DETECTION,
  runScenario,
  HARNESS_VERSION,
} from '@/lib/testing/oracleScenario/engine';
import { getFixtureById } from '@/lib/testing/oracleScenario/fixtures';
import {
  OracleScenarioSchema,
  SCENARIO_KINDS,
  type OracleScenario,
} from '@/lib/testing/oracleScenario/schema';

const RunBodySchema = z
  .object({
    scenarioId: z.string().min(1).optional(),
    scenario: z.unknown().optional(),
  })
  .refine((body) => body.scenarioId !== undefined || body.scenario !== undefined, {
    message: 'provide either scenarioId or an inline scenario',
  });

type RunBody = z.infer<typeof RunBodySchema>;

interface RunResponse {
  result: ReturnType<typeof runScenario>;
  scenario: OracleScenario;
  attestation: Awaited<ReturnType<typeof signTestAttestation>>;
}

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  RunResponse,
  RunBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<RunBody>) => {
    const body = context.validated!.body!;

    let scenario: OracleScenario;
    if (body.scenarioId !== undefined) {
      const fixture = getFixtureById(body.scenarioId);
      if (!fixture) {
        return NextResponse.json(
          ApiResponseBuilder.error(
            'SCENARIO_NOT_FOUND',
            `No built-in scenario with id "${body.scenarioId}". GET /api/v1/testing/scenarios lists the catalog.`,
            { details: { scenarioId: body.scenarioId } }
          ),
          { status: 404 }
        );
      }
      scenario = fixture.scenario;
    } else {
      const parsed = OracleScenarioSchema.safeParse(body.scenario);
      if (!parsed.success) {
        return NextResponse.json(
          ApiResponseBuilder.error('SCENARIO_INVALID', 'Inline scenario failed validation.', {
            details: {
              issues: parsed.error.issues.slice(0, 10) as unknown as Record<string, unknown>,
            },
          }),
          { status: 400 }
        );
      }
      scenario = parsed.data;
    }

    const result = runScenario(scenario);
    const attestation = await signTestAttestation(result, scenario);

    return NextResponse.json(
      ApiResponseBuilder.success(
        { result, scenario, attestation },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { body: RunBodySchema },
  }
);

export const GET = createApiHandler<
  {
    harnessVersion: string;
    kinds: readonly string[];
    expectedDetection: Record<string, readonly string[]>;
  },
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          harnessVersion: HARNESS_VERSION,
          kinds: SCENARIO_KINDS,
          expectedDetection: EXPECTED_DETECTION,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
