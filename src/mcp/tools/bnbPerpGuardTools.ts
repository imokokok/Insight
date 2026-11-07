import { assessBnbPerpGuard, BnbPerpGuardInputSchema } from '@/lib/perps/bnbPerpGuard';

import type { McpToolDefinition } from './types';

/**
 * Agent-facing wrapper for the x402-metered BNB perp decision gate. The native
 * assessor is the same one the REST `/api/v1/safety/bnb-perp-guard` route runs,
 * so the MCP surface adds transport, not a second verdict implementation.
 */
export const bnbPerpGuardTool: McpToolDefinition<typeof BnbPerpGuardInputSchema> = {
  name: 'bnb_perp_guard',
  description:
    'Read-only BNB Smart Chain pre-trade decision-input integrity gate for opening an Aster USDT-margined perpetual (reviewed BTC and ETH markets). Separately evaluates underlying and margin oracle integrity, checks caller-declared post-action leverage against the reviewed market cap (capped by live venue margin requirements), and returns ALLOW / CAUTION / BLOCK with disclosed Aster mark/index, funding, open-interest and market-status evidence. Assessment-only: it never signs, broadcasts, or authorizes an order, and Aster exact-order binding is not part of this surface.',
  parameters: BnbPerpGuardInputSchema,
  handler: async (args) => {
    const result = await assessBnbPerpGuard(args);
    return [
      `**BNB Perp Guard: ${result.protocolId} · ${result.action}**`,
      `- Decision: **${result.verdict}**`,
      `- Market: ${result.market.assetSymbol} perp / ${result.market.marginAssetSymbol} margin; reviewed max leverage ${result.market.maxLeverage}x (${result.market.maxLeverageSource})`,
      `- Effective leverage: ${result.projected.effectiveLeverage.toFixed(2)}x; liquidation buffer: ${result.projected.liquidationBufferPct.toFixed(2)}%; conservative max size: $${result.projected.conservativeMaxSizeUsd.toFixed(2)}`,
      `- Underlying oracle: ${result.oracleChecks.underlying.verdict}; margin oracle: ${result.oracleChecks.margin.verdict}`,
      `- Aster venue evidence: ${result.venue.status}${result.venue.status === 'unavailable' ? ` (${result.venue.aster.unavailableReason})` : `; mark ${result.venue.markPrice ?? 'n/a'}, index ${result.venue.indexPrice ?? 'n/a'}, mark/index deviation ${result.venue.markIndexDeviationBps ?? 'n/a'} bps, market status ${result.venue.aster.marketStatus ?? 'n/a'}`}`,
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
      '',
      'Scope: caller-declared post-action USD values and read-only venue/oracle data only. This result never signs, sends, or authorizes an order.',
      '```json',
      JSON.stringify(result),
      '```',
    ].join('\n');
  },
};
