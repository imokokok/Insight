/**
 * Fetchable signed sample receipt for Oracle Watch.
 *
 * Returns a freshly EIP-712 signed OracleWatchCheck for a live Watch signal, so
 * an integrator can drop it straight into their verifier without first standing
 * up a full Watch call. The receipt is signed live on each request and is valid
 * for WATCH_VALID_FOR_SECONDS from `evaluatedAt`, mirroring a real production
 * attestation.
 *
 * GET /api/v1/oracle-watch/attestation/sample?symbol=ETH&chain=ethereum
 *
 * Deliberately signed over the LIVE signal rather than a hard-coded fixture: a
 * sample that does not reflect what the endpoint actually returns is worse than
 * no sample, because it teaches integrators the wrong shape.
 *
 * If the platform attester key is unconfigured (e.g. local dev without
 * ATTESTATION_SIGNER_PRIVATE_KEY), returns 503 — there is no key to sign with,
 * and we never fabricate an unsigned "sample".
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';
import { signWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

const SampleQuerySchema = z.object({
  symbol: SafeSymbolSchema.optional().describe('Asset symbol, defaults to ETH'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum'),
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  z.infer<typeof SampleQuerySchema>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const query = context.validated?.query;
    const symbol = (query?.symbol ?? 'ETH').toUpperCase();
    const chain = query?.chain;

    const signal = await getOracleWatchSignal(symbol, chain);
    const attestation = await signWatchAttestation({
      signal,
      providers: signal.providers,
      subjectChainId: 1,
    });

    if (!attestation) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'attestation_unavailable',
          'Insight attester key is not configured on this instance; no signed sample can be produced.'
        ),
        { status: 503 }
      );
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attestation,
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/oracle-watch/attestation/verify`,
          note: `Freshly signed OracleWatchCheck v1 for a live ${symbol} signal. Valid for WATCH_VALID_FOR_SECONDS from evaluatedAt. Verify it at the verify endpoint or against the .well-known key.`,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { query: SampleQuerySchema },
  }
);
