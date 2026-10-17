import { z } from 'zod';

import { DecisionInputQuoteProvenanceSchema } from '@/lib/decisionInputTrust/quoteProvenance';
import { DecisionInputQuoteTimestampSchema } from '@/lib/decisionInputTrust/validation';
import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';

const DecisionInputQuoteProvenanceQuerySchema = z
  .string()
  .trim()
  .min(2)
  .max(4096)
  .transform((value, context) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      context.addIssue({ code: 'custom', message: 'quoteProvenance must be valid JSON' });
      return z.NEVER;
    }
    const validated = DecisionInputQuoteProvenanceSchema.safeParse(parsed);
    if (!validated.success) {
      context.addIssue({
        code: 'custom',
        message: 'quoteProvenance must be a valid hash-only quote provenance envelope',
      });
      return z.NEVER;
    }
    return validated.data;
  });

export const PreTradeQuerySchema = z
  .object({
    asset: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC, USDC'),
    chainId: z.coerce.number().int().describe('Chain ID, e.g. 1=Ethereum, 0=chain-agnostic'),
    action: z
      .enum(['swap', 'borrow', 'lend', 'liquidate', 'repay'])
      .describe('Type of DeFi operation'),
    tradeAmountUsd: z.coerce.number().finite().positive().describe('Trade size in USD'),
    targetProviders: z
      .string()
      .transform((value) => value.split(',').map((provider) => provider.trim()))
      .pipe(z.array(SafeProviderSchema).min(1))
      .optional()
      .describe('Comma-separated list of oracle providers to restrict the check to'),
    workflowTag: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_.:-]+$/)
      .optional(),
    baselineVerdict: z.enum(['allow', 'alert', 'block', 'unknown']).optional(),
    baselineVersion: z.string().trim().min(1).max(100).optional(),
    protocolId: z
      .string()
      .optional()
      .describe('Optional lending protocol id to evaluate against (e.g. aave-v3-ethereum)'),
    schemaVersion: z.coerce
      .number()
      .pipe(z.union([z.literal(1), z.literal(2), z.literal(3)]))
      .optional()
      .describe(
        'Attestation schema version: 1 (default, 11-field), 2 (26-field, CAIP-19 + quorum gate), ' +
          'or 3 (27-field: v2 + the signed independence threshold, so the gate is self-verifying)'
      ),
    destinationAsset: z
      .string()
      .optional()
      .describe(
        'Optional destination asset symbol (v2 binds it as destinationAssetId; not evaluated in v2.0)'
      ),
    tokenAddress: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, 'tokenAddress must be a 20-byte EVM contract address')
      .optional()
      .describe(
        'Optional token contract address whose third-party security scan is captured and signed as ' +
          'decision-input evidence (contextAttestation + tokenSecurity advisory view). When omitted, ' +
          'a built-in symbol map (Ethereum mainnet ETH/USDC/WBTC) is used. Never affects the verdict.'
      ),
    debugTokenSec: z
      .enum(['0', '1'])
      .optional()
      .describe(
        'Opt-in diagnostic: when "1", the response carries tokenSecurityDebug with the advisory ' +
          "lane's terminal outcome. Adds no external calls and never affects the verdict."
      ),
    decisionInputCheck: z
      .enum(['0', '1'])
      .optional()
      .describe(
        'Opt in to a separate input-sufficiency assessment using the supplied decision price, venue quote, timestamps, and explicit tolerances.'
      ),
    decisionPriceUsd: z.coerce.number().finite().positive().optional(),
    quotePriceUsd: z.coerce.number().finite().positive().optional(),
    quoteObservedAt: z.string().trim().pipe(DecisionInputQuoteTimestampSchema).optional(),
    maxReferenceDeviationBps: z.coerce.number().int().min(0).max(10_000).optional(),
    maxSlippageBps: z.coerce.number().int().min(0).max(10_000).optional(),
    maxQuoteAgeSeconds: z.coerce.number().int().min(1).max(300).optional(),
    quoteProvenance: DecisionInputQuoteProvenanceQuerySchema.optional(),
    requireQuoteProvenance: z
      .enum(['0', '1'])
      .transform((value) => value === '1')
      .optional(),
    reputationOptIn: z
      .enum(['0', '1'])
      .optional()
      .describe(
        'Opt in to anchoring this paid check as ERC-8004 reputation feedback on BNB Chain ' +
          '(x402 payments only). Anchors check completion and verdict tag only — never trade details.'
      ),
    reputationAgentId: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Caller's ERC-8004 agentId on the BNB Identity Registry; required when reputationOptIn=1. " +
          'Ownership (ownerOf(agentId) == payer) is verified before anchoring.'
      ),
  })
  .superRefine((value, context) => {
    const fields = [
      'decisionPriceUsd',
      'quotePriceUsd',
      'quoteObservedAt',
      'maxReferenceDeviationBps',
      'maxSlippageBps',
      'maxQuoteAgeSeconds',
    ] as const;
    const provided = [
      ...fields.filter((field) => value[field] !== undefined),
      ...(value.quoteProvenance !== undefined ? ['quoteProvenance'] : []),
      ...(value.requireQuoteProvenance !== undefined ? ['requireQuoteProvenance'] : []),
    ];

    if (value.decisionInputCheck === '1') {
      for (const field of fields) {
        if (value[field] === undefined) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when decisionInputCheck=1`,
          });
        }
      }
    } else if (provided.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['decisionInputCheck'],
        message: 'Set decisionInputCheck=1 to request the decision-input assessment',
      });
    }

    if (value.reputationOptIn === '1' && value.reputationAgentId === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['reputationAgentId'],
        message: 'reputationAgentId is required when reputationOptIn=1',
      });
    }
  });
