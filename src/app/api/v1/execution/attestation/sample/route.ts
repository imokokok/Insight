/**
 * Fetchable signed SAMPLE Execution Receipt for integrators.
 *
 * Returns a freshly EIP-712 signed ExecutionReceipt over a fixed, clearly-labelled
 * SYNTHETIC swap so an integrator can drop it straight into their verifier
 * without first standing up a real settlement. The signature is genuine (verifies
 * against the live attester), but the settlement facts are demo data — the
 * receipt is marked `isSample: true` and must never be treated as evidence of a
 * real trade.
 *
 * GET /api/v1/execution/attestation/sample
 *
 * If the platform attester key is unconfigured, returns 503 — no key to sign
 * with, and we never fabricate an unsigned "sample".
 */

import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { recordExecutionReceiptAsync } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';

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
const SAMPLE_SIGNED_AT = 1767000000;

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler<
  unknown,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const result = await issueExecutionReceipt({
      preTradeUid: SAMPLE_PRE_TRADE_UID as `0x${string}`,
      requestHash: SAMPLE_REQUEST_HASH as `0x${string}`,
      sourceAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      destinationAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
      subjectChainId: 8453,
      settlementChainId: 8453,
      participantCount: 4,
      sourceGroupCount: 3,
      preTradeSignedAt: SAMPLE_SIGNED_AT,
      // Destination-per-source (WETH per USDC) to match the on-chain
      // executedPrice convention: ~1 / 2450.
      quotedPrice: 0.000408,
      maxSlippageBps: 50,
      action: 'SWAP',
      quotedAmountUsd: 1000,
      executedAmountUsd: 1001.5,
      actualFeeUsd: 0.42,
      mevRiskScore: 0.05,
      txHash: SAMPLE_TX_HASH as `0x${string}`,
      taker: '0x0000000000000000000000000000000000000004' as `0x${string}`,
    });

    if (!result.ok) {
      const status = result.code === 'SIGNING_UNAVAILABLE' ? 503 : 502;
      return NextResponse.json(
        ApiResponseBuilder.error(result.code, result.message, { requestId: context.requestId }),
        { status }
      );
    }

    recordExecutionReceiptAsync(result.receipt, {
      source: 'sample',
      subjectChainId: 8453,
      settlementChainId: 8453,
    });

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          isSample: true,
          attestation: result.receipt,
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/execution/attestation/verify`,
          note: 'SYNTHETIC sample: signature is genuine (verify it), but the settlement facts are demo data. Do not treat as evidence of a real trade.',
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: PUBLIC_MIDDLEWARES,
  }
);
