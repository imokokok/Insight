import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type AuditMeta,
  type PreTradeSafetyInput,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';

import {
  attachJourneyChecks,
  createJourney,
  nextActions,
  type ReceiptCreditState,
} from './journeyService';

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const BaseIntentSchema = z.object({
  sourceAsset: SafeSymbolSchema.describe('Asset symbol being sold, e.g. ETH'),
  destinationAsset: SafeSymbolSchema.describe('Asset symbol being bought, e.g. USDC'),
  subjectChainId: z.coerce.number().int().positive().describe('Chain where the swap is evaluated'),
  settlementChainId: z.coerce.number().int().positive().describe('Chain where the swap settles'),
  declaredNotionalUsd: z.coerce
    .number()
    .finite()
    .positive()
    .describe('Declared swap notional in USD'),
  targetProviders: z.array(SafeProviderSchema).min(1).optional(),
  venue: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_.:-]+$/)
    .optional()
    .describe('Optional caller claim such as uniswap-v3; not an independently verified venue fact'),
  router: z
    .string()
    .regex(EVM_ADDRESS, 'router must be a 20-byte EVM address')
    .optional()
    .describe('Optional caller-claimed EVM router; retained as unverified intent metadata'),
  workflowTag: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_.:-]+$/)
    .optional(),
  baselineVerdict: z.enum(['allow', 'alert', 'block', 'unknown']).optional(),
  baselineVersion: z.string().trim().min(1).max(100).optional(),
});

/**
 * A generic, same-chain swap intention.  We deliberately require both assets
 * but not a DEX router/pool/calldata: the latter belong to the optional
 * protocol-specific path, while the pair is the minimum needed for a
 * transaction-verifiable two-gate receipt.
 */
export const SwapIntentBodySchema = BaseIntentSchema.superRefine((value, context) => {
  if (value.sourceAsset === value.destinationAsset) {
    context.addIssue({
      code: 'custom',
      path: ['destinationAsset'],
      message: 'destinationAsset must differ from sourceAsset for a swap intent',
    });
  }
  if (value.subjectChainId !== value.settlementChainId) {
    context.addIssue({
      code: 'custom',
      path: ['settlementChainId'],
      message: 'Cross-chain Swap Intent is not supported by the current Execution Receipt verifier',
    });
  }
});

export type SwapIntentBody = z.infer<typeof SwapIntentBodySchema>;

export class SwapIntentAttestationUnavailableError extends Error {
  constructor() {
    super('Swap Intent requires two signed schema-v3 pre-trade gates; signing was unavailable.');
    this.name = 'SwapIntentAttestationUnavailableError';
  }
}

function inputForAsset(
  asset: string,
  destinationAsset: string,
  body: SwapIntentBody
): PreTradeSafetyInput {
  return {
    asset,
    destinationAsset,
    chainId: body.subjectChainId,
    action: 'swap',
    tradeAmountUsd: body.declaredNotionalUsd,
    targetProviders: body.targetProviders,
    // v3 is mandatory here: pair binding, quorum and independence must travel
    // with both signed gates before a later execution can be graded.
    schemaVersion: 3,
  };
}

function metaForJourney(body: SwapIntentBody, requestId: string, journeyId: string): AuditMeta {
  return {
    requestId,
    journeyId,
    workflowTag: body.workflowTag,
    baselineVerdict: body.baselineVerdict,
    baselineVersion: body.baselineVersion,
  };
}

export interface SwapIntentResult {
  journeyId: string;
  outcomeToken: string;
  receiptCreditState: ReceiptCreditState;
  sourceCheck: PreTradeSafetyResult;
  destinationCheck: PreTradeSafetyResult;
  next: Record<string, unknown>;
}

type SignedGateData = {
  requestHash: string;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  action: string;
  participantCount: number;
  sourceGroupCount: number;
  checkedAt: number;
};

/**
 * The receipt verifier re-derives these fields from the supplied originals.
 * Returning a template avoids forcing an agent to reinterpret signed V3 data;
 * it still must add the post-trade transaction hash and, if necessary, taker.
 */
function receiptRequestTemplate(
  journeyId: string,
  outcomeToken: string,
  source: PreTradeSafetyResult,
  destination: PreTradeSafetyResult
): Record<string, unknown> {
  const sourceAttestation = source.attestation!;
  const destinationAttestation = destination.attestation!;
  const data = sourceAttestation.data as SignedGateData;
  return {
    journeyId,
    outcomeToken,
    preTradeUid: sourceAttestation.uid,
    destinationPreTradeUid: destinationAttestation.uid,
    requestHash: data.requestHash,
    sourceAssetId: data.sourceAssetId,
    destinationAssetId: data.destinationAssetId,
    subjectChainId: data.subjectChainId,
    settlementChainId: data.subjectChainId,
    participantCount: data.participantCount,
    sourceGroupCount: data.sourceGroupCount,
    preTradeSignedAt: data.checkedAt,
    // This is intentionally ignored for a VERIFIED binding: the receipt
    // service derives the cross-rate from the two signature-verified gates.
    quotedPrice: 0,
    maxSlippageBps: 50,
    action: data.action,
    // The caller may later prove independence for its exact venue. Do not
    // infer it from a generic asset-pair gate or an unverified venue claim.
    quoteVenueIndependent: false,
    quoteBasis: 'ORACLE_CONSENSUS',
    quoteBlockNumber: 0,
    priceStateAgeAtExecSeconds: 0,
    preTradeAttestations: {
      source: sourceAttestation,
      destination: destinationAttestation,
    },
    requiredRuntimeFields: ['txHash'],
    optionalRuntimeFields: ['taker', 'quotedAmountUsd', 'executedAmountUsd', 'actualFeeUsd'],
  };
}

/** Issue and durably bind the two independent safety checks required for a swap journey. */
export async function createSwapIntent(
  body: SwapIntentBody,
  options: { requestId: string; receiptCreditState: ReceiptCreditState; apiKeyId?: string }
): Promise<SwapIntentResult> {
  const created = await createJourney({
    requestId: options.requestId,
    kind: 'swap_intent',
    source: 'rest',
    action: 'swap',
    sourceAsset: body.sourceAsset,
    destinationAsset: body.destinationAsset,
    subjectChainId: body.subjectChainId,
    settlementChainId: body.settlementChainId,
    declaredNotionalUsd: body.declaredNotionalUsd,
    venueClaim: body.venue,
    routerClaim: body.router,
    receiptCreditState: options.receiptCreditState,
  });

  const meta = {
    ...metaForJourney(body, options.requestId, created.journeyId),
    apiKeyId: options.apiKeyId,
  };
  const [sourceCheck, destinationCheck] = await Promise.all([
    preTradeSafetyCheck(inputForAsset(body.sourceAsset, body.destinationAsset, body), meta),
    preTradeSafetyCheck(inputForAsset(body.destinationAsset, body.sourceAsset, body), meta),
  ]);

  if (!sourceCheck.attestation || !destinationCheck.attestation) {
    throw new SwapIntentAttestationUnavailableError();
  }

  await attachJourneyChecks(created.journeyId, {
    source: sourceCheck,
    destination: destinationCheck,
  });

  return {
    journeyId: created.journeyId,
    outcomeToken: created.outcomeToken,
    receiptCreditState: created.receiptCreditState,
    sourceCheck,
    destinationCheck,
    next: nextActions({
      kind: 'swap_intent',
      journeyId: created.journeyId,
      outcomeToken: created.outcomeToken,
      verdict:
        sourceCheck.verdict === 'BLOCK' || destinationCheck.verdict === 'BLOCK'
          ? 'BLOCK'
          : sourceCheck.verdict === 'DANGER' || destinationCheck.verdict === 'DANGER'
            ? 'DANGER'
            : sourceCheck.verdict === 'CAUTION' || destinationCheck.verdict === 'CAUTION'
              ? 'CAUTION'
              : 'PASS',
      receiptCreditState: created.receiptCreditState,
      receiptRequestTemplate: receiptRequestTemplate(
        created.journeyId,
        created.outcomeToken,
        sourceCheck,
        destinationCheck
      ),
    }),
  };
}
