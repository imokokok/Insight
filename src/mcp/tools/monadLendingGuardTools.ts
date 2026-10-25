import {
  assessMonadLendingGuard,
  MonadLendingGuardExactInputSchema,
  MonadLendingGuardInputSchema,
} from '@/lib/lending/monadLendingGuard';
import { createMonadLendingGuardDecision } from '@/lib/lending/monadLendingGuardAttestation';

import type { McpToolDefinition } from './types';

/** Agent-facing wrapper for the x402-metered Monad lending decision gate. */
export const monadLendingGuardTool: McpToolDefinition<typeof MonadLendingGuardInputSchema> = {
  name: 'monad_lending_guard',
  description:
    'Read-only Monad lending pre-signing gate for direct Aave V3 or an exact Morpho Blue market. Separately evaluates collateral and loan oracle integrity, checks caller-declared post-action LTV against live protocol parameters, and returns ALLOW / CAUTION / BLOCK. It never signs, broadcasts, or authorizes a transaction; bind a successful decision to an exact user-authorized transaction separately.',
  parameters: MonadLendingGuardInputSchema,
  handler: async (args) => {
    const result = await assessMonadLendingGuard(args);
    return [
      `**Monad Lending Guard: ${result.protocolId} · ${result.action}**`,
      `- Decision: **${result.verdict}**`,
      `- Market: ${result.market.collateralSymbol} collateral / ${result.market.loanSymbol} loan${result.market.marketId ? ` (${result.market.marketId})` : ''}`,
      `- LTV: ${(result.projected.ltv * 100).toFixed(2)}%; max LTV ${(result.market.maxLtv * 100).toFixed(2)}%; liquidation LTV ${(result.market.liquidationLtv * 100).toFixed(2)}%`,
      `- Liquidation buffer: ${result.projected.liquidationBufferPct.toFixed(2)}%; conservative max debt: $${result.projected.conservativeMaxDebtUsd.toFixed(2)}`,
      `- Collateral oracle: ${result.oracleChecks.collateral.verdict}; loan oracle: ${result.oracleChecks.loan.verdict}`,
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
      '',
      'Scope: caller-declared post-action USD values and read-only protocol/oracle data only. This result never signs, sends, or authorizes a transaction.',
      '```json',
      JSON.stringify(result),
      '```',
    ].join('\n');
  },
};

/** Binds one unsigned, direct Monad call to short-lived Insight risk evidence. */
export const monadLendingGuardExactCallTool: McpToolDefinition<
  typeof MonadLendingGuardExactInputSchema
> = {
  name: 'monad_lending_guard_exact_call',
  description:
    'Create portable Insight risk evidence for one exact unsigned direct Aave V3 Monad or Morpho Blue Monad supply/borrow call. It verifies target, selector, token or market binding, sender, nonce and zero value, then returns a short-lived EIP-712 decision when Insight signing is configured. It never authorizes, signs, or broadcasts the transaction; bind an ALLOW through PriorSeal or another user-authorization system.',
  parameters: MonadLendingGuardExactInputSchema,
  handler: async ({ guard: input, transaction }) => {
    const guard = await assessMonadLendingGuard(input);
    const decision = await createMonadLendingGuardDecision(guard, transaction);
    return [
      `**Monad Lending Guard exact call: ${guard.protocolId} · ${guard.action}**`,
      `- Decision: **${guard.verdict}**`,
      `- Exact call: ${decision.action.target} · calldata ${decision.action.calldataHash}`,
      `- Insight attestation: ${decision.attestation ? `available until ${new Date(decision.attestation.data.validUntil * 1000).toISOString()}` : 'unavailable (preview only; do not reuse as execution evidence)'}`,
      '',
      'Scope: Insight assesses the declared post-action USD values and binds one unsigned direct call. It does not authorize, submit, or observe execution.',
      '```json',
      JSON.stringify(decision),
      '```',
    ].join('\n');
  },
};
