import {
  assessHyperliquidPerpGuard,
  HyperliquidPerpGuardExactInputSchema,
  HyperliquidPerpGuardInputSchema,
} from '@/lib/perps/hyperliquidPerpGuard';
import { createHyperliquidPerpGuardDecision } from '@/lib/perps/hyperliquidPerpGuardAttestation';

import type { McpToolDefinition } from './types';

/** Agent-facing wrapper for the x402-metered Hyperliquid perp decision gate. */
export const hyperliquidPerpGuardTool: McpToolDefinition<typeof HyperliquidPerpGuardInputSchema> = {
  name: 'hyperliquid_perp_guard',
  description:
    'Read-only Hyperliquid pre-trade decision gate for opening a perpetual position on the Hyperliquid L1 venue (reviewed BTC and ETH markets today, USDC margin). Separately evaluates underlying and USDC cross-oracle consensus integrity on canonical mainnet feeds, checks caller-declared post-action leverage against a reviewed static profile capped by the freshly observed venue leverage limit, and attaches disclosed venue evidence (mark/oracle divergence, cross-venue consensus deviation, displayed depth) that can escalate the verdict. Returns ALLOW / CAUTION / BLOCK. Assessment-only: it does not evaluate the liquidation engine and never signs, submits, or authorizes an order; bind a successful result to an exact user-authorized order envelope separately.',
  parameters: HyperliquidPerpGuardInputSchema,
  handler: async (args) => {
    const result = await assessHyperliquidPerpGuard(args);
    return [
      `**Hyperliquid Perp Guard: ${result.protocolId} · ${result.action}**`,
      `- Decision: **${result.verdict}**`,
      `- Market: ${result.market.assetSymbol} perp / ${result.market.marginAssetSymbol} margin; effective leverage cap ${result.market.maxLeverage}x (${result.market.maxLeverageSource})`,
      `- Effective leverage: ${result.projected.effectiveLeverage.toFixed(2)}x; liquidation buffer: ${result.projected.liquidationBufferPct.toFixed(2)}%; conservative max size: $${result.projected.conservativeMaxSizeUsd.toFixed(2)}`,
      `- Underlying oracle: ${result.oracleChecks.underlying.verdict}; margin oracle: ${result.oracleChecks.margin.verdict}`,
      `- Venue evidence: ${formatVenueEvidence(result)}`,
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
      '',
      'Scope: caller-declared post-action USD values, read-only oracle consensus, and read-only Hyperliquid public data only. This result never signs, sends, or authorizes an order.',
      '```json',
      JSON.stringify(result),
      '```',
    ].join('\n');
  },
};

function formatVenueEvidence(
  result: Awaited<ReturnType<typeof assessHyperliquidPerpGuard>>
): string {
  const venue = result.venue;
  if (venue.status !== 'observed') return 'unavailable (verdict rests on oracle consensus only)';
  return [
    `mark/oracle ${venue.markOracleDeviationBps?.toFixed(1) ?? 'n/a'} bps`,
    `consensus-vs-venue ${venue.consensusVenueDeviationPct?.toFixed(2) ?? 'n/a'}%`,
    `spread ${venue.spreadBps?.toFixed(2) ?? 'n/a'} bps`,
    `live max leverage ${venue.liveMaxLeverage ?? 'n/a'}x`,
  ].join('; ');
}

/**
 * Agent-facing exact-order variant. It accepts one unsigned Hyperliquid
 * exchange envelope only to bind it into a signed assessment; it never signs
 * or submits it.
 */
export const hyperliquidPerpGuardExactCallTool: McpToolDefinition<
  typeof HyperliquidPerpGuardExactInputSchema
> = {
  name: 'hyperliquid_perp_guard_exact_call',
  description:
    'Create portable Insight risk evidence for one exact unsigned Hyperliquid IOC order envelope on a reviewed market (BTC, ETH; USDC margin). It validates the single-order IOC envelope against the fresh assessment (side matches the assessed action, notional within the reviewed tolerance of the declared size, unexpired window, builder fee within the venue cap) and returns a short-lived EIP-712 decision over the envelope intent hash when Insight signing is configured. It never authorizes, signs, or submits the order; bind an ALLOW through PriorSeal or another user-authorization system, then sign the exact envelope in the user wallet process.',
  parameters: HyperliquidPerpGuardExactInputSchema,
  handler: async ({ guard: input, order }) => {
    const guard = await assessHyperliquidPerpGuard(input);
    const decision = await createHyperliquidPerpGuardDecision(guard, order);
    return [
      `**Hyperliquid Perp Guard exact order: ${guard.protocolId} · ${guard.action}**`,
      `- Decision: **${guard.verdict}**`,
      `- Exact envelope: coin ${decision.binding.coin} · assetIndex ${decision.binding.assetIndex} · ${decision.binding.isBuy ? 'buy' : 'sell'} ${decision.binding.size} @ ${decision.binding.limitPrice} · intent ${decision.binding.intentHash}`,
      `- Insight attestation: ${decision.attestation ? `available until ${new Date(decision.attestation.data.validUntil * 1000).toISOString()}` : 'unavailable (preview only; do not reuse as execution evidence)'}`,
      '',
      'Scope: Insight assesses the declared post-action USD values and binds one unsigned IOC order envelope. It does not authorize, sign, or submit the order, and the envelope must be signed in the user wallet process exactly as bound.',
      '```json',
      JSON.stringify(decision),
      '```',
    ].join('\n');
  },
};
