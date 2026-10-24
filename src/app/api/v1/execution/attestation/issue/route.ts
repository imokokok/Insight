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

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { recordExecutionReceipt } from '@/lib/execution/executionReceiptAudit';
import { issueExecutionReceipt } from '@/lib/execution/executionReceiptService';
import {
  ExecutionReceiptIssueBodySchema,
  type ExecutionReceiptIssueBody,
} from '@/lib/execution/issueSchema';

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler<
  unknown,
  ExecutionReceiptIssueBody,
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
      quoteVenueIndependent: body.quoteVenueIndependent,
      quoteBasis: body.quoteBasis,
      quoteBlockNumber: body.quoteBlockNumber,
      priceStateAgeAtExecSeconds: body.priceStateAgeAtExecSeconds,
      claimRole: body.claimRole,
      destinationPreTradeUid: (body.destinationPreTradeUid ?? null) as `0x${string}` | null,
      txHash: body.txHash as `0x${string}`,
      selectedSwapLogIndex: body.selectedSwapLogIndex,
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
                : result.code === 'UNSUPPORTED_CROSS_CHAIN' ||
                    result.code === 'UNCOMMITTED_EXECUTION_POLICY' ||
                    result.code === 'INVALID_QUOTE_BASIS' ||
                    result.code === 'SELECTED_EVENT_INVALID'
                  ? 400
                  : 502;
      return NextResponse.json(
        ApiResponseBuilder.error(result.code, result.message, { requestId: context.requestId }),
        { status }
      );
    }

    try {
      await recordExecutionReceipt(result.receipt, {
        source: 'rest',
        apiKeyId: context.auth?.apiKey?.keyId ?? null,
        latencyMs: Date.now() - startedAt,
        subjectChainId: body.subjectChainId,
        settlementChainId: body.settlementChainId,
      });
    } catch {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'AUDIT_PERSISTENCE_FAILED',
          'The receipt was signed but could not be durably stored; retry with the same request.',
          { requestId: context.requestId }
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
          attestation: result.receipt,
          wellKnown: `${base}/.well-known/oracle-keys.json`,
          verify: `${base}/api/v1/execution/attestation/verify`,
          executionStatus:
            result.receipt.data.priceExecutionStatus ?? result.receipt.data.executionStatus,
          bindingMode: result.receipt.data.bindingMode,
          binding: result.binding,
          selectedEvent: result.facts.selectedEvent ?? null,
          note: `Freshly signed ExecutionReceipt v${result.receipt.schemaVersion}. Its verdict (signed as ${
            result.receipt.schemaVersion >= 3 ? 'priceExecutionStatus' : 'executionStatus'
          }) is Insight's statement on whether the fill matched the certified price within the signed band — never a claim the price was correct.`,
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
    validation: { body: ExecutionReceiptIssueBodySchema },
  }
);
