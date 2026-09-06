import { type NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { recordOracleWatchCheckAsync } from '@/lib/api/services/oracleWatchAudit';
import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { signWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import type { Blockchain } from '@/types/oracle';

import { OracleWatchQuerySchema } from './querySchema';

import type { z } from 'zod';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request, context) => {
    const query = context.validated!.query as z.infer<typeof OracleWatchQuerySchema>;

    const startedAt = Date.now();

    // getOracleWatchSignal degrades unsupported symbols / zero coverage into a
    // DANGER verdict internally, so any throw here is genuinely unexpected —
    // let the createApiHandler error middleware translate it to a 500.
    const result = await getOracleWatchSignal(query.symbol, query.chain);

    const subjectChainId = result.chain
      ? (BLOCKCHAIN_TO_CHAIN_ID[result.chain as Blockchain] ?? 0)
      : 0;

    // Signed proof of this signal. Null when no attester key is configured;
    // it must never change the verdict or fail the request.
    const attestation =
      query.attest === false
        ? null
        : await signWatchAttestation({
            signal: result,
            providers: result.providers,
            subjectChainId,
          });

    // Per-issuance audit row: without it, "this agent gated on a receipt" is
    // unanswerable after the fact. Fire-and-forget — never blocks the response.
    recordOracleWatchCheckAsync(result, attestation, {
      source: 'rest',
      apiKeyId: context.auth?.apiKey?.keyId ?? null,
      latencyMs: Date.now() - startedAt,
      subjectChainId,
    });

    const response: NextResponse = new Response(
      JSON.stringify(
        ApiResponseBuilder.success(attestation ? { ...result, attestation } : result, {
          requestId: context.requestId,
          meta: { verdict: result.verdict, attested: attestation !== null },
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
    validation: { query: OracleWatchQuerySchema },
    // Powers the free website's oracle-watch demo. UI requests are identified
    // by the internal cookie and skip auth/rate-limit/quota; external callers
    // still need an API key and are metered.
    skipInternalAuthAndRateLimit: true,
  }
);
