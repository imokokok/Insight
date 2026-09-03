/**
 * Pre-trade safety envelope prototype (environment.market_state +
 * environment.price_integrity conjunction).
 *
 * GET /api/v1/safety/envelope
 *   ?demo=live             (default) both receipts fetched, verified locally,
 *                           envelope verdict = conjunction
 *   ?demo=expired          deliberate failure: Insight receipt validly signed
 *                           700s ago → its 600s window has lapsed → BLOCK
 *   ?demo=tampered         deliberate failure: consensusPrice mutated after
 *                           signing → EIP-712 uid mismatch → BLOCK
 *   ?demo=tampered-market  deliberate failure: market status mutated after
 *                           fetch → Ed25519 signature no longer covers the
 *                           payload → BLOCK
 *   &mic=XCOI              (default XCOI) Headless Oracle demo venue
 *
 * This is the two-receipt prototype Michael Msebenzi specified: an ETH/USDC
 * gate requiring BOTH the Insight OracleSafetyCheck v2 receipt and the
 * Headless Oracle market-state receipt, missing/expired/negative failing
 * closed, and driven red on purpose with an expired and a tampered receipt
 * ("a gate that has never gone red hasn't been shown able to").
 *
 * The endpoint always answers 200 with a verdict — an unreachable upstream is
 * a BLOCK (fail-closed diagnosis), never a 5xx. Both raw receipts are echoed
 * so any third party can re-verify each member independently against the two
 * published key registries.
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
  verifyAttestationV2,
  type OracleSafetyAttestationV2,
  type VerificationResultV2,
} from '@/lib/attestations/oracleSafetyAttestationV2';
import { buildSampleAttestationInput } from '@/lib/attestations/sampleOracleSafetyInput';
import {
  fetchAndVerifyHeadlessMarketState,
  fetchHeadlessDemoReceipt,
  fetchHeadlessKeyRegistry,
  extractHeadlessReceipt,
  verifyHeadlessMarketStateAgainstRegistry,
  headlessFetchFailedResult,
  getHeadlessOracleBaseUrl,
  type HeadlessDemoResponse,
  type MarketStateVerificationResult,
} from '@/lib/envelope/headlessMarketState';
import {
  evaluatePreTradeEnvelope,
  type MarketStateMemberInput,
  type PreTradeEnvelopeResult,
  type PriceIntegrityMemberInput,
} from '@/lib/envelope/preTradeEnvelope';

const DEMO_MODES = ['live', 'expired', 'tampered', 'tampered-market'] as const;
type DemoMode = (typeof DEMO_MODES)[number];

/** Backdate window for the expired demo: 700s ago means the 600s validity
 * window lapsed ~100s ago — expired, but unambiguously genuinely signed. */
const EXPIRED_DEMO_BACKDATE_MS = 700_000;

const DEMO_NOTES: Record<DemoMode, string> = {
  live: 'Both receipts fetched and verified locally against their published key registries; the envelope verdict is the conjunction of the two members.',
  expired:
    'Deliberate failure demo: the Insight receipt was validly signed 700 seconds ago, so its 600 second validity window has lapsed. The gate must go red with price_integrity_expired.',
  tampered:
    'Deliberate failure demo: the verdict was mutated after signing (the classic forge-a-PASS attack), so the EIP-712 uid no longer matches the signed data. The gate must go red with price_integrity_signature_invalid.',
  'tampered-market':
    'Deliberate failure demo: the market status on the Headless Oracle receipt was mutated after fetching, so its Ed25519 signature no longer covers the payload. The gate must go red with market_state_signature_invalid.',
};

interface EnvelopeResponse {
  envelope: PreTradeEnvelopeResult;
  demoMode: DemoMode;
  prototype: true;
  priceIntegrity: {
    receipt: OracleSafetyAttestationV2 | null;
    verification: VerificationResultV2 | null;
    wellKnown: string;
    verify: string;
  };
  marketState: {
    receipt: HeadlessDemoResponse | null;
    verification: MarketStateVerificationResult;
    keyRegistry: string;
    demoEndpoint: string;
  };
  note: string;
}

/** verifyAttestationV2 collapses signature + freshness into `valid` with a
 * `reason`; an expired receipt still carries a genuine signature, so recover
 * that fact for the member's check ladder (signature ≠ freshness). */
function priceIntegrityMember(
  receipt: OracleSafetyAttestationV2 | null,
  verification: VerificationResultV2 | null
): PriceIntegrityMemberInput {
  if (!receipt) {
    return { present: false, signatureValid: false, expired: false, verdict: null };
  }
  const signatureValid = (verification?.valid ?? false) || verification?.reason === 'expired';
  return {
    present: true,
    signatureValid,
    expired: verification?.expired ?? false,
    verdict: receipt.data.verdict,
  };
}

function marketStateMember(
  side: Awaited<ReturnType<typeof fetchAndVerifyHeadlessMarketState>>
): MarketStateMemberInput {
  return {
    present: side.envelope !== null,
    signatureValid: side.result.signatureValid,
    expired: side.result.expired,
    status: side.result.status,
  };
}

/** Fetch the Headless side; in tampered-market mode mutate the signed market
 * status after fetching so local verification must reject it. The mutation is
 * confined to this prototype branch — production verification paths never
 * touch receipt contents. */
async function headlessSide(mic: string, demo: DemoMode) {
  if (demo !== 'tampered-market') {
    return fetchAndVerifyHeadlessMarketState(mic);
  }
  try {
    const [envelope, registry] = await Promise.all([
      fetchHeadlessDemoReceipt(mic),
      fetchHeadlessKeyRegistry(),
    ]);
    const receipt = extractHeadlessReceipt(envelope);
    const tamperedStatus = receipt.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    receipt.status = tamperedStatus;
    if (envelope.receipt) envelope.receipt.status = tamperedStatus;
    envelope.status = tamperedStatus;
    return {
      envelope,
      result: verifyHeadlessMarketStateAgainstRegistry(receipt, registry),
    };
  } catch (error) {
    return { envelope: null, result: headlessFetchFailedResult(error) };
  }
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
  EnvelopeResponse,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (request: NextRequest, context: ApiHandlerContext<Record<string, unknown>>) => {
    const params = new URL(request.url).searchParams;
    const demo = (params.get('demo') ?? 'live') as DemoMode;
    const mic = (params.get('mic') ?? 'XCOI').toUpperCase();

    if (!DEMO_MODES.includes(demo)) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'invalid_demo_mode',
          `demo must be one of: ${DEMO_MODES.join(', ')}`
        ),
        { status: 400 }
      );
    }
    if (!/^[A-Z]{4}$/.test(mic)) {
      return NextResponse.json(
        ApiResponseBuilder.error('invalid_mic', 'mic must be a 4-letter uppercase MIC code'),
        { status: 400 }
      );
    }

    // --- price-integrity member (Insight OracleSafetyCheck v2) ---
    // Signed v2 here deliberately: this envelope is the pre-trade prototype
    // Michael Msebenzi specified around the v2 Insight receipt, and the
    // Headless market-state member carries the matching v2 layout contract.
    // The ACTIVE registry OracleSafetyCheck contract is v3 (served by the
    // /api/v1/safety/attestation/sample route); this envelope is a separate,
    // labelled diagnostic surface and is not the public sample the ZAP1
    // pilot target. Keeping it on v2 here keeps the two-receipt prototype
    // byte-stable for Headless's consumer.
    const backdateMs = demo === 'expired' ? Date.now() - EXPIRED_DEMO_BACKDATE_MS : Date.now();
    let insightReceipt = await signAttestationV2(buildSampleAttestationInput(backdateMs));
    if (insightReceipt && demo === 'tampered') {
      // Corrupt AFTER signing: forge the verdict (a BLOCK downgraded to PASS is
      // the attack this gate exists to stop). The signature still covers the
      // original verdict, so any verifier that recomputes the uid must reject.
      insightReceipt = {
        ...insightReceipt,
        data: { ...insightReceipt.data, verdict: 'PASS-FORGED' },
      };
    }
    const insightVerification = insightReceipt ? await verifyAttestationV2(insightReceipt) : null;

    // --- market-state member (Headless Oracle, verified locally) ---
    const market = await headlessSide(mic, demo);

    // --- conjunction ---
    const envelope = evaluatePreTradeEnvelope({
      priceIntegrity: priceIntegrityMember(insightReceipt, insightVerification),
      marketState: marketStateMember(market),
    });

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');
    const headlessBase = getHeadlessOracleBaseUrl();

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          envelope,
          demoMode: demo,
          prototype: true,
          priceIntegrity: {
            receipt: insightReceipt,
            verification: insightVerification,
            wellKnown: `${base}/.well-known/oracle-keys.json`,
            verify: `${base}/api/v1/safety/attestation/verify`,
          },
          marketState: {
            receipt: market.envelope,
            verification: market.result,
            keyRegistry: `${headlessBase}/.well-known/oracle-keys.json`,
            demoEndpoint: `${headlessBase}/v5/demo?mic=${mic}`,
          },
          note: DEMO_NOTES[demo],
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
