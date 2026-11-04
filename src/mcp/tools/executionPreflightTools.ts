/** Chain-neutral, action-facing execution preflight MCP tool. */

import { assessExecutionPreflight } from '@/lib/preflight/executionPreflight';

import { ExecutionPreflightInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

const VERDICT_LABEL = {
  allow: 'ALLOW',
  caution: 'CAUTION',
  block: 'BLOCK',
} as const;

export const executionPreflightTool: McpToolDefinition<typeof ExecutionPreflightInputSchema> = {
  name: 'execution_preflight',
  description:
    'Action-facing, chain-neutral data-sufficiency gate for an intended swap, borrow, lend, liquidation, or repay. It composes Insight’s strict multi-oracle pre-trade assessment with an optional fresh venue-quote assessment into ALLOW / CAUTION / BLOCK, lists the exact missing evidence, and returns the underlying signed assessment when available. It evaluates data sufficiency only — never contract safety, custody, profitability, or transaction execution. Monad is a first-class profile using on-chain Pyth Core evidence; set targetProviders to ["pyth"] for a low-latency native snapshot, which remains CAUTION under the strict quorum policy until independent evidence is present. Other supported chains use their configured oracle adapters.',
  parameters: ExecutionPreflightInputSchema,
  handler: async (args) => {
    const result = await assessExecutionPreflight({
      asset: args.asset,
      destinationAsset: args.destinationAsset,
      chainId: args.chainId,
      action: args.action,
      tradeAmountUsd: args.tradeAmountUsd,
      targetProviders: args.targetProviders,
      protocolId: args.protocolId,
      tokenAddress: args.tokenAddress,
      decisionInput: args.decisionInput,
    });

    const lines = [
      `**Execution Preflight: ${result.asset}${result.destinationAsset ? ` → ${result.destinationAsset}` : ''} · ${result.action} · chain ${result.chain.id}**`,
      `- Decision: **${VERDICT_LABEL[result.verdict]}** (${result.recommendation})`,
      `- Chain profile: ${result.chain.profile}${result.chain.name ? ` (${result.chain.name})` : ''}`,
      `- Oracle safety: ${result.gates.oracleSafety.status.toUpperCase()} (${result.gates.oracleSafety.verdict}; ${result.gates.oracleSafety.participantCount} provider(s), ${(result.gates.oracleSafety.crossProviderAgreement * 100).toFixed(1)}% agreement)`,
      `- Venue quote: ${result.gates.venueQuote.status.toUpperCase()}${result.gates.venueQuote.requested ? ` (eligible=${String(result.gates.venueQuote.eligibleToProceed)})` : ' (not supplied)'}`,
      result.gates.nativeOracle.provider
        ? `- Native oracle: ${result.gates.nativeOracle.status.toUpperCase()} (${result.gates.nativeOracle.provider}; age ${result.gates.nativeOracle.dataAgeSeconds ?? 'unknown'}s; on-chain verified=${result.gates.nativeOracle.onChainVerified})`
        : '',
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
    ];

    if (result.requiredBeforeAllow.length > 0) {
      lines.push(
        '',
        '**Required before ALLOW:**',
        ...result.requiredBeforeAllow.map((item) => `- ${item}`)
      );
    }

    if (result.assessment.attestation) {
      lines.push(
        '',
        '**Verifiable oracle assessment:**',
        `- UID: ${result.assessment.attestation.uid}`,
        `- Valid for: ${result.assessment.attestation.validForSeconds}s`,
        `- Verify: POST ${result.assessment.attestation.verifyUrl}`
      );
    }

    lines.push(
      '',
      'Scope: this decision evaluates the declared data inputs only. It does not certify contract code, route execution, custody, MEV outcome, or profitability.',
      '```json',
      JSON.stringify(result),
      '```'
    );

    return lines.filter(Boolean).join('\n');
  },
};
