import { getOracleWatchHistory } from '@/lib/api/services/oracleWatchTrendService';
import type { OracleWatchInterval } from '@/lib/api/services/oracleWatchTrendService';
import {
  HISTORY_UNIVERSE_NOTE,
  hasAnyHistoryCoverage,
  isInHistoryUniverse,
} from '@/lib/reports/oracleWatchUniverse';

import { formatPercent } from './formatters';
import { OracleWatchHistoryInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

/**
 * How many trailing points to spell out. A full 7d hourly series is 168 lines
 * of context an agent will not read; the summary carries the trend, and the
 * tail carries the shape of the last few hours.
 */
const MAX_POINTS_SHOWN = 8;

/** `2026-08-29T14:00:00.000Z` → `08-29 14:00Z`. */
function shortStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(5, 16).replace('T', ' ')}Z`;
}

/**
 * Retrospective Oracle Watch trend.
 *
 * `oracle_watch` answers "can I depend on this feed right now" — a point
 * signal. This answers "has it been dependable", which is what a strategy
 * deciding whether to trust a feed over hours or days actually needs. Without
 * it an agent had to call the REST endpoint separately and stitch the two
 * together itself.
 */
export const oracleWatchHistoryTool: McpToolDefinition<typeof OracleWatchHistoryInputSchema> = {
  name: 'oracle_watch_history',
  description:
    'Retrospective Oracle Watch trend for an asset: verdict stability, degraded-time ratio, worst deviation and mean credibility over the last N days, plus the recent series. Use it to judge whether a feed has been dependable, not just whether it is healthy this instant. History is guaranteed only for the committed universe (ETH/BTC/USDC/USDT x ethereum/arbitrum/base); other pairs return a live point signal from oracle_watch but no curve.',
  parameters: OracleWatchHistoryInputSchema,
  handler: async (args) => {
    const result = await getOracleWatchHistory({
      symbol: args.symbol,
      chain: args.chain,
      days: args.days,
      interval: args.interval as OracleWatchInterval | undefined,
    });

    const label = `${result.symbol}${result.chain ? ` on ${result.chain}` : ' (global)'}`;
    const { summary } = result;

    // An empty series is the dangerous answer: it reads as "no incidents" when
    // it may mean "we never collect this pair". Say which it is.
    if (result.series.length === 0) {
      const inUniverse = isInHistoryUniverse(result.symbol, result.chain);
      const lines = [
        `**Oracle Watch history: ${label}** (last ${result.days}d)`,
        '- No history in this window.',
      ];
      if (inUniverse) {
        lines.push(
          '- This pair IS inside the committed history universe, so an empty series means the collector has not written yet or is failing — treat it as UNKNOWN, not as healthy.',
          '- Check /ops or re-run later; a cold spine says nothing about the feed.'
        );
      } else {
        lines.push(
          `- This pair is OUTSIDE the committed history universe. ${HISTORY_UNIVERSE_NOTE}`,
          hasAnyHistoryCoverage(result.symbol)
            ? `- ${result.symbol} IS covered on other chains — try passing one of them as \`chain\`.`
            : `- ${result.symbol} has no per-chain history at all; only the global point signal is available.`
        );
      }
      lines.push('- Use `oracle_watch` for the live point signal, which is unaffected.');
      return lines.join('\n');
    }

    const tail = result.series.slice(-MAX_POINTS_SHOWN);

    const lines = [
      `**Oracle Watch history: ${label}** (last ${result.days}d, ${result.grain} grain, ${summary.pointCount} points)`,
      `- Current verdict: ${(summary.currentVerdict ?? 'n/a').toUpperCase()}`,
      `- Stability: ${summary.stabilityScore}/100 (share of the window rated NORMAL)`,
      `- Time degraded: ${(summary.degradedRatio * 100).toFixed(1)}%`,
      `- Verdict split: ${summary.normal} normal / ${summary.caution} caution / ${summary.danger} danger`,
      `- Avg cross-oracle agreement: ${(summary.avgAgreement * 100).toFixed(2)}%`,
      summary.maxDeviationPct !== null
        ? `- Worst deviation: ${formatPercent(summary.maxDeviationPct)}`
        : '',
      summary.trustScore !== null
        ? `- Mean credibility: ${summary.trustScore}/100 (${(summary.trustLevel ?? 'n/a').toUpperCase()})`
        : '',
      // A stale spine is a monitoring failure, not a feed verdict. An agent must
      // not read "no recent DANGER" off a collector that stopped writing.
      summary.spineStale
        ? `- WARNING: collection is STALE (last point ${summary.lastCollectedAt ?? 'unknown'}) — the trend below is incomplete and must not be treated as "quiet".`
        : `- Last collected: ${summary.lastCollectedAt ?? 'unknown'}`,
      '',
      `**Recent (last ${tail.length} points):**`,
      ...tail.map((p) => {
        const dev = p.maxDeviationPct !== null ? ` dev ${formatPercent(p.maxDeviationPct)}` : '';
        const trust = p.trustScore !== null ? ` trust ${p.trustScore}` : '';
        return `- ${shortStamp(p.evaluatedAt)}: ${p.verdict.toUpperCase()}${dev}${trust}`;
      }),
    ];

    return lines.filter(Boolean).join('\n');
  },
};
