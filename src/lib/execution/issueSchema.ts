import { z } from 'zod';

const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** Shared runtime contract for API-key and included-credit receipt issuance. */
export const ExecutionReceiptIssueBodySchema = z.object({
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
  subjectChainId: z.number().int().positive().describe('Chain id the pre-trade was scoped to'),
  settlementChainId: z.number().int().positive().describe('Chain id the transaction settled on'),
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
    .literal(50)
    .optional()
    .describe('Pre-committed platform bound; currently fixed at 50 bps'),
  action: z.string().optional().describe('Action label, e.g. SWAP'),
  quotedAmountUsd: z.number().optional().describe('Informational notional the agent intended'),
  executedAmountUsd: z.number().optional().describe('Informational notional actually filled'),
  actualFeeUsd: z.number().optional().describe('Informational fee paid'),
  mevRiskScore: z.number().optional().describe('Advisory 0..1 MEV-exposure estimate'),
  txHash: z
    .string()
    .regex(HEX32, 'txHash must be a 0x-prefixed 32-byte hex')
    .describe('Settlement transaction hash'),
  selectedSwapLogIndex: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('VERITAS pinned WETH/USDC rule: exact Uniswap V3 Swap logIndex in txHash'),
  taker: z
    .string()
    .regex(HEX_ADDRESS)
    .optional()
    .describe('Address whose balances define the trade; defaults to tx sender'),
  destinationPreTradeUid: z
    .string()
    .regex(HEX32)
    .optional()
    .describe('v3: uid of the destination pre-trade gate the quote was built from'),
  quoteVenueIndependent: z
    .boolean()
    .optional()
    .describe('v3: quote is independent of the execution venue'),
  quoteBasis: z
    .enum(['PREV_BLOCK_CLOSE', 'PRE_SWAP_IN_BLOCK', 'ORACLE_CONSENSUS', 'UNSPECIFIED'])
    .optional()
    .describe('v3: baseline the quoted price was read from'),
  quoteBlockNumber: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('v3: block the quoted price was read from (0 when not applicable)'),
  priceStateAgeAtExecSeconds: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('v3: age of the price state the quote came from, seconds'),
  claimRole: z
    .enum(['FIRST_PARTY_EXECUTION', 'THIRD_PARTY_OBSERVATION'])
    .optional()
    .describe('v3: whose execution this receipt describes'),
  preTradeAttestations: z
    .object({
      source: z.record(z.string(), z.unknown()),
      destination: z.record(z.string(), z.unknown()),
    })
    .optional()
    .describe('Signed pre-trade attestations for the source and destination assets'),
});

export type ExecutionReceiptIssueBody = z.infer<typeof ExecutionReceiptIssueBodySchema>;
