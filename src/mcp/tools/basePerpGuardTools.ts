import {
  assessBasePerpGuard,
  BasePerpGuardExactInputSchema,
  BasePerpGuardInputSchema,
} from '@/lib/perps/basePerpGuard';
import { createBasePerpGuardDecision } from '@/lib/perps/basePerpGuardAttestation';

import type { McpToolDefinition } from './types';

/** Agent-facing wrapper for the x402-metered Base perp decision gate. */
export const basePerpGuardTool: McpToolDefinition<typeof BasePerpGuardInputSchema> = {
  name: 'base_perp_guard',
  description:
    'Read-only Base pre-trade decision-input integrity gate for opening a Synthetix Perps V3 position (reviewed BTC, ETH, SOL, XRP, DOGE, and PEPE markets, USDC margin). Separately evaluates underlying and margin oracle integrity, checks caller-declared post-action leverage against reviewed market caps, and returns ALLOW / CAUTION / BLOCK. Assessment-only: it does not evaluate the venue mark-price or liquidation engine and never signs, broadcasts, or authorizes an order; bind a successful result to an exact user-authorized order separately.',
  parameters: BasePerpGuardInputSchema,
  handler: async (args) => {
    const result = await assessBasePerpGuard(args);
    return [
      `**Base Perp Guard: ${result.protocolId} · ${result.action}**`,
      `- Decision: **${result.verdict}**`,
      `- Market: ${result.market.assetSymbol} perp / ${result.market.marginAssetSymbol} margin; reviewed max leverage ${result.market.maxLeverage}x`,
      `- Effective leverage: ${result.projected.effectiveLeverage.toFixed(2)}x; liquidation buffer: ${result.projected.liquidationBufferPct.toFixed(2)}%; conservative max size: $${result.projected.conservativeMaxSizeUsd.toFixed(2)}`,
      `- Underlying oracle: ${result.oracleChecks.underlying.verdict}; margin oracle: ${result.oracleChecks.margin.verdict}`,
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
      '',
      'Scope: caller-declared post-action USD values and read-only oracle data only. This result never signs, sends, or authorizes an order.',
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
export const basePerpGuardExactCallTool: McpToolDefinition<typeof BasePerpGuardExactInputSchema> = {
  name: 'base_perp_guard_exact_call',
  description:
    'Create portable Insight risk evidence for one exact unsigned direct Synthetix Perps V3 Base commitOrder call on a reviewed market (BTC, ETH, SOL, XRP, DOGE, PEPE; USDC margin). It verifies the canonical PerpsMarketProxy target, selector, reviewed market id, Pyth settlement strategy, sizeDelta direction, sender, nonce and zero value, then returns a short-lived EIP-712 decision when Insight signing is configured. It never authorizes, signs, or broadcasts the order; bind an ALLOW through PriorSeal or another user-authorization system.',
  parameters: BasePerpGuardExactInputSchema,
  handler: async ({ guard: input, transaction }) => {
    const guard = await assessBasePerpGuard(input);
    const decision = await createBasePerpGuardDecision(guard, transaction);
    return [
      `**Base Perp Guard exact call: ${guard.protocolId} · ${guard.action}**`,
      `- Decision: **${guard.verdict}**`,
      `- Exact call: ${decision.action.target} · market ${decision.action.marketId} · calldata ${decision.action.calldataHash}`,
      `- Insight attestation: ${decision.attestation ? `available until ${new Date(decision.attestation.data.validUntil * 1000).toISOString()}` : 'unavailable (preview only; do not reuse as execution evidence)'}`,
      '',
      'Scope: Insight assesses the declared post-action USD values and binds one unsigned direct commitOrder call. It does not authorize, submit, or observe execution, and margin must already be deposited into the Synthetix account separately.',
      '```json',
      JSON.stringify(decision),
      '```',
    ].join('\n');
  },
};
