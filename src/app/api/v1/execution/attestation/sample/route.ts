/**
 * Fetchable signed SAMPLE Execution Receipt for integrators.
 *
 * Returns a freshly EIP-712 signed ExecutionReceipt over a fixed, clearly-labelled
 * SYNTHETIC swap so an integrator can drop it straight into their verifier
 * without first standing up a real settlement. The signature is genuine, but
 * it is made by the DEDICATED SAMPLE signer — a key the .well-known registry
 * publishes with role "sample" — and the settlement facts are demo data. The
 * receipt must never be treated as evidence of a real trade, and a verifier
 * that checks the registry can tell that from the signer alone (Headless H8:
 * the synthetic marker must be a property of the signature's key, not a label
 * beside it that strips away).
 *
 * GET /api/v1/execution/attestation/sample
 * GET /api/v1/execution/attestation/sample?schemaVersion=1   (also 2 | 3 | 4)
 *
 * The optional `schemaVersion` query signs the SAME synthetic facts against any
 * PUBLISHED layout, so a layout that has never been exercised by a sample is no
 * longer the one layout nobody can integrate against (VERITAS round-2 N1: the
 * published-but-unexercised v1 layout was the only thing keeping F0 open).
 *
 * If the dedicated sample signer key is unconfigured, returns 503 — the
 * production attester key never signs a sample (H8), and we never fabricate an
 * unsigned "sample".
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import {
  projectExecutionDataForSchemaVersion,
  signExecutionReceipt,
} from '@/lib/attestations/executionReceipt';
import { recordExecutionReceipt } from '@/lib/execution/executionReceiptAudit';

const PUBLIC_MIDDLEWARES = {
  logging: true,
  auth: false,
  rateLimit: { preset: 'lenient' as const },
  quota: true,
  cors: true,
};

// Deterministic demo inputs. Only the attester signature is "real"; the swap
// itself is synthetic so this never implies a trade happened.
const SAMPLE_PRE_TRADE_UID =
  '0x0000000000000000000000000000000000000000000000000000000000000001' as const;
const SAMPLE_REQUEST_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000002' as const;
const SAMPLE_TX_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000003' as const;

/**
 * Parse the optional ?schemaVersion= override.
 *
 * Absent or blank → undefined (sign the CURRENT layout). An unknown integer is
 * returned as-is: buildExecutionMessage falls back to the current layout for a
 * version it does not know, and the response reports what was actually signed,
 * so a caller can never mistake the layout.
 *
 * VERITAS round 3 F14: the default must never reach the signer as 0. The old
 * code coerced `get(...) ?? ''` through Number(), and Number('') is 0, which
 * passed Number.isInteger and put the plain /sample call on the unknown-value
 * fallback branch instead of the no-override branch. If that fallback is ever
 * tightened to reject unknown versions, the default sample would silently
 * break — this keeps "no version asked" distinguishable from "version 0".
 */
export function parseRequestedSchemaVersion(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : undefined;
}

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (request: NextRequest, context) => {
    // Optional layout override: ?schemaVersion=1..4 signs the same synthetic
    // facts against that PUBLISHED layout (N1). Unknown values fall back to the
    // current layout inside buildExecutionMessage — the response reports what
    // was actually signed, so a caller can never mistake the layout.
    const requestedVersion = parseRequestedSchemaVersion(
      request.nextUrl.searchParams.get('schemaVersion')
    );
    // Signed directly from synthetic facts — deliberately NOT routed through
    // issueExecutionReceipt, whose v3/v4 collector reads the settlement off
    // chain. A fake tx hash would fail RPC lookup (502): the sample's purpose
    // is to demo the signature + verify loop, so the settlement facts are
    // supplied, clearly labelled synthetic, and never claimed as on-chain
    // evidence. With no pre-trade attestations to present, the binding is
    // SELF_REPORTED and the verdict is honestly UNDETERMINED.
    //
    // H8: signed with the DEDICATED sample signer (registry role "sample"),
    // never the production attester. Unconfigured sample key → 503 below.
    const executedAt = Math.floor(Date.now() / 1000);
    const receipt = await signExecutionReceipt(
      {
        // parseRequestedSchemaVersion already returns undefined for absent,
        // blank or non-integer input (F14), so this is the signer input.
        schemaVersion: requestedVersion,
        preTradeUid: SAMPLE_PRE_TRADE_UID as `0x${string}`,
        requestHash: SAMPLE_REQUEST_HASH as `0x${string}`,
        sourceAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        destinationAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
        subjectChainId: 8453,
        settlementChainId: 8453,
        participantCount: 4,
        sourceGroupCount: 3,
        preTradeSignedAt: executedAt - 30,
        // Destination-per-source (WETH per USDC) to match the on-chain
        // executedPrice convention: ~1 / 2450.
        quotedPrice: 0.000408,
        executedPrice: 0.0004082,
        maxSlippageBps: 50,
        action: 'SWAP',
        quotedAmountUsd: 1000,
        executedAmountUsd: 1001.5,
        actualFeeUsd: 0.42,
        mevRiskScore: 0.05,
        measuredFields: ['quotedAmountUsd', 'executedAmountUsd', 'actualFeeUsd', 'mevRiskBps'],
        fillStatus: 'FULL',
        txHash: SAMPLE_TX_HASH as `0x${string}`,
        blockNumber: 30000000,
        executedAt,
        oracleDataAgeAtExecSeconds: 30,
        taker: '0x0000000000000000000000000000000000000004' as `0x${string}`,
      },
      { sample: true }
    );

    if (!receipt) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'SIGNING_UNAVAILABLE',
          'Dedicated sample signer key is not configured; no execution sample can be signed. The production attester key never signs samples (Headless H8).',
          { requestId: context.requestId }
        ),
        { status: 503 }
      );
    }

    try {
      await recordExecutionReceipt(receipt, {
        source: 'sample',
        subjectChainId: 8453,
        settlementChainId: 8453,
      });
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'AUDIT_PERSISTENCE_FAILED',
          'The sample receipt could not be durably stored; retry the request.',
          { requestId: context.requestId }
        ),
        { status: 503 }
      );
    }

    // The response carries the message projected onto the layout that was
    // actually signed (VERITAS round 3, closing F0/F8): `signExecutionReceipt`
    // emits the full current-layout message, but when ?schemaVersion=1..3 was
    // asked for, the signature covered THAT layout. Shipping the full message
    // beside a smaller type declaration would be self-inconsistent for any
    // independent verifier that rebuilds typed data from the payload alone, so
    // the data is projected to the signed layout's field set and spellings.
    // The audit below records the receipt before projection — its rows keep
    // the current-layout message either way.
    const projectedData = projectExecutionDataForSchemaVersion(receipt.data, receipt.schemaVersion);

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          isSample: true,
          attestation: { ...receipt, data: projectedData },
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/execution/attestation/verify`,
          note: 'SYNTHETIC sample: signed by the dedicated SAMPLE signer (see .well-known registry, role "sample"), so the synthetic nature is checkable from the signature itself. Settlement facts are demo data; never treat as evidence of a real trade.',
          signedSchemaVersion: receipt.schemaVersion,
          layoutsAvailable: '1,2,3,4 — pass ?schemaVersion=N to sample any published layout (N1)',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
