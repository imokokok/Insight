import { assessSolanaPerpGuard, SolanaPerpGuardInputSchema } from '@/lib/perps/solanaPerpGuard';

import type { McpToolDefinition } from './types';

/** Agent-facing wrapper for the x402-metered Solana (Drift v2) perp decision gate. */
export const solanaPerpGuardTool: McpToolDefinition<typeof SolanaPerpGuardInputSchema> = {
  name: 'solana_perp_guard',
  description:
    'Read-only Solana pre-trade decision gate for opening a perpetual position on Drift Protocol v2 on Solana mainnet (reviewed SOL, BTC, and ETH perp markets today, USDC margin). Drift publishes no REST API, so venue evidence is read directly from Drift on-chain Anchor accounts through Solana mainnet RPC: mark price from the AMM curve, the market\u2019s own Pyth Lazer oracle price, funding rate, open interest versus the on-chain maxOpenInterest backstop, and live margin ratios. Separately evaluates underlying and USDC cross-oracle consensus integrity on canonical mainnet feeds, checks caller-declared post-action leverage against a reviewed static profile capped by the live on-chain margin ratio, and attaches disclosed venue evidence that can escalate the verdict. Returns ALLOW / CAUTION / BLOCK. Assessment-only: it does not evaluate Drift\u2019s liquidation engine and never signs, submits, or authorizes a transaction; bind a successful result to one exact user-authorized unsigned transaction separately.',
  parameters: SolanaPerpGuardInputSchema,
  handler: async (args) => {
    const result = await assessSolanaPerpGuard(args);
    return [
      `**Solana Perp Guard: ${result.protocolId} · ${result.action}**`,
      `- Decision: **${result.verdict}**`,
      `- Market: ${result.market.assetSymbol} perp / ${result.market.marginAssetSymbol} margin; effective leverage cap ${result.market.maxLeverage}x (${result.market.maxLeverageSource})`,
      `- Effective leverage: ${result.projected.effectiveLeverage.toFixed(2)}x; liquidation buffer: ${result.projected.liquidationBufferPct.toFixed(2)}%; conservative max size: $${result.projected.conservativeMaxSizeUsd.toFixed(2)}`,
      `- Underlying oracle: ${result.oracleChecks.underlying.verdict}; margin oracle: ${result.oracleChecks.margin.verdict}`,
      `- Venue evidence: ${formatVenueEvidence(result)}`,
      '',
      '**Reasons:**',
      ...result.reasons.map((reason) => `- ${reason}`),
      '',
      'Scope: caller-declared post-action USD values, read-only oracle consensus, and read-only Solana mainnet Drift account reads only. This result never signs, sends, or authorizes a transaction.',
      '```json',
      JSON.stringify(result),
      '```',
    ].join('\n');
  },
};

function formatVenueEvidence(result: Awaited<ReturnType<typeof assessSolanaPerpGuard>>): string {
  const venue = result.venue;
  if (venue.status !== 'observed') return 'unavailable (verdict rests on oracle consensus only)';
  return [
    `mark/oracle ${venue.markOracleDeviationBps?.toFixed(1) ?? 'n/a'} bps`,
    `consensus-vs-venue ${venue.consensusVenueDeviationPct?.toFixed(2) ?? 'n/a'}%`,
    `funding ${venue.fundingRate !== null ? (venue.fundingRate * 100).toFixed(4) + '%/h' : 'n/a'}`,
    `open interest ${venue.openInterestCoin !== null ? venue.openInterestCoin.toPrecision(6) : 'n/a'}${venue.drift.openInterestUtilizationPct !== null ? ` (${venue.drift.openInterestUtilizationPct.toFixed(1)}% of on-chain cap)` : ''}`,
    `live max leverage ${venue.liveMaxLeverage ?? 'n/a'}x`,
    `market status ${venue.drift.marketStatus ?? 'n/a'}`,
  ].join('; ');
}
