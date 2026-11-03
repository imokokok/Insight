import {
  assessBaseLendingGuard,
  BaseLendingGuardExactInputSchema,
  BaseLendingGuardInputSchema,
} from '@/lib/lending/baseLendingGuard';
import { createBaseLendingGuardDecision } from '@/lib/lending/baseLendingGuardAttestation';

import type { McpToolDefinition } from './types';

/** Agent-facing wrapper for the x402-metered Base lending decision gate. */
export const baseLendingGuardTool: McpToolDefinition<typeof BaseLendingGuardInputSchema> = {
  name: 'base_lending_guard',
  description:
    'Read-only Base lending pre-signing gate for Aave V3, an exact Morpho Blue market, Compound V3 USDC Comet, or reviewed Moonwell markets. Separately evaluates collateral and loan oracle integrity, checks caller-declared post-action LTV against live protocol parameters, and returns ALLOW / CAUTION / BLOCK. It never signs, broadcasts, or authorizes a transaction; bind a successful decision to an exact user-authorized transaction separately.',
  parameters: BaseLendingGuardInputSchema,
  handler: async (args) => {
    const result = await assessBaseLendingGuard(args);
    return [
      `**Base Lending Guard: ${result.protocolId} · ${result.action}**`,
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

/**
 * Agent-facing exact-call variant. It accepts an unsigned transaction only to
 * bind its immutable bytes into a signed assessment; it never submits it.
 */
export const baseLendingGuardExactCallTool: McpToolDefinition<
  typeof BaseLendingGuardExactInputSchema
> = {
  name: 'base_lending_guard_exact_call',
  description:
    'Create portable Insight risk evidence for one exact unsigned direct Aave V3, Morpho Blue, Compound V3, or reviewed Moonwell Base supply/borrow call. It verifies target, selector, token or market binding, sender, nonce and zero value, then returns a short-lived EIP-712 decision when Insight signing is configured. It never authorizes, signs, or broadcasts the transaction; bind an ALLOW through PriorSeal or another user-authorization system.',
  parameters: BaseLendingGuardExactInputSchema,
  handler: async ({ guard: input, transaction }) => {
    const guard = await assessBaseLendingGuard(input);
    const decision = await createBaseLendingGuardDecision(guard, transaction);
    return [
      `**Base Lending Guard exact call: ${guard.protocolId} · ${guard.action}**`,
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
