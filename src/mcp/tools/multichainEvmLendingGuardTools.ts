import {
  assessMultichainEvmLendingGuard,
  MultichainEvmLendingGuardExactInputSchema,
  MultichainEvmLendingGuardInputSchema,
} from '@/lib/lending/multichainEvmLendingGuard';
import { createMultichainEvmLendingGuardDecision } from '@/lib/lending/multichainEvmLendingGuardAttestation';

import type { McpToolDefinition } from './types';

/** Agent-facing wrapper for the x402-metered cross-chain lending decision gate. */
export const multichainEvmLendingGuardTool: McpToolDefinition<
  typeof MultichainEvmLendingGuardInputSchema
> = {
  name: 'multichain_evm_lending_guard',
  description:
    'Read-only lending pre-signing gate for reviewed Base, Polygon, Arbitrum, and BNB Chain deployments: Aave V3, Venus Core, Compound V3, Dolomite, Morpho Blue, Lista Moolah, Euler v2, and Fluid T1. Euler borrowing is accepted only as the reviewed four-step EVC batch; Dolomite only as one sender-owned account with one direct deposit or borrow; Fluid T1 only as collateral-only supply into a factory-authenticated vault. The tool checks caller-declared post-action values against live protocol state and independent oracle evidence, then returns ALLOW / CAUTION / BLOCK. It never signs, broadcasts, or authorizes a transaction.',
  parameters: MultichainEvmLendingGuardInputSchema,
  handler: async (args) => {
    const result = await assessMultichainEvmLendingGuard(args);
    return [
      `**Multichain EVM Lending Guard: ${result.protocolId} · ${result.action}**`,
      `- Chain: ${result.chainId}; decision: **${result.verdict}**`,
      `- Market: ${result.market.collateralSymbol} collateral / ${result.market.loanSymbol} loan${result.market.marketId ? ` (${result.market.marketId})` : result.market.marketAddress ? ` (${result.market.marketAddress})` : ''}`,
      `- LTV: ${(result.projected.ltv * 100).toFixed(2)}%; max ${(result.market.maxLtv * 100).toFixed(2)}%; liquidation ${(result.market.liquidationLtv * 100).toFixed(2)}%`,
      `- Oracle checks: collateral ${result.oracleChecks.collateral.verdict}; loan ${result.oracleChecks.loan.verdict}`,
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
      '',
      'Scope: read-only protocol/oracle evaluation of caller-declared post-action values. This tool never signs, sends, or authorizes a transaction.',
      '```json',
      JSON.stringify(result),
      '```',
    ].join('\n');
  },
};

/** Bind a guard decision to one unsigned direct call without execution authority. */
export const multichainEvmLendingGuardExactCallTool: McpToolDefinition<
  typeof MultichainEvmLendingGuardExactInputSchema
> = {
  name: 'multichain_evm_lending_guard_exact_call',
  description:
    'Create portable Insight evidence for one exact unsigned direct reviewed EVM lending call on Base, Polygon, Arbitrum, or BNB Chain. It binds target, calldata, sender, nonce, value, protocol market, and short-lived Insight signature when configured. It never authorizes, signs, relays, or broadcasts the transaction; use PriorSeal for user authorization.',
  parameters: MultichainEvmLendingGuardExactInputSchema,
  handler: async ({ guard: input, transaction }) => {
    const guard = await assessMultichainEvmLendingGuard(input);
    const decision = await createMultichainEvmLendingGuardDecision(guard, transaction);
    return [
      `**Multichain EVM Lending Guard exact call: ${guard.protocolId} · ${guard.action}**`,
      `- Decision: **${guard.verdict}**`,
      `- Exact call: ${decision.action.target} · calldata ${decision.action.calldataHash}`,
      `- Insight attestation: ${decision.attestation ? `available until ${new Date(decision.attestation.data.validUntil * 1000).toISOString()}` : 'unavailable (preview only; do not reuse as execution evidence)'}`,
      '',
      'Scope: one unsigned direct call only. This tool does not authorize, submit, or observe execution.',
      '```json',
      JSON.stringify(decision),
      '```',
    ].join('\n');
  },
};
