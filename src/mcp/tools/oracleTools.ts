import type { ConsensusMethod } from '@/lib/analytics/consensusPrice';
import { handleGetPrice } from '@/lib/api/oracleHandlers';
import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getDaysAgoUtc, getTodayUtc, startOfDayUtc, endOfDayExclusiveUtc } from '@/lib/utils/date';
import { type Blockchain, type OracleProvider } from '@/types/oracle';

import { formatAsText, formatPercent, formatPrice, formatTimestamp } from './formatters';
import {
  ConsensusPriceInputSchema,
  DateQueryInputSchema,
  DeviationInputSchema,
  OraclePriceInputSchema,
} from './schemas';

import type { McpToolDefinition } from './types';

export const getOraclePriceTool: McpToolDefinition<typeof OraclePriceInputSchema> = {
  name: 'get_oracle_price',
  description: 'Fetch the latest price from a specific oracle provider for an asset.',
  parameters: OraclePriceInputSchema,
  handler: async (args) => {
    const response = await handleGetPrice(
      {
        provider: args.provider as OracleProvider,
        symbol: args.symbol,
        chain: args.chain as Blockchain | undefined,
        forceRefresh: args.forceRefresh,
      },
      `mcp_${Date.now()}`
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch oracle price');
    }

    const price = data.data;
    return [
      `**${price.provider.toUpperCase()} price for ${price.symbol}**`,
      `- Price: $${formatPrice(price.price)}`,
      price.chain ? `- Chain: ${price.chain}` : '',
      `- Timestamp: ${formatTimestamp(price.timestamp)}`,
      price.confidence !== undefined && price.confidence !== null
        ? `- Confidence: ${(price.confidence * 100).toFixed(2)}%`
        : '',
      price.dataAgeSeconds !== undefined && price.dataAgeSeconds !== null
        ? `- Data age: ${price.dataAgeSeconds}s`
        : '',
      price.source ? `- Source: ${price.source}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  },
};

export const getConsensusPriceTool: McpToolDefinition<typeof ConsensusPriceInputSchema> = {
  name: 'get_consensus_price',
  description:
    'Get the aggregated consensus price for an asset across multiple oracle providers. Useful when you need a robust, manipulation-resistant reference price.',
  parameters: ConsensusPriceInputSchema,
  handler: async (args) => {
    const result = await getConsensusPrice(
      args.symbol,
      args.chain,
      args.method as ConsensusMethod | undefined
    );

    const lines = [
      `**Consensus price for ${result.symbol}**`,
      `- Consensus price: $${formatPrice(result.consensusPrice)}`,
      result.chain ? `- Chain: ${result.chain}` : '',
      `- Method: ${result.method}`,
      `- Confidence: ${(result.confidence * 100).toFixed(2)}% (${result.confidenceLevel})`,
      `- Agreement: ${(result.agreement * 100).toFixed(2)}%`,
      `- Participants: ${result.participantCount} (${result.excludedCount} excluded)`,
      `- Price range: $${formatPrice(result.priceRange.min)} - $${formatPrice(result.priceRange.max)}`,
      result.recommendedProvider
        ? `- Recommended provider: ${result.recommendedProvider.toUpperCase()}`
        : '',
      '',
      '**Provider prices:**',
    ];

    for (const provider of result.providers) {
      const status =
        provider.status === 'success'
          ? `$${formatPrice(provider.price)} ${provider.isOutlier ? '(OUTLIER)' : ''}`
          : `(${provider.status}${provider.errorMessage ? `: ${provider.errorMessage}` : ''})`;
      lines.push(
        `- ${provider.provider.toUpperCase()}: ${status}${provider.deviationPct !== null ? ` deviation ${formatPercent(provider.deviationPct)}` : ''}`
      );
    }

    return lines.filter(Boolean).join('\n');
  },
};

export const compareOracleDeviationTool: McpToolDefinition<typeof DeviationInputSchema> = {
  name: 'compare_oracle_deviation',
  description:
    'Compare historical price deviations across oracle providers for an asset. Helps identify which providers consistently diverge from consensus.',
  parameters: DeviationInputSchema,
  handler: async (args) => {
    const resolvedFrom = args.from ?? getDaysAgoUtc(7);
    const resolvedTo = args.to ?? getTodayUtc();

    const fromAt = startOfDayUtc(resolvedFrom);
    const toEndAtIso = endOfDayExclusiveUtc(resolvedTo);

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('hourly_price_snapshots')
      .select(
        'snapshot_hour, provider, price, consensus_price, deviation_pct, latency_ms, is_success'
      )
      .eq('symbol', args.symbol)
      .gte('snapshot_hour', fromAt)
      .lt('snapshot_hour', toEndAtIso)
      .order('snapshot_hour', { ascending: true });

    if (error) {
      throw new Error(`Failed to load deviation data: ${error.message}`);
    }

    const rows = data ?? [];

    if (rows.length === 0) {
      return `No deviation data available for ${args.symbol} between ${resolvedFrom} and ${resolvedTo}.`;
    }

    const providerAggMap = new Map<
      string,
      {
        snapshots: number;
        successes: number;
        deviations: number[];
        maxDeviation: number;
        latencies: number[];
      }
    >();

    for (const row of rows) {
      let agg = providerAggMap.get(row.provider);
      if (!agg) {
        agg = { snapshots: 0, successes: 0, deviations: [], maxDeviation: 0, latencies: [] };
        providerAggMap.set(row.provider, agg);
      }
      agg.snapshots++;
      if (row.deviation_pct != null) {
        const absDev = Math.abs(row.deviation_pct);
        agg.deviations.push(absDev);
        agg.maxDeviation = Math.max(agg.maxDeviation, absDev);
      }
      if (row.latency_ms != null) {
        agg.latencies.push(row.latency_ms);
      }
      if (row.is_success) {
        agg.successes++;
      }
    }

    const providers = Array.from(providerAggMap.entries()).map(([provider, agg]) => ({
      provider,
      snapshots: agg.snapshots,
      avgDeviationPct:
        agg.deviations.length > 0
          ? agg.deviations.reduce((a, b) => a + b, 0) / agg.deviations.length
          : 0,
      maxDeviationPct: agg.maxDeviation,
      avgLatencyMs:
        agg.latencies.length > 0
          ? Math.round(agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length)
          : 0,
      successRate: agg.snapshots > 0 ? (agg.successes / agg.snapshots) * 100 : 0,
    }));

    providers.sort((a, b) => a.avgDeviationPct - b.avgDeviationPct);

    const lines = [
      `**Oracle deviation comparison for ${args.symbol}**`,
      `- Period: ${resolvedFrom} to ${resolvedTo}`,
      `- Interval: ${args.interval}`,
      `- Total snapshots: ${rows.length}`,
      '',
      '**Provider ranking (by average deviation):**',
    ];

    for (const p of providers) {
      lines.push(
        `- ${p.provider.toUpperCase()}: avg dev ${formatPercent(p.avgDeviationPct)}, max dev ${formatPercent(p.maxDeviationPct)}, success ${p.successRate.toFixed(1)}%, latency ${p.avgLatencyMs}ms (${p.snapshots} snapshots)`
      );
    }

    return lines.join('\n');
  },
};

export const getOracleHealthTool: McpToolDefinition<typeof DateQueryInputSchema> = {
  name: 'get_oracle_health',
  description:
    'Get the ecosystem-wide oracle health report for a specific date (uptime, staleness, and success rates across all providers). Use this for a dated snapshot of overall health. For a single feed by UUID use get_feed_health; to scan current freshness across many feeds use get_feed_freshness.',
  parameters: DateQueryInputSchema,
  handler: async (args) => {
    const { getOracleHealthReport } = await import('@/lib/oracles/services/oracleHealthService');
    const date = args.date ?? getTodayUtc();
    const report = await getOracleHealthReport(date);

    if (!report) {
      return `No oracle health data available for ${date}.`;
    }

    return formatAsText(report);
  },
};
