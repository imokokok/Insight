import { z } from 'zod';

import { SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';

export const PreTradeQuerySchema = z.object({
  asset: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC, USDC'),
  chainId: z.coerce.number().int().describe('Chain ID, e.g. 1=Ethereum, 0=chain-agnostic'),
  action: z
    .enum(['swap', 'borrow', 'lend', 'liquidate', 'repay'])
    .describe('Type of DeFi operation'),
  tradeAmountUsd: z.coerce.number().positive().describe('Trade size in USD'),
  targetProviders: z
    .string()
    .transform((value) => value.split(',').map((provider) => provider.trim()))
    .pipe(z.array(SafeProviderSchema).min(1))
    .optional()
    .describe('Comma-separated list of oracle providers to restrict the check to'),
  protocolId: z
    .string()
    .optional()
    .describe('Optional lending protocol id to evaluate against (e.g. aave-v3-ethereum)'),
  schemaVersion: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
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
});
