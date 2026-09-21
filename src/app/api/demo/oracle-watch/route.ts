import { type NextResponse } from 'next/server';

import { type z } from 'zod';

import { OracleWatchQuerySchema } from '@/app/api/v1/oracle-watch/querySchema';
import { ApiResponseBuilder, createApiHandler } from '@/lib/api/handler';
import { recordOracleWatchCheck } from '@/lib/api/services/oracleWatchAudit';
import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { signWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import type { Blockchain } from '@/types/oracle';

/** Session-authenticated website demo. The paid v1 route remains API-key only. */
export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof OracleWatchQuerySchema>;
    const startedAt = Date.now();
    const result = await getOracleWatchSignal(query.symbol, query.chain);
    const subjectChainId = result.chain
      ? (BLOCKCHAIN_TO_CHAIN_ID[result.chain as Blockchain] ?? 0)
      : 0;
    const attestation =
      query.attest === false
        ? null
        : await signWatchAttestation({
            signal: result,
            providers: result.providers,
            subjectChainId,
          });

    await recordOracleWatchCheck(result, attestation, {
      source: 'rest',
      apiKeyId: null,
      latencyMs: Date.now() - startedAt,
      subjectChainId,
    });

    return new Response(
      JSON.stringify(
        ApiResponseBuilder.success(attestation ? { ...result, attestation } : result, {
          requestId: context.requestId,
          meta: { verdict: result.verdict, attested: attestation !== null },
        })
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': CACHE_PRESETS.noStore },
      }
    ) as NextResponse;
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true },
      rateLimit: { preset: 'moderate' },
    },
    validation: { query: OracleWatchQuerySchema },
  }
);
