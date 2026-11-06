import { getRobinhoodInstrumentAdmission } from '@/lib/rwa/instrumentRegistry';
import { getRobinhoodRwaContext } from '@/lib/rwa/robinhoodClient';
import { RobinhoodRwaContextQuerySchema } from '@/lib/rwa/robinhoodSchema';

import type { McpToolDefinition } from './types';

export const robinhoodRwaContextTool: McpToolDefinition<typeof RobinhoodRwaContextQuerySchema> = {
  name: 'get_robinhood_rwa_context',
  description:
    'Get Robinhood Stock Token issuer context: official asset identity, trading capabilities, halt state, corporate actions, multiplier-normalized reference price, and optional on-chain ERC-8056 verification. First-party evidence only; it is not an independent oracle and never counts toward oracle quorum or authorizes a trade.',
  parameters: RobinhoodRwaContextQuerySchema,
  handler: async ({ symbol, verifyOnchain }) =>
    JSON.stringify(await getRobinhoodRwaContext(symbol, { verifyOnchain })),
};

export const robinhoodRwaInstrumentTool: McpToolDefinition<typeof RobinhoodRwaContextQuerySchema> =
  {
    name: 'get_robinhood_rwa_instrument',
    description:
      'Resolve a Robinhood Stock Token to Insight committed master data, using share-class FIGI for the underlying and ISO 10383 MIC for its primary market, then cross-check issuer UID, ISIN and contract deployment. Reference/admission evidence only; it never counts toward price quorum or authorizes a trade.',
    parameters: RobinhoodRwaContextQuerySchema,
    handler: async ({ symbol, verifyOnchain }) =>
      JSON.stringify(await getRobinhoodInstrumentAdmission(symbol, { verifyOnchain })),
  };
