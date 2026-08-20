/**
 * Fetchable signed sample receipt (the "sample receipt" half of the published
 * attestation surface).
 *
 * Returns a freshly EIP-712 signed OracleSafetyCheck (schema v2) for a
 * representative pre-trade request, so an integrator can drop it straight into
 * their verifier (the verify endpoint, or the .well-known key document) without
 * first standing up a full pre-trade call. The receipt is signed live on each
 * request and is valid for V2_VALID_FOR_SECONDS from `checkedAt`, mirroring a
 * real production attestation.
 *
 * GET /api/v1/safety/attestation/sample
 *
 * If the platform attester key is unconfigured (e.g. local dev without
 * ATTESTATION_SIGNER_PRIVATE_KEY), returns 503 — there is no key to sign with,
 * and we never fabricate an unsigned "sample".
 */

import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  type ApiHandlerContext,
} from '@/lib/api/handler';
import {
  signAttestationV2,
  type AttestationInputV2,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** Seven production oracle providers, each its own distinct non-derived
 *  operator group, so the v2.1 independence gate reports ASSESSED (>=2). */
const SAMPLE_PROVIDERS: Array<{ provider: string; feedId: string }> = [
  { provider: 'chainlink', feedId: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' },
  { provider: 'api3', feedId: 'ETH/USD' },
  { provider: 'redstone', feedId: 'ETH' },
  { provider: 'dia', feedId: 'ETH/USD' },
  { provider: 'supra', feedId: 'eth_usd' },
  { provider: 'winklink', feedId: 'ETH/USD' },
  { provider: 'switchboard', feedId: 'ETH/USD' },
];

/** Representative ETH/USDC swap observation set (price ~3000 USD). */
function sampleObservations(nowSec: number): ProviderObservationEntry[] {
  const value = 300_012_000_000n; // 3000.12 USD × 1e8
  return SAMPLE_PROVIDERS.map((p, i) => ({
    provider: p.provider,
    feedId: p.feedId,
    value,
    timestamp: BigInt(nowSec - i),
    dataAgeSeconds: BigInt(2 + i),
    included: true,
    exclusionReason: '',
  }));
}

function sampleInput(nowMs: number): AttestationInputV2 {
  const nowSec = Math.floor(nowMs / 1000);
  return {
    verdict: 'PASS',
    sourceAssetId: ETH_NATIVE,
    destinationAssetId: USDC_ETH,
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 10_000,
    consensusPrice: 3000.12,
    maxDeviationPct: 0.8,
    manipulationRiskScore: 0.05,
    participantCount: SAMPLE_PROVIDERS.length,
    crossProviderAgreement: 0.992,
    maxStablecoinDepegPct: 0,
    maxDataAgeSeconds: 9,
    recommendedMaxPositionUsd: 10_000,
    contributingFactors: [],
    providerObservations: sampleObservations(nowSec),
    checkedAtMs: nowMs,
  };
}

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context: ApiHandlerContext<Record<string, unknown>>) => {
    const attestation = await signAttestationV2(sampleInput(Date.now()));

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
          verify: `${base}/api/v1/safety/attestation/verify`,
          note: 'Freshly signed OracleSafetyCheck v2 for a representative ETH/USDC swap. Valid for V2_VALID_FOR_SECONDS from checkedAt. Verify it at the verify endpoint or against the .well-known key.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
