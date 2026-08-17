import { reputationService } from '@/lib/oracles/services/reputationService';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import {
  getProtocolByIdWithDynamicData,
  getAllProtocolsWithDynamicData,
} from '@/lib/protocols/dynamicData';
import { roundTo } from '@/lib/utils/format';
import { type OracleProvider } from '@/types/oracle';

import { ProtocolOracleExposureInputSchema, ProtocolsInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getProtocolsTool: McpToolDefinition<typeof ProtocolsInputSchema> = {
  name: 'get_protocols',
  description:
    'Get a list of lending protocols with dynamic data (TVL, asset counts, oracle providers used). Optionally filter by name/slug query.',
  parameters: ProtocolsInputSchema,
  handler: async (args) => {
    const protocols = await getAllProtocolsWithDynamicData();
    const lendingProtocols = protocols.filter((p) => p.protocolType === 'lending');

    let filtered = lendingProtocols;
    if (args.query) {
      const q = args.query.toLowerCase();
      filtered = lendingProtocols.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.chain.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      return args.query
        ? `No lending protocols match "${args.query}".`
        : 'No lending protocols found.';
    }

    const lines = [
      `**Lending protocols${args.query ? ` matching "${args.query}"` : ''} (${filtered.length})**`,
      '',
    ];

    for (const p of filtered.slice(0, 20)) {
      const assetCount = p.assets.length;
      const oracleProviders = [...new Set(p.assets.map((a) => a.oracleProvider))];
      lines.push(
        `- ${p.name} (${p.id}) — chain: ${p.chain}, assets: ${assetCount}, oracle providers: ${oracleProviders.join(', ').toUpperCase()}`
      );
    }

    if (filtered.length > 20) {
      lines.push('', `... and ${filtered.length - 20} more.`);
    }

    return lines.join('\n');
  },
};

export const getProtocolOracleExposureTool: McpToolDefinition<
  typeof ProtocolOracleExposureInputSchema
> = {
  name: 'get_protocol_oracle_exposure',
  description:
    'Analyze oracle provider concentration risk for a specific lending protocol. Shows which providers cover which assets and concentration metrics.',
  parameters: ProtocolOracleExposureInputSchema,
  handler: async (args) => {
    const protocol = await getProtocolByIdWithDynamicData(args.protocol);

    if (!protocol) {
      return `Protocol "${args.protocol}" not found.`;
    }

    if (protocol.protocolType !== 'lending') {
      return `Oracle exposure analysis is only available for lending protocols. ${protocol.name} is a ${protocol.protocolType} protocol.`;
    }

    const providerAssetMap = new Map<OracleProvider, { symbols: string[]; share: number }>();
    const totalAssets = protocol.assets.length;

    for (const asset of protocol.assets) {
      const existing = providerAssetMap.get(asset.oracleProvider);
      if (existing) {
        existing.symbols.push(asset.symbol);
        existing.share += 1 / totalAssets;
      } else {
        providerAssetMap.set(asset.oracleProvider, {
          symbols: [asset.symbol],
          share: 1 / totalAssets,
        });
      }
    }

    const feedsByProvider = await getAllActiveFeedsByProvider();

    const exposures = await Promise.all(
      Array.from(providerAssetMap.entries()).map(async ([provider, exposure]) => {
        let reputation: Awaited<ReturnType<typeof reputationService.getReputation>> = null;
        try {
          reputation = await reputationService.getReputation(provider);
        } catch {
          // ignore
        }

        const providerFeeds = feedsByProvider.get(provider) ?? [];
        const relevantFeeds = providerFeeds.filter((f) =>
          exposure.symbols.includes((f as { symbol?: string }).symbol ?? '')
        );

        return {
          provider,
          assetCount: exposure.symbols.length,
          assets: exposure.symbols,
          assetShare: roundTo(exposure.share * 100, 1),
          feedCount: relevantFeeds.length,
          overallScore: reputation?.overall_score ?? null,
          freshnessScore: reputation?.freshness_score ?? null,
          reliabilityScore: reputation?.reliability_score ?? null,
          uptimePercentage: reputation?.uptime_percentage ?? null,
          avgDeviationPct: reputation?.avg_deviation_pct ?? null,
        };
      })
    );

    const dominantProvider = exposures.reduce(
      (max, p) => (p.assetShare > max.assetShare ? p : max),
      exposures[0]
    );
    const concentrationRatio = dominantProvider?.assetShare ?? 0;
    const singleProviderRisk = exposures.length === 1;

    let concentrationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (concentrationRatio >= 80) concentrationLevel = 'critical';
    else if (concentrationRatio >= 60) concentrationLevel = 'high';
    else if (concentrationRatio >= 40) concentrationLevel = 'medium';

    const lines = [
      `**Oracle exposure: ${protocol.name} (${protocol.id})**`,
      `- Chain: ${protocol.chain}`,
      `- Total assets: ${totalAssets}`,
      `- Oracle providers: ${exposures.length}`,
      `- Single provider risk: ${singleProviderRisk ? 'YES ⚠️' : 'No'}`,
      `- Concentration risk: ${concentrationLevel}`,
      `- Dominant provider: ${dominantProvider?.provider.toUpperCase() ?? 'N/A'} (${concentrationRatio}% of assets)`,
      '',
      '**Provider breakdown:**',
    ];

    for (const e of exposures.sort((a, b) => b.assetShare - a.assetShare)) {
      lines.push(
        `- ${e.provider.toUpperCase()}: ${e.assetCount} assets (${e.assetShare}%), ${e.feedCount} feeds, overall score ${e.overallScore ?? 'N/A'}`
      );
    }

    return lines.join('\n');
  },
};
