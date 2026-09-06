import { z } from 'zod';

import { SafeSymbolSchema, SafeChainSchema } from '@/lib/security/validation';

export const OracleWatchQuerySchema = z.object({
  symbol: SafeSymbolSchema.describe('Asset symbol, e.g. ETH, BTC'),
  chain: SafeChainSchema.optional().describe('Optional blockchain, e.g. ethereum, arbitrum, base'),
  attest: z.boolean().optional().describe('Include a signed EIP-712 attestation (default: true)'),
});
