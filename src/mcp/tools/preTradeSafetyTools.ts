/**
 * pre_trade_safety_check MCP tool.
 *
 * The AI agent "oracle immune system" entry point. AI agents SHOULD call this
 * tool BEFORE executing any on-chain swap/borrow/lend/liquidation to verify
 * that oracle data is not currently being manipulated. The verdict
 * (PASS/CAUTION/DANGER/BLOCK) tells the agent whether it is safe to proceed.
 *
 * Agents MUST NOT execute trades when the verdict is DANGER or BLOCK.
 */

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
  type PreTradeSafetyInput,
} from '@/lib/api/services/preTradeSafetyService';

import { formatPercent, formatPrice } from './formatters';
import { PreTradeSafetyInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

const VERDICT_EMOJI: Record<PreTradeSafetyResult['verdict'], string> = {
  PASS: '🟢',
  CAUTION: '🟡',
  DANGER: '🟠',
  BLOCK: '🔴',
};

function formatProviderBreakdown(result: PreTradeSafetyResult): string[] {
  const entries = Object.entries(result.providerPrices);
  if (entries.length === 0) return ['(no provider data)'];

  return entries.map(([provider, d]) => {
    const dev = d.deviationPct === null ? 'n/a' : formatPercent(d.deviationPct);
    const age = d.dataAgeSeconds === null ? 'n/a' : `${d.dataAgeSeconds}s`;
    const stale = d.isStale ? ' ⚠️ stale' : '';
    const outlier = d.isOutlier ? ' [OUTLIER]' : '';
    const rep = d.reputationScore === null ? 'n/a' : `${d.reputationScore.toFixed(0)}`;
    const status = d.status !== 'success' ? ` (${d.status})` : '';
    return `- ${provider}: $${formatPrice(d.price, 2)} (dev ${dev}, age ${age}${stale}, rep ${rep})${outlier}${status}`;
  });
}

function formatContributingFactors(result: PreTradeSafetyResult): string[] {
  if (result.contributingFactors.length === 0) {
    return ['None — all risk signals within normal range.'];
  }
  return result.contributingFactors.map((f) => `- [${f.triggeredVerdict}] ${f.rule}: ${f.message}`);
}

export const preTradeSafetyCheckTool: McpToolDefinition<typeof PreTradeSafetyInputSchema> = {
  name: 'pre_trade_safety_check',
  description: [
    'Pre-trade oracle safety checkpoint for AI agents. Call this BEFORE executing any on-chain',
    'swap/borrow/lend/liquidation/repay to verify oracle data integrity. Aggregates cross-oracle',
    'consensus prices, per-provider deviation, data freshness, stablecoin peg status, and reputation',
    'into a single verdict: PASS / CAUTION / DANGER / BLOCK. AI agents MUST NOT execute trades when',
    'the verdict is DANGER or BLOCK. Also returns a recommended maximum position size.',
  ].join(' '),
  parameters: PreTradeSafetyInputSchema,
  handler: async (args) => {
    const input: PreTradeSafetyInput = {
      asset: args.asset,
      chainId: args.chainId,
      action: args.action,
      tradeAmountUsd: args.tradeAmountUsd,
      targetProviders: args.targetProviders,
      protocolId: args.protocolId,
    };

    const result = await preTradeSafetyCheck(input);

    const lines = [
      `**Pre-Trade Safety Check: ${input.asset} ${input.action} $${input.tradeAmountUsd.toLocaleString()} on chain ${input.chainId}**`,
      '',
      `**Verdict: ${VERDICT_EMOJI[result.verdict]} ${result.verdict}**`,
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Consensus Price | $${formatPrice(result.consensusPrice, 2)} |`,
      `| Max Deviation | ${formatPercent(result.maxDeviationPct)} |`,
      `| Cross-Provider Agreement | ${(result.crossProviderAgreement * 100).toFixed(1)}% |`,
      `| Manipulation Risk Score | ${result.manipulationRiskScore.toFixed(2)} (0=low, 1=high) |`,
      `| Data Stale Risk | ${result.staleDataRisk ? 'Yes' : 'No'} |`,
      `| Participant Providers | ${result.participantCount} |`,
      `| Recommended Max Position | $${result.recommendedMaxPositionUsd.toLocaleString()} |`,
      `| Latency | ${result.latencyMs}ms |`,
      '',
      '**Provider breakdown:**',
      ...formatProviderBreakdown(result),
    ];

    if (result.protocolSafety) {
      const ps = result.protocolSafety;
      lines.push('', '**Protocol safety context:**');
      lines.push(`- Protocol: ${ps.protocolName} (${ps.protocolId})`);
      lines.push(
        `- Critical deviation (max-LTV liquidation): ${formatPercent(ps.criticalDeviationPct)}`
      );
      lines.push(`- Safety buffer consumed: ${ps.bufferConsumedPct.toFixed(1)}%`);
      lines.push(`- Liquidation threshold: ${formatPercent((ps.liquidationThreshold - 1) * 100)}`);
      lines.push(`- Max LTV: ${formatPercent(ps.maxLtv * 100)}`);
    }

    if (result.depegWarnings.length > 0) {
      lines.push('', '**Active stablecoin depeg warnings:**');
      for (const w of result.depegWarnings) {
        lines.push(`- ${w.stablecoin}: ${formatPercent(w.deviationPct)} (${w.riskLevel})`);
      }
    }

    lines.push('', '**Risk factors:**', ...formatContributingFactors(result));

    lines.push('', '**Warnings:**', ...result.warnings.map((w) => `- ${w}`));

    // Agent-facing guidance.
    if (result.verdict === 'PASS') {
      lines.push(
        '',
        `Guidance: Oracle data looks healthy. Your trade of $${input.tradeAmountUsd.toLocaleString()} is within safe bounds; proceed with standard DeFi caution.`
      );
    } else if (result.verdict === 'CAUTION') {
      lines.push(
        '',
        `Guidance: Minor oracle risk signals detected. Consider reducing trade size (recommended max $${result.recommendedMaxPositionUsd.toLocaleString()}) or waiting for conditions to stabilize.`
      );
    } else if (result.verdict === 'DANGER') {
      lines.push(
        '',
        `Guidance: Significant oracle risk detected. DO NOT execute this trade without human review. Possible price manipulation or stale data.`
      );
    } else {
      lines.push(
        '',
        `Guidance: CRITICAL oracle risk detected. DO NOT execute this trade. Oracle data appears manipulated or unavailable.`
      );
    }

    // Oracle safety attestation — a portable, verifiable proof that this check
    // ran. Agents can relay `attestation` in tx memo/calldata/logs so users and
    // protocols recognize the agent consulted Insight's oracle immune system.
    if (result.attestation) {
      const a = result.attestation;
      lines.push('', '**Oracle safety attestation (verifiable proof):**');
      lines.push(`- Attester: ${a.attester} (${a.attesterLabel})`);
      lines.push(`- UID: ${a.uid}`);
      lines.push(
        `- Verdict: ${a.data.verdict} @ ${new Date(a.data.checkedAt * 1000).toISOString()}`
      );
      lines.push(`- Valid for: ${a.validForSeconds}s`);
      lines.push(`- Verify at: POST ${a.verifyUrl} with body { "attestation": <object> }`);
      lines.push('- Signature: ' + a.signature.slice(0, 42) + '…');
    }

    return lines.join('\n');
  },
};
