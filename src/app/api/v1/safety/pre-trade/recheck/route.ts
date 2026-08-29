/**
 * Pre-trade re-check endpoint.
 *
 * POST /api/v1/safety/pre-trade/recheck
 *
 * Re-runs the pre-trade safety check with FRESH oracle state and issues a new
 * `OracleSafetyRecheck` attestation that references the original check (by
 * originalUid + originalRequestHash). Use case: an agent checked at T₀, time
 * passes, and right before executing at T₁ the agent rechecks to confirm the
 * oracle is still healthy. The recheck verdict / consensusPrice reflect T₁.
 *
 * The recheck does NOT overwrite or mutate the original attestation — it issues
 * a separate signed type. Because the recheck uses the same trade params as the
 * original, its own `requestHash` equals `originalRequestHash`; verifiers can
 * assert this to confirm same-trade continuity.
 *
 * Body: trade params (must match the original) + originalUid + originalRequestHash
 * + optional originalConsensusPrice (for drift) + optional maxDriftPct threshold.
 */

import { type NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { preTradeRecheck } from '@/lib/api/services/preTradeRecheckService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { SafeSymbolSchema } from '@/lib/security/validation';

const Bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid bytes32 hash (expected 0x + 64 hex chars)');

const RecheckBodySchema = z.object({
  // Trade params — MUST match the original check so requestHash matches.
  asset: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC, USDC (must match original)'),
  chainId: z.coerce.number().int().describe('Chain ID (must match original)'),
  action: z
    .enum(['swap', 'borrow', 'lend', 'liquidate', 'repay'])
    .describe('Type of DeFi operation (must match original)'),
  tradeAmountUsd: z.coerce.number().positive().describe('Trade size in USD (must match original)'),
  targetProviders: z
    .string()
    .optional()
    .describe('Comma-separated oracle providers to restrict the check to'),
  protocolId: z.string().optional().describe('Optional lending protocol id to evaluate against'),
  destinationAsset: z
    .string()
    .optional()
    .describe('Destination asset symbol (must match original)'),

  // Original references.
  originalUid: z.string().min(1).describe('UID of the original v2 attestation being re-verified'),
  originalRequestHash: Bytes32Schema.describe(
    'requestHash from the original check (binds the same trade)'
  ),

  // Drift comparison (optional).
  originalConsensusPrice: z
    .number()
    .positive()
    .optional()
    .describe('Raw consensus price from the original response, for drift comparison'),
  maxDriftPct: z
    .number()
    .positive()
    .optional()
    .describe('Drift threshold (percent) above which stillValid=false. Default 2%'),
  schemaVersion: z
    .union([z.literal(2), z.literal(3)])
    .optional()
    .describe(
      'Schema version of the re-run + recheck: 2 (default, 28-field recheck) or 3 ' +
        '(29-field recheck over the 27-field base that signs the independence threshold)'
    ),
});

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler(
  async (_request, context) => {
    const body = context.validated!.body as z.infer<typeof RecheckBodySchema>;

    // preTradeRecheck re-runs preTradeSafetyCheck, which swallows
    // UnsupportedSymbolError internally (→ BLOCK verdict). Any throw here is
    // genuinely unexpected — let the error middleware translate it to a 500.
    const result = await preTradeRecheck(
      {
        asset: body.asset,
        chainId: body.chainId,
        action: body.action,
        tradeAmountUsd: body.tradeAmountUsd,
        targetProviders: body.targetProviders
          ? body.targetProviders
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : undefined,
        protocolId: body.protocolId,
        destinationAsset: body.destinationAsset,
        originalUid: body.originalUid,
        originalRequestHash: body.originalRequestHash as `0x${string}`,
        originalConsensusPrice: body.originalConsensusPrice,
        maxDriftPct: body.maxDriftPct,
        schemaVersion: body.schemaVersion,
      },
      { apiKeyId: context.auth?.apiKey?.keyId }
    );

    // Manual JSON.stringify (mirrors the pre-trade route) so the response is
    // safe against any future non-JSON-safe fields and carries a no-store cache
    // header — a recheck is a point-in-time snapshot and must never be cached.
    const response: NextResponse = new Response(
      JSON.stringify(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
          meta: {
            verdict: result.verdict,
            stillValid: result.stillValid,
            stillValidReason: result.stillValidReason,
            driftSinceOriginalPct: result.driftSinceOriginalPct,
          },
        })
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': CACHE_PRESETS.noStore,
        },
      }
    ) as NextResponse;

    return response;
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: RecheckBodySchema },
  }
);
