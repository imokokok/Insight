import { type NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { SafeSymbolSchema } from '@/lib/security/validation';

const PreTradeQuerySchema = z.object({
  asset: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC, USDC'),
  chainId: z.coerce.number().int().describe('Chain ID, e.g. 1=Ethereum, 0=chain-agnostic'),
  action: z
    .enum(['swap', 'borrow', 'lend', 'liquidate', 'repay'])
    .describe('Type of DeFi operation'),
  tradeAmountUsd: z.coerce.number().positive().describe('Trade size in USD'),
  targetProviders: z
    .string()
    .optional()
    .describe('Comma-separated list of oracle providers to restrict the check to'),
  protocolId: z
    .string()
    .optional()
    .describe('Optional lending protocol id to evaluate against (e.g. aave-v3-ethereum)'),
  schemaVersion: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .optional()
    .describe(
      'Attestation schema version: 1 (default, 11-field), 2 (26-field, CAIP-19 + quorum gate), ' +
        'or 3 (27-field: v2 + the signed independence threshold, so the gate is self-verifying)'
    ),
  destinationAsset: z
    .string()
    .optional()
    .describe(
      'Optional destination asset symbol (v2 binds it as destinationAssetId; not evaluated in v2.0)'
    ),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof PreTradeQuerySchema>;

    // preTradeSafetyCheck swallows UnsupportedSymbolError internally and returns
    // a BLOCK verdict, so any throw here is genuinely unexpected — let the
    // createApiHandler error middleware translate it to a 500.
    const result = await preTradeSafetyCheck(
      {
        asset: query.asset,
        chainId: query.chainId,
        action: query.action,
        tradeAmountUsd: query.tradeAmountUsd,
        targetProviders: query.targetProviders
          ? query.targetProviders
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : undefined,
        protocolId: query.protocolId,
        schemaVersion: query.schemaVersion,
        destinationAsset: query.destinationAsset,
      },
      { apiKeyId: context.auth?.apiKey?.keyId }
    );

    const response: NextResponse = new Response(
      JSON.stringify(
        ApiResponseBuilder.success(result, {
          requestId: context.requestId,
          meta: { verdict: result.verdict },
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
    validation: { query: PreTradeQuerySchema },
  }
);
