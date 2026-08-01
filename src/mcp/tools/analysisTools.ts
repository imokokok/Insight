import { getCorrelationAnalysis } from '@/lib/api/services/correlationService';
import { getLatencyStatistics } from '@/lib/api/services/latencyService';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { aggregateAnomalies } from '@/lib/reports/anomalyAggregation';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';
import { OracleProvider } from '@/types/oracle';

import { formatPercent } from './formatters';
import {
  AnomaliesInputSchema,
  CorrelationInputSchema,
  CoverageInputSchema,
  LatencyInputSchema,
  MetricsInputSchema,
} from './schemas';

import type { McpToolDefinition } from './types';

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export const getLatencyTool: McpToolDefinition<typeof LatencyInputSchema> = {
  name: 'get_latency',
  description:
    'Analyze oracle latency statistics (min, mean, p50, p90, p95, p99) over a date range, optionally filtered by provider or symbol.',
  parameters: LatencyInputSchema,
  handler: async (args) => {
    const fromOrDefault = args.from ?? get7dAgoUtc();
    const toOrDefault = args.to ?? getTodayUtc();

    const result = await getLatencyStatistics({
      from: fromOrDefault,
      to: toOrDefault,
      provider: args.provider,
      symbol: args.symbol,
    });

    if (result.entries.length === 0) {
      return `No latency data available for the requested filters between ${fromOrDefault} and ${toOrDefault}.`;
    }

    const overallSorted = result.entries
      .flatMap((e) => (e.mean != null ? [e.mean] : []))
      .sort((a, b) => a - b);

    const lines = [
      `**Oracle latency report (${fromOrDefault} to ${toOrDefault})**`,
      `- Entries: ${result.entries.length}`,
      overallSorted.length > 0
        ? `- Overall mean latency: p50 ${percentile(overallSorted, 50)}ms, p90 ${percentile(overallSorted, 90)}ms, p95 ${percentile(overallSorted, 95)}ms, p99 ${percentile(overallSorted, 99)}ms`
        : '',
      '',
      '**Provider-symbol breakdown:**',
    ];

    for (const e of result.entries.sort((a, b) => (a.mean ?? 0) - (b.mean ?? 0))) {
      lines.push(
        `- ${e.provider.toUpperCase()} ${e.symbol}: mean ${e.mean ?? 'N/A'}ms, p95 ${e.p95 ?? 'N/A'}ms, p99 ${e.p99 ?? 'N/A'}ms, success ${e.successRate.toFixed(1)}% (${e.sampleSize} samples)`
      );
    }

    return lines.filter(Boolean).join('\n');
  },
};

export const getAnomaliesTool: McpToolDefinition<typeof AnomaliesInputSchema> = {
  name: 'get_anomalies',
  description:
    'Get aggregated oracle anomaly events over a lookback period (1-30 days), including top deviation events and risk impacts.',
  parameters: AnomaliesInputSchema,
  handler: async (args) => {
    const aggregation = await aggregateAnomalies({ days: args.days });

    if (aggregation.reports.length === 0) {
      return `No reports available for the requested period.`;
    }

    const topEvents = aggregation.allEvents
      .sort((a, b) => Math.abs(Number(b.deviationPct)) - Math.abs(Number(a.deviationPct)))
      .slice(0, 10);

    const lines = [
      `**Oracle anomalies (${args.days}d)**`,
      `- Date range: ${aggregation.dateRange.start} to ${aggregation.dateRange.end}`,
      `- Total events: ${aggregation.totalEvents}`,
      `- By severity: critical ${aggregation.bySeverity.critical ?? 0}, high ${aggregation.bySeverity.high ?? 0}, medium ${aggregation.bySeverity.medium ?? 0}, low ${aggregation.bySeverity.low ?? 0}`,
      '',
      '**Top deviation events:**',
    ];

    for (const event of topEvents) {
      lines.push(
        `- ${event.reportDate} ${event.provider}/${event.symbol}: ${formatPercent(Number(event.deviationPct))}${event.severity ? ` (${event.severity})` : ''}`
      );
    }

    if (Object.keys(aggregation.byProvider).length > 0) {
      lines.push('', '**Events by provider:**');
      for (const [provider, count] of Object.entries(aggregation.byProvider).sort(
        (a, b) => b[1] - a[1]
      )) {
        lines.push(`- ${provider.toUpperCase()}: ${count}`);
      }
    }

    if (Object.keys(aggregation.byAsset).length > 0) {
      lines.push('', '**Events by asset:**');
      for (const [asset, count] of Object.entries(aggregation.byAsset).sort(
        (a, b) => b[1] - a[1]
      )) {
        lines.push(`- ${asset}: ${count}`);
      }
    }

    return lines.join('\n');
  },
};

export const getCorrelationTool: McpToolDefinition<typeof CorrelationInputSchema> = {
  name: 'get_correlation',
  description:
    'Compute pairwise Pearson correlation of oracle provider deviations for an asset over a date range. Helps identify independent vs correlated providers.',
  parameters: CorrelationInputSchema,
  handler: async (args) => {
    const fromOrDefault = args.from ?? get7dAgoUtc();
    const toOrDefault = args.to ?? getTodayUtc();

    const result = await getCorrelationAnalysis({
      symbol: args.symbol,
      from: fromOrDefault,
      to: toOrDefault,
    });

    if (result.providers.length < 2) {
      return `At least 2 providers with deviation data are required for correlation analysis. Found ${result.providers.length} for ${args.symbol}.`;
    }

    const lines = [
      `**Oracle deviation correlation for ${args.symbol}**`,
      `- Period: ${fromOrDefault} to ${toOrDefault}`,
      `- Data points: ${result.dataPoints}`,
      `- Providers: ${result.providers.join(', ').toUpperCase()}`,
      '',
      '**Pairwise correlations (strongest first):**',
    ];

    for (const pair of result.pairs) {
      lines.push(
        `- ${pair.provider1.toUpperCase()} ↔ ${pair.provider2.toUpperCase()}: r=${pair.correlation.toFixed(3)} — ${pair.interpretation}`
      );
    }

    return lines.join('\n');
  },
};

export const getCoverageTool: McpToolDefinition<typeof CoverageInputSchema> = {
  name: 'get_coverage',
  description:
    'Identify oracle coverage gaps and single-provider-risk symbols (assets served by only one oracle — a concentration risk). Returns breakdowns by provider, chain, and symbol. Use this when assessing where coverage is thin. For ecosystem scale plus top reputable providers, use get_metrics instead.',
  parameters: CoverageInputSchema,
  handler: async () => {
    const feedsByProvider = await getAllActiveFeedsByProvider();

    const chainMap = new Map<
      number,
      {
        chainId: number;
        providers: Set<string>;
        symbols: Set<string>;
        feedCount: number;
      }
    >();

    const providerMap = new Map<
      string,
      {
        provider: string;
        chains: Set<number>;
        symbols: Set<string>;
        feedCount: number;
      }
    >();

    const symbolMap = new Map<
      string,
      {
        symbol: string;
        providers: Set<string>;
        chains: Set<number>;
        feedCount: number;
      }
    >();

    for (const [provider, feeds] of feedsByProvider.entries()) {
      if (!providerMap.has(provider)) {
        providerMap.set(provider, {
          provider,
          chains: new Set(),
          symbols: new Set(),
          feedCount: 0,
        });
      }
      const pEntry = providerMap.get(provider)!;

      for (const feed of feeds) {
        pEntry.chains.add(feed.chain_id);
        pEntry.symbols.add(feed.symbol);
        pEntry.feedCount++;

        if (!chainMap.has(feed.chain_id)) {
          chainMap.set(feed.chain_id, {
            chainId: feed.chain_id,
            providers: new Set(),
            symbols: new Set(),
            feedCount: 0,
          });
        }
        const cEntry = chainMap.get(feed.chain_id)!;
        cEntry.providers.add(provider);
        cEntry.symbols.add(feed.symbol);
        cEntry.feedCount++;

        if (!symbolMap.has(feed.symbol)) {
          symbolMap.set(feed.symbol, {
            symbol: feed.symbol,
            providers: new Set(),
            chains: new Set(),
            feedCount: 0,
          });
        }
        const sEntry = symbolMap.get(feed.symbol)!;
        sEntry.providers.add(provider);
        sEntry.chains.add(feed.chain_id);
        sEntry.feedCount++;
      }
    }

    const byProvider = Array.from(providerMap.values())
      .sort((a, b) => b.feedCount - a.feedCount)
      .map((entry) => ({
        provider: entry.provider,
        feedCount: entry.feedCount,
        chainCount: entry.chains.size,
        symbolCount: entry.symbols.size,
      }));

    const singleProviderSymbols = Array.from(symbolMap.values())
      .filter((s) => s.providers.size === 1)
      .sort((a, b) => b.feedCount - a.feedCount)
      .map((s) => ({ symbol: s.symbol, provider: Array.from(s.providers)[0] }));

    const allFeeds = Array.from(feedsByProvider.values()).flat();

    const lines = [
      `**Oracle coverage map**`,
      `- Total feeds: ${allFeeds.length}`,
      `- Providers: ${feedsByProvider.size}`,
      `- Symbols: ${symbolMap.size}`,
      `- Chains: ${chainMap.size}`,
      `- Single-provider risk symbols: ${singleProviderSymbols.length}`,
      '',
      '**Top providers by feed count:**',
    ];

    for (const p of byProvider.slice(0, 10)) {
      lines.push(
        `- ${p.provider.toUpperCase()}: ${p.feedCount} feeds, ${p.symbolCount} symbols, ${p.chainCount} chains`
      );
    }

    if (singleProviderSymbols.length > 0) {
      lines.push('', '**Single-provider risk symbols:**');
      for (const s of singleProviderSymbols.slice(0, 15)) {
        lines.push(`- ${s.symbol}: ${s.provider.toUpperCase()}`);
      }
      if (singleProviderSymbols.length > 15) {
        lines.push('', `... and ${singleProviderSymbols.length - 15} more.`);
      }
    }

    return lines.join('\n');
  },
};

export const getMetricsTool: McpToolDefinition<typeof MetricsInputSchema> = {
  name: 'get_metrics',
  description:
    'Compact ecosystem overview: provider/feed/symbol/chain/category counts plus top providers ranked by reputation score. Use this for a quick scale snapshot or provider ranking. To find coverage gaps and single-provider risk, use get_coverage instead.',
  parameters: MetricsInputSchema,
  handler: async () => {
    const feedsByProvider = await getAllActiveFeedsByProvider();
    const allFeeds = Array.from(feedsByProvider.values()).flat();

    const activeFeeds = allFeeds.length;
    const symbols = new Set(allFeeds.map((f) => f.symbol)).size;
    const chains = new Set(allFeeds.map((f) => f.chain_id)).size;
    const categories = new Set(allFeeds.map((f) => f.category)).size;

    const reputations = await reputationService.getReputations();

    const lines = [
      `**Oracle ecosystem metrics**`,
      `- Providers: ${Object.values(OracleProvider).length}`,
      `- Active feeds: ${activeFeeds}`,
      `- Symbols covered: ${symbols}`,
      `- Chains covered: ${chains}`,
      `- Categories: ${categories}`,
      '',
      '**Top providers by reputation score:**',
    ];

    for (const r of reputations.slice(0, 5)) {
      lines.push(`- ${r.provider.toUpperCase()}: ${r.overall_score.toFixed(1)}`);
    }

    return lines.join('\n');
  },
};
