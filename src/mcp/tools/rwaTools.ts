import { diagnoseRwa } from '@/lib/rwa/diagnostic';
import { RwaDiagnosticSchema } from '@/lib/rwa/schema';

import type { McpToolDefinition } from './types';

export const rwaAssessmentTool: McpToolDefinition<typeof RwaDiagnosticSchema> = {
  name: 'assess_rwa_evidence',
  description:
    'Evaluate supplied RWA/tokenized-stock evidence against an explicit policy. Unsigned diagnostic only: caller-supplied facts are not authenticated, and ALLOW does not authorize a trade. Existing pre-trade and authorization checks remain required.',
  parameters: RwaDiagnosticSchema,
  handler: ({ input, policy }) => JSON.stringify(diagnoseRwa(input, policy)),
};
