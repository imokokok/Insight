import { diagnoseRwa } from '@/lib/rwa/diagnostic';
import { getRobinhoodRwaContext } from '@/lib/rwa/robinhoodClient';
import { RobinhoodRwaContextQuerySchema } from '@/lib/rwa/robinhoodSchema';
import { RwaDiagnosticSchema } from '@/lib/rwa/schema';

import type { McpToolDefinition } from './types';

export const rwaAssessmentTool: McpToolDefinition<typeof RwaDiagnosticSchema> = {
  name: 'assess_rwa_evidence',
  description:
    'Evaluate supplied RWA/tokenized-stock evidence against an explicit policy. Unsigned diagnostic only: caller-supplied facts are not authenticated, and ALLOW does not authorize a trade. Existing pre-trade and authorization checks remain required.',
  parameters: RwaDiagnosticSchema,
  handler: ({ input, policy }) => JSON.stringify(diagnoseRwa(input, policy)),
};

export const robinhoodRwaContextTool: McpToolDefinition<typeof RobinhoodRwaContextQuerySchema> = {
  name: 'get_robinhood_rwa_context',
  description:
    'Get Robinhood Stock Token issuer context: official asset identity, trading capabilities, halt state, corporate actions, multiplier-normalized reference price, and optional on-chain ERC-8056 verification. First-party evidence only; it is not an independent oracle and never counts toward oracle quorum or authorizes a trade.',
  parameters: RobinhoodRwaContextQuerySchema,
  handler: async ({ symbol, verifyOnchain }) =>
    JSON.stringify(await getRobinhoodRwaContext(symbol, { verifyOnchain })),
};
