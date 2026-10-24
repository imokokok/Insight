import { NextResponse, type NextRequest } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getMppConfig } from '@/lib/api/mpp/config';
import {
  handleMppPaidPreTradeRequest,
  hasMppCredential,
  issueMppPreTradeQuote,
} from '@/lib/api/mpp/preTrade';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getX402Config } from '@/lib/api/x402/config';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { enqueueReputationAnchor } from '@/lib/erc8004/reputationAnchor';
import {
  attachGenericJourneyCheck,
  createJourney,
  nextActions,
  recordJourneyPayment,
} from '@/lib/tradeJourney/journeyService';

import { PreTradeQuerySchema } from './querySchema';

import type { z } from 'zod';

/**
 * Route segment config: the paid pre-trade pipeline (provider feeds + risk
 * model + GoPlus advisory + attestation + x402 settle) has been observed at
 * ~45s when an upstream provider fetch degrades, which exceeded the 30s
 * platform default and turned every paid call into a 504
 * FUNCTION_INVOCATION_TIMEOUT (2026-10-18 WAK window, INT-02). 60s matches
 * the /api/cron budget and keeps headroom over the observed worst case
 * without allowing an unbounded hang.
 */
export const maxDuration = 60;

export const OPTIONS = createOptionsHandler();

interface PreTradeCheckParams {
  query: z.infer<typeof PreTradeQuerySchema>;
  /** API-key path only; the keyless x402 tier has no key to meter. */
  apiKeyId?: string;
  requestId: string;
  /** Paid callers receive an opaque lifecycle handle; API-key responses stay unchanged. */
  trackJourney?: boolean;
  onJourneyIssued?: (journeyId: string) => void;
}

/** Shared business core for both the API-key path and the x402 paid tier. */
async function executePreTradeCheck(params: PreTradeCheckParams): Promise<NextResponse> {
  const { query, apiKeyId, requestId, trackJourney = false, onJourneyIssued } = params;

  const journey = trackJourney
    ? await createJourney({
        requestId,
        kind: 'pre_trade',
        source: 'rest',
        action: query.action,
        sourceAsset: query.asset,
        destinationAsset: query.destinationAsset,
        subjectChainId: query.chainId,
        declaredNotionalUsd: query.tradeAmountUsd,
        receiptCreditState: 'not_available',
      })
    : null;

  // preTradeSafetyCheck swallows UnsupportedSymbolError internally and returns
  // a BLOCK verdict, so any throw here is genuinely unexpected — let the
  // createApiHandler error middleware translate it to a 500.
  const result = await preTradeSafetyCheck(
    {
      asset: query.asset,
      chainId: query.chainId,
      action: query.action,
      tradeAmountUsd: query.tradeAmountUsd,
      targetProviders: query.targetProviders,
      protocolId: query.protocolId,
      schemaVersion: query.schemaVersion,
      destinationAsset: query.destinationAsset,
      tokenAddress: query.tokenAddress,
      debugTokenSecurity: query.debugTokenSec === '1',
      ...(query.decisionInputCheck === '1'
        ? {
            decisionInput: {
              decisionPriceUsd: query.decisionPriceUsd!,
              quotePriceUsd: query.quotePriceUsd!,
              quoteObservedAt: query.quoteObservedAt!,
              maxReferenceDeviationBps: query.maxReferenceDeviationBps!,
              maxSlippageBps: query.maxSlippageBps!,
              maxQuoteAgeSeconds: query.maxQuoteAgeSeconds!,
              ...(query.quoteProvenance ? { quoteProvenance: query.quoteProvenance } : {}),
              ...(query.requireQuoteProvenance === true ? { requireQuoteProvenance: true } : {}),
              ...(query.reviewedUniswapV3AmountIn
                ? {
                    reviewedUniswapV3: {
                      amountIn: query.reviewedUniswapV3AmountIn,
                      maxQuoteDeviationBps: query.reviewedUniswapV3MaxQuoteDeviationBps!,
                      maxTwapDeviationBps: query.reviewedUniswapV3MaxTwapDeviationBps!,
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
    {
      apiKeyId,
      requestId,
      journeyId: journey?.journeyId,
      workflowTag: query.workflowTag,
      baselineVerdict: query.baselineVerdict,
      baselineVersion: query.baselineVersion,
    }
  );

  if (journey) {
    await attachGenericJourneyCheck(journey.journeyId, result);
    onJourneyIssued?.(journey.journeyId);
  }

  const body = journey
    ? {
        ...result,
        journeyId: journey.journeyId,
        outcomeToken: journey.outcomeToken,
        next: nextActions({
          kind: 'pre_trade',
          journeyId: journey.journeyId,
          outcomeToken: journey.outcomeToken,
          verdict: result.verdict,
          receiptCreditState: journey.receiptCreditState,
        }),
      }
    : result;

  const response: NextResponse = new Response(
    JSON.stringify(
      ApiResponseBuilder.success(body, {
        requestId,
        meta: { verdict: result.verdict },
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
}

const legacyGet = createApiHandler(
  async (_request, context) => {
    return executePreTradeCheck({
      query: context.validated!.query as z.infer<typeof PreTradeQuerySchema>,
      apiKeyId: context.auth?.apiKey?.keyId,
      requestId: context.requestId,
    });
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { query: PreTradeQuerySchema },
  }
);

/**
 * Payment dispatch on the same URL:
 * - `Authorization: Payment ...` → optional MPP rail (validate → check → settle).
 * - `PAYMENT-SIGNATURE` header → keyless x402 paid tier (verify → check → settle).
 * - Any auth header → legacy API-key handler, unchanged behaviour.
 * - Neither (paid tier armed only) → x402 quote, with an MPP challenge when
 *   MPP is enabled. When the paid tier is disarmed, anonymous requests fall
 *   through to the legacy handler and get today's 401.
 */
export const GET = (
  request: NextRequest,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> => {
  const cfg = getX402Config();
  const mppCfg = getMppConfig(cfg);
  let x402JourneyId: string | null = null;

  if (cfg.enabled) {
    if (mppCfg.enabled && hasMppCredential(request)) {
      return handleMppPaidPreTradeRequest(request, cfg, mppCfg.secretKey!, async (requestId) => {
        const parsed = PreTradeQuerySchema.safeParse(
          Object.fromEntries(request.nextUrl.searchParams.entries())
        );
        if (!parsed.success) {
          return NextResponse.json(
            ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid pre-trade query parameters', {
              details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
            }),
            { status: 400 }
          );
        }
        return executePreTradeCheck({
          query: parsed.data,
          requestId,
          trackJourney: true,
        });
      });
    }

    if (isPaidRequest(request)) {
      return handlePaidPreTradeRequest(
        request,
        cfg,
        async (requestId) => {
          const parsed = PreTradeQuerySchema.safeParse(
            Object.fromEntries(request.nextUrl.searchParams.entries())
          );
          if (!parsed.success) {
            return NextResponse.json(
              ApiResponseBuilder.error('VALIDATION_ERROR', 'Invalid pre-trade query parameters', {
                details: { issues: parsed.error.issues.map((issue) => issue.path.join('.')) },
              }),
              { status: 400 }
            );
          }
          return executePreTradeCheck({
            query: parsed.data,
            requestId,
            trackJourney: true,
            onJourneyIssued: (journeyId) => {
              x402JourneyId = journeyId;
            },
          });
        },
        {
          // Opt-in ERC-8004 reputation anchoring (M2): enqueue after settlement,
          // off the response path. Validation already enforces the pairing.
          onSettled: async (settled) => {
            if (x402JourneyId) {
              await recordJourneyPayment({
                journeyId: x402JourneyId,
                requestId: settled.requestId,
                payer: settled.payer,
                network: settled.network,
                txHash: settled.txHash,
              });
            }
            const params = request.nextUrl.searchParams;
            if (params.get('reputationOptIn') !== '1') return;
            const agentId = Number.parseInt(params.get('reputationAgentId') ?? '', 10);
            if (!Number.isInteger(agentId) || agentId <= 0) return;
            await enqueueReputationAnchor({
              requestId: settled.requestId,
              payer: settled.payer,
              agentId,
              verdict: settled.verdict,
              attestationUid: settled.attestationUid,
              paymentNetwork: settled.network,
              paymentTxHash: settled.txHash,
              amountUsdc: settled.amountUsdc,
            });
          },
        }
      );
    }

    if (!hasAuthCredentials(request)) {
      const issueX402Quote = () =>
        handlePaidPreTradeRequest(request, cfg, async (requestId) => {
          const response = await legacyGet(request, routeContext);
          response.headers.set('X-Request-Id', requestId);
          return response;
        });

      if (mppCfg.enabled) {
        return issueMppPreTradeQuote(request, cfg, mppCfg.secretKey!, issueX402Quote);
      }

      return issueX402Quote();
    }
  }

  return legacyGet(request, routeContext);
};
