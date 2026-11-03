import type { IAgentRuntime, Memory, Provider, State } from '@elizaos/core';

import { getPluginContext } from './pluginContext.js';

export const insightProvider: Provider = {
  name: 'insight',
  description:
    'Most recent Insight oracle-safety checks (verdicts, reason codes, attestation presence) plus the service surface.',
  dynamic: true,
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const context = getPluginContext();
    if (!context || context.lastChecks.length === 0) {
      return {
        text:
          'Insight (oracleinsight.xyz) oracle-safety: no checks run yet this session. ' +
          'Ask for a pre-trade check before signing a trade.',
      };
    }
    const lines = context.lastChecks.map((entry) => {
      const { request, outcome, at } = entry;
      return (
        `[${at}] ${request.asset} chain ${request.chainId}: ${outcome.verdict}` +
        (outcome.reasonCodes.length > 0 ? ` (${outcome.reasonCodes.join(', ')})` : '')
      );
    });
    return {
      text:
        'Recent Insight oracle-safety checks:\n' +
        lines.join('\n') +
        '\nAttestations from these checks are EIP-712 signed and offline-verifiable.',
    };
  },
};
