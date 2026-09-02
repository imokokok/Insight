import { type NextRequest, NextResponse } from 'next/server';

import {
  createApiHandler,
  createOptionsHandler,
  ApiResponseBuilder,
  V1_PROTOCOL_TIER_MIDDLEWARES,
} from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { reputationService } from '@/lib/oracles/services/reputationService';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { getProtocolByIdWithDynamicData } from '@/lib/protocols/dynamicData';
import { roundTo } from '@/lib/utils/format';
import { type OracleProvider } from '@/types/oracle';

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const protocolId = context.validated?.params?.id;
    if (!protocolId) {
      return NextResponse.json(
        ApiResponseBuilder.error('VALIDATION_ERROR', 'Protocol ID is required', {
          requestId: context.requestId,
        }),
        { status: 400 }
      );
    }

    const protocol = await getProtocolByIdWithDynamicData(protocolId);
    if (!protocol) {
      return NextResponse.json(
        ApiResponseBuilder.error('NOT_FOUND', `Protocol not found: ${protocolId}`, {
          requestId: context.requestId,
        }),
        { status: 404 }
      );
    }

    // Only lending protocols have meaningful oracle exposure
    if (protocol.protocolType !== 'lending') {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_PROTOCOL_TYPE',
          `Oracle exposure analysis is only available for lending protocols. ${protocol.name} is a ${protocol.protocolType} protocol.`,
          { requestId: context.requestId }
        ),
        { status: 400 }
      );
    }

    // Build per-provider exposure map
    const providerAssetMap = new Map<OracleProvider, { symbols: string[]; tvlShare: number }>();
    const totalAssets = protocol.assets.length;

    for (const asset of protocol.assets) {
      const existing = providerAssetMap.get(asset.oracleProvider);
      if (existing) {
        existing.symbols.push(asset.symbol);
        existing.tvlShare += 1 / totalAssets;
      } else {
        providerAssetMap.set(asset.oracleProvider, {
          symbols: [asset.symbol],
          tvlShare: 1 / totalAssets,
        });
      }
    }

    // Fetch reputation data for each provider
    const providerExposures = await Promise.all(
      Array.from(providerAssetMap.entries()).map(async ([provider, exposure]) => {
        let reputation: Awaited<ReturnType<typeof reputationService.getReputation>> = null;
        try {
          reputation = await reputationService.getReputation(provider);
        } catch {
          // Skip unavailable reputation data
        }

        // Get feed count for this provider
        const feedsByProvider = await getAllActiveFeedsByProvider();
        const providerFeeds = feedsByProvider.get(provider) ?? [];
        const relevantFeeds = providerFeeds.filter((f) => exposure.symbols.includes(f.symbol));

        return {
          provider,
          assetCount: exposure.symbols.length,
          assets: exposure.symbols,
          assetShare: roundTo(exposure.tvlShare * 100, 1),
          feedCount: relevantFeeds.length,
          overallScore: reputation?.overall_score ?? null,
          freshnessScore: reputation?.freshness_score ?? null,
          reliabilityScore: reputation?.reliability_score ?? null,
          uptimePercentage: reputation?.uptime_percentage ?? null,
          avgDeviationPct: reputation?.avg_deviation_pct ?? null,
        };
      })
    );

    // Calculate concentration risk
    const providerCount = providerExposures.length;
    const singleProviderRisk = providerCount === 1;
    const dominantProvider = providerExposures.reduce(
      (max, p) => (p.assetShare > max.assetShare ? p : max),
      providerExposures[0]
    );
    const concentrationRatio = dominantProvider?.assetShare ?? 0;

    let concentrationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (concentrationRatio >= 80) concentrationLevel = 'critical';
    else if (concentrationRatio >= 60) concentrationLevel = 'high';
    else if (concentrationRatio >= 40) concentrationLevel = 'medium';

    const payload = {
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      protocolType: protocol.protocolType,
      totalAssets,
      oracleProviders: providerCount,
      isSingleOracleProvider: singleProviderRisk,
      concentrationRisk: {
        level: concentrationLevel,
        dominantProvider: dominantProvider?.provider ?? null,
        dominantProviderAssetShare: dominantProvider?.assetShare ?? 0,
        description: singleProviderRisk
          ? `All ${totalAssets} assets rely on a single oracle provider (${dominantProvider?.provider}). A failure of this provider would leave the protocol without any price data.`
          : `${providerCount} oracle providers cover ${totalAssets} assets. ${dominantProvider?.provider} covers ${dominantProvider?.assetShare}% of assets.`,
      },
      exposures: providerExposures,
    };

    return createCachedJsonResponse(
      ApiResponseBuilder.success(payload, { requestId: context.requestId }),
      { preset: 'semiStatic' }
    );
  },
  {
    // C2 deep-analysis endpoint (credit-metered)
    middlewares: V1_PROTOCOL_TIER_MIDDLEWARES,
  }
);
