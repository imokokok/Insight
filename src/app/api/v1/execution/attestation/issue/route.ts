/**
 * Issue an Execution Receipt for a settled transaction.
 *
 * The caller (an agent or its operator) presents the pre-trade fields it was
 * certified against plus the settlement transaction hash. Insight collects the
 * on-chain execution facts, signs a receipt that pairs to the pre-trade via
 * `preTradeUid` + `requestHash`, and returns it. The pairing is cryptographic,
 * not relational: the caller already holds its pre-trade receipt, so no database
 * join is needed to bind the two.
 *
 * POST /api/v1/execution/attestation/issue
 *
 * Signing is additive: if no attester key is configured, the service returns a
 * clean 503 rather than a fabricated unsigned receipt. The collection failure
 * paths (unknown tx, unsupported chain, RPC error) return explicit 4xx/502 with
 * the code the caller can branch on.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { recordExecutionReceiptAsync } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';

const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const IssueBodySchema = z.object({
  preTradeUid: z
    .string()
    .regex(HEX32, 'preTradeUid must be a 0x-prefixed 32-byte hex')
    .describe('UID of the paired pre-trade attestation'),
  requestHash: z
    .string()
    .regex(HEX32, 'requestHash must be a 0x-prefixed 32-byte hex')
    .describe('Canonical request commitment from the pre-trade attestation'),
  sourceAssetId: z.string().min(1).describe('CAIP-19 id of the asset sold'),
  destinationAssetId: z.string().min(1).describe('CAIP-19 id of the asset bought'),
  subjectChainId: z.number().int().describe('Chain id the pre-trade was scoped to'),
  settlementChainId: z.number().int().describe('Chain id the transaction settled on'),
  participantCount: z.number().int().min(0).describe('Oracle providers the agent gated on'),
  sourceGroupCount: z
    .number()
    .int()
    .min(0)
    .describe('Distinct non-derived operator groups the agent gated on'),
  preTradeSignedAt: z.number().int().describe('Unix seconds the pre-trade was signed'),
  quotedPrice: z
    .number()
    .describe('Target price, same convention as executedPrice (e.g. destination per source)'),
  maxSlippageBps: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Signed slippage bound; defaults to 50'),
  action: z.string().optional().describe('Action label, e.g. SWAP'),
  quotedAmountUsd: z.number().optional().describe('Informational notional the agent intended'),
  executedAmountUsd: z.number().optional().describe('Informational notional actually filled'),
  actualFeeUsd: z.number().optional().describe('Informational fee paid'),
  mevRiskScore: z.number().optional().describe('Advisory 0..1 MEV-exposure estimate'),
  txHash: z
    .string()
    .regex(HEX32, 'txHash must be a 0x-prefixed 32-byte hex')
    .describe('Settlement transaction hash'),
  taker: z
    .string()
    .regex(HEX_ADDRESS)
    .optional()
    .describe('Address whose balances define the trade; defaults to tx sender'),
  /** The signed pre-trade gates, when the caller can present them. Supplying
   *  BOTH upgrades the receipt to a VERIFIED binding: every binding field above
   *  is then re-derived from the verified payloads instead of trusted from the
   *  request, and the receipt becomes eligible for a FAITHFUL verdict. Omitting
   *  them still returns a receipt, marked SELF_REPORTED and never FAITHFUL. */
  preTradeAttestations: z
    .object({
      source: z.record(z.string(), z.unknown()),
      destination: z.record(z.string(), z.unknown()),
    })
    .optional()
    .describe('Signed pre-trade attestations for the source and destination assets'),
});

type IssueBody = z.infer<typeof IssueBodySchema>;

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  unknown,
  IssueBody,
  Record<string, unknown>,
  Record<string, string>
>(
  async (_request: NextRequest, context) => {
    const body = context.validated!.body!;
    const startedAt = Date.now();

    const result = await issueExecutionReceipt({
      preTradeUid: body.preTradeUid as `0x${string}`,
      requestHash: body.requestHash as `0x${string}`,
      sourceAssetId: body.sourceAssetId,
      destinationAssetId: body.destinationAssetId,
      subjectChainId: body.subjectChainId,
      settlementChainId: body.settlementChainId,
      participantCount: body.participantCount,
      sourceGroupCount: body.sourceGroupCount,
      preTradeSignedAt: body.preTradeSignedAt,
      quotedPrice: body.quotedPrice,
      maxSlippageBps: body.maxSlippageBps,
      action: body.action,
      quotedAmountUsd: body.quotedAmountUsd,
      executedAmountUsd: body.executedAmountUsd,
      actualFeeUsd: body.actualFeeUsd,
      mevRiskScore: body.mevRiskScore,
      txHash: body.txHash as `0x${string}`,
      taker: body.taker as `0x${string}` | undefined,
      preTradeAttestations: body.preTradeAttestations
        ? {
            source: body.preTradeAttestations.source as never,
            destination: body.preTradeAttestations.destination as never,
          }
        : null,
    });

    if (!result.ok) {
      const status =
        result.code === 'UNSUPPORTED_CHAIN'
          ? 400
          : result.code === 'NOT_FOUND'
            ? 404
            : result.code === 'SIGNING_UNAVAILABLE'
              ? 503
              : result.code === 'PRE_TRADE_VERIFICATION_FAILED'
                ? 400
                : 502;
      return NextResponse.json(
        ApiResponseBuilder.error(result.code, result.message, { requestId: context.requestId }),
        { status }
      );
    }

    // Fire-and-forget audit. Never blocks the response; a dropped row is a
    // reporting gap, not a correctness gap.
    recordExecutionReceiptAsync(result.receipt, {
      source: 'rest',
      apiKeyId: context.auth?.apiKey?.keyId ?? null,
      latencyMs: Date.now() - startedAt,
      subjectChainId: body.subjectChainId,
      settlementChainId: body.settlementChainId,
    });

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.oracleinsight.xyz'
        : 'http://localhost:3000');

    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          attestation: result.receipt,
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/execution/attestation/verify`,
          executionStatus: result.receipt.data.executionStatus,
          bindingMode: result.receipt.data.bindingMode,
          binding: result.binding,
          note: `Freshly signed ExecutionReceipt v${result.receipt.schemaVersion}. executionStatus is Insight's verdict on whether the fill matched the certified price within the signed bound — not a claim the price was correct.`,
          bindingNote:
            result.receipt.data.bindingMode === 'VERIFIED'
              ? 'Binding VERIFIED: the pre-trade attestations were signature-checked and every binding field was taken from the verified payload.'
              : "Binding SELF_REPORTED: no pre-trade attestation was presented, so the quoted price and oracle basis are the caller's own assertion. Such a receipt can never be FAITHFUL — supply preTradeAttestations to make it gradeable.",
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: IssueBodySchema },
  }
);
