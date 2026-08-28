import { getOracleWatchSignal } from '@/lib/api/services/oracleWatchService';

import { formatPercent, formatPrice } from './formatters';
import { OracleWatchInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const oracleWatchTool: McpToolDefinition<typeof OracleWatchInputSchema> = {
  name: 'oracle_watch',
  description:
    'Always-on cross-oracle trust signal for an asset: live consensus deviation, agreement, quorum, outliers and staleness condensed into a NORMAL / CAUTION / DANGER verdict with a proceed / proceed_with_caution / halt recommendation. Agents should gate long-running strategies (yield, keeper, portfolio) on this signal, not just one-off trades. Pair it with pre_trade_safety_check for the decision moment.',
  parameters: OracleWatchInputSchema,
  handler: async (args) => {
    const signal = await getOracleWatchSignal(args.symbol, args.chain);

    const lines = [
      `**Oracle Watch: ${signal.symbol}**${signal.chain ? ` on ${signal.chain}` : ''}`,
      `- Verdict: ${signal.verdict.toUpperCase()}`,
      `- Recommendation: ${signal.recommendation}`,
      `- Reason: ${signal.reason}`,
      `- Max cross-oracle deviation: ${
        signal.maxDeviationPct !== null ? formatPercent(signal.maxDeviationPct) : 'n/a'
      }`,
      `- Agreement: ${(signal.agreement * 100).toFixed(2)}%`,
      `- Consensus providers: ${signal.participantCount} responding`,
      `- Outliers: ${signal.outlierCount}, Stale: ${signal.staleCount}`,
      signal.consensusPrice !== null
        ? `- Consensus price: $${formatPrice(signal.consensusPrice)}`
        : '',
      signal.mlRiskScore !== null
        ? `- ML manipulation risk: ${signal.mlRiskLevel?.toUpperCase() ?? 'n/a'} (${(signal.mlRiskScore * 100).toFixed(1)}/100, forward-looking)`
        : '',
      typeof signal.trustScore === 'number'
        ? `- Credibility trust score: ${signal.trustScore}/100 (${signal.trustLevel?.toUpperCase()})`
        : '',
      typeof signal.quorumSatisfied === 'boolean'
        ? `- Independent providers met quorum: ${signal.quorumSatisfied ? 'yes' : 'no'}`
        : '',
      signal.avgReputation !== null
        ? `- Provider reputation: avg ${signal.avgReputation} / min ${signal.minReputation ?? 'n/a'} (0-100)`
        : '',
      '',
      '**Providers:**',
      ...signal.providers.map((p) => {
        const deviation =
          p.deviationPct !== null ? ` deviation ${formatPercent(p.deviationPct)}` : '';
        const flags = [
          p.isOutlier ? 'OUTLIER' : null,
          p.isStale ? 'STALE' : null,
          p.status !== 'success' ? `(${p.status})` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return `- ${p.provider.toUpperCase()}: ${flags || 'ok'}${deviation}`;
      }),
    ];

    return lines.filter(Boolean).join('\n');
  },
};
