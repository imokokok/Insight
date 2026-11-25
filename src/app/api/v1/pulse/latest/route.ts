/**
 * Public fetchable Pulse receipt.
 *
 * Returns a freshly EIP-712 signed OraclePulse for a live Watch signal, so
 * the `insight-pulse-trail` GitHub repo can poll it on a cron and pin each
 * response to Bitcoin via OpenTimestamps.
 *
 * GET /api/v1/pulse/latest?symbol=ETH&chain=ethereum&sample=true
 *
 * Defaults to the DEDICATED SAMPLE signer (registry role "sample") — safe
 * for public trails, anyone verifying can read the role. Pass `sample=false`
 * to use the production attester key when present.
 *
 * 503 when the chosen attester key is unconfigured. We never fabricate an
 * unsigned "pulse" — absent key means absent trail entry.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';
import { signPulseAttestation, type PulseAttestation } from '@/lib/attestations/pulseAttestation';
import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

const PulseQuerySchema = z.object({
  symbol: SafeSymbolSchema.optional().describe('Asset symbol, defaults to ETH'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum'),
  sample: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Use dedicated SAMPLE signer (role "sample" in .well-known registry). Defaults true for public trail safety.'
    ),
  subjectChainId: z.coerce.number().int().positive().optional().default(1),
});

export const OPTIONS = createOptionsHandler();

function attesterUrl(): string {
  return `${
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000')
  }/.well-known/oracle-keys.json`;
}

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  z.infer<typeof PulseQuerySchema>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const query = context.validated?.query;
    const symbol = (query?.symbol ?? 'ETH').toUpperCase();
    const chain = query?.chain;
    const sample = query?.sample ?? true;
    const subjectChainId = query?.subjectChainId ?? 1;

    const signal = await getOracleWatchSignal(symbol, chain);

    const attestation: PulseAttestation | null = await signPulseAttestation(
      {
        signal,
        providers: signal.providers,
        subjectChainId,
      },
      { sample }
    );

    if (!attestation) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'pulse_unavailable',
          sample
            ? 'Dedicated SAMPLE signer key is not configured on this instance (ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY). Configure it for the public trail, or pass sample=true and the production key when no sample key is provisioned.'
            : 'Production attester key is not configured on this instance. Configure ATTESTATION_SIGNER_PRIVATE_KEY, or pass sample=true to use the dedicated sample signer.'
        ),
        { status: 503 }
      );
    }

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          schema: 'insight.pulse.v1',
          attestation,
          wellKnown: attesterUrl(),
          trail: 'github.com/insight/insight-pulse-trail',
          openTimestamps: 'opentimestamps.org',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
    validation: { query: PulseQuerySchema },
  }
);
