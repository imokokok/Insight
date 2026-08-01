import { createServiceRoleClient } from '@/lib/supabase/server';
import { TTLCache } from '@/lib/utils/cache';
import { createLogger } from '@/lib/utils/logger';

import {
  PROTOCOL_REGISTRY,
  type ProtocolAssetConfig,
  type ProtocolConfig,
} from './protocolRegistry';

const logger = createLogger('protocol-dynamic-data');

// 服务端缓存：动态数据由 cron 每 4-6 小时更新，2 分钟 TTL 可有效吸收并发请求
const DYNAMIC_DATA_CACHE_TTL_MS = 2 * 60 * 1000;
const dynamicDataCache = new TTLCache({ cleanupIntervalMs: 60_000 });

interface ProtocolMetricsRow {
  protocol_id: string;
  tvl_usd: number | null;
  fetched_at: string;
}

interface ProtocolAssetRiskParamsRow {
  protocol_id: string;
  asset_symbol: string;
  liquidation_threshold: number | null;
  max_ltv: number | null;
  collateral_factor: number | null;
  exchange_rate: number | null;
  fetched_at: string;
}

export interface DynamicProtocolData {
  tvlUsd?: number;
  assets: Partial<Record<string, Partial<ProtocolAssetConfig>>>;
  metricsFetchedAt?: string;
  riskParamsFetchedAt?: string;
}

export interface EnrichedProtocolConfig extends ProtocolConfig {
  dynamicData?: DynamicProtocolData;
}

async function fetchLatestMetrics(
  protocolIds: string[]
): Promise<Record<string, ProtocolMetricsRow>> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('protocol_metrics')
    .select('protocol_id, tvl_usd, fetched_at')
    .in('protocol_id', protocolIds);

  if (error) {
    logger.error('Failed to fetch protocol metrics', error);
    return {};
  }

  const result: Record<string, ProtocolMetricsRow> = {};
  for (const row of (data ?? []) as ProtocolMetricsRow[]) {
    result[row.protocol_id] = row;
  }
  return result;
}

async function fetchLatestRiskParams(
  protocolIds: string[]
): Promise<Record<string, Record<string, ProtocolAssetRiskParamsRow>>> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('protocol_asset_risk_params')
    .select(
      'protocol_id, asset_symbol, liquidation_threshold, max_ltv, collateral_factor, exchange_rate, fetched_at'
    )
    .in('protocol_id', protocolIds);

  if (error) {
    logger.error('Failed to fetch protocol risk params', error);
    return {};
  }

  const result: Record<string, Record<string, ProtocolAssetRiskParamsRow>> = {};
  for (const row of (data ?? []) as ProtocolAssetRiskParamsRow[]) {
    const byProtocol = (result[row.protocol_id] ??= {});
    byProtocol[row.asset_symbol] = row;
  }
  return result;
}

async function getDynamicDataForProtocols(
  protocolIds: string[]
): Promise<Record<string, DynamicProtocolData>> {
  if (protocolIds.length === 0) return {};

  // 尝试从缓存获取
  const cacheKey = protocolIds.sort().join(',');
  const cached = dynamicDataCache.get<Record<string, DynamicProtocolData>>(cacheKey);
  if (cached) return cached;

  const [metricsByProtocol, riskParamsByProtocol] = await Promise.all([
    fetchLatestMetrics(protocolIds),
    fetchLatestRiskParams(protocolIds),
  ]);

  const result: Record<string, DynamicProtocolData> = {};

  for (const protocolId of protocolIds) {
    const metrics = metricsByProtocol[protocolId];
    const riskParams = riskParamsByProtocol[protocolId];

    const dynamicData: DynamicProtocolData = {
      assets: {},
    };

    if (metrics && metrics.tvl_usd != null && metrics.tvl_usd > 0) {
      dynamicData.tvlUsd = Number(metrics.tvl_usd);
      dynamicData.metricsFetchedAt = metrics.fetched_at;
    }

    if (riskParams && Object.keys(riskParams).length > 0) {
      for (const [symbol, row] of Object.entries(riskParams)) {
        dynamicData.assets[symbol] = {
          liquidationThreshold:
            row.liquidation_threshold != null ? Number(row.liquidation_threshold) : undefined,
          maxLtv: row.max_ltv != null ? Number(row.max_ltv) : undefined,
          collateralFactor:
            row.collateral_factor != null ? Number(row.collateral_factor) : undefined,
          exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : undefined,
        };
      }
      dynamicData.riskParamsFetchedAt = Object.values(riskParams)[0]?.fetched_at;
    }

    result[protocolId] = dynamicData;
  }

  // 写入缓存
  dynamicDataCache.set(cacheKey, result, DYNAMIC_DATA_CACHE_TTL_MS);
  return result;
}

async function getDynamicDataForProtocol(protocolId: string): Promise<DynamicProtocolData> {
  const data = await getDynamicDataForProtocols([protocolId]);
  return (
    data[protocolId] ?? {
      assets: {},
    }
  );
}

/**
 * Merge static registry config with the latest dynamic data from the database.
 * Dynamic values only override static values when they are present and valid.
 */
export async function getProtocolByIdWithDynamicData(
  id: string
): Promise<EnrichedProtocolConfig | undefined> {
  const protocol = PROTOCOL_REGISTRY.find((p) => p.id === id);
  if (!protocol) return undefined;

  const dynamicData = await getDynamicDataForProtocol(id);
  return mergeDynamicData(protocol, dynamicData);
}

function mergeDynamicData(
  protocol: ProtocolConfig,
  dynamicData: DynamicProtocolData
): EnrichedProtocolConfig {
  const enriched: EnrichedProtocolConfig = {
    ...protocol,
    tvlUsd: dynamicData.tvlUsd ?? protocol.tvlUsd,
    dynamicData,
    assets: protocol.assets.map((asset) => {
      const overrides = dynamicData.assets[asset.symbol];
      if (!overrides) return asset;
      return {
        ...asset,
        liquidationThreshold:
          overrides.liquidationThreshold && overrides.liquidationThreshold > 0
            ? overrides.liquidationThreshold
            : asset.liquidationThreshold,
        maxLtv: overrides.maxLtv && overrides.maxLtv > 0 ? overrides.maxLtv : asset.maxLtv,
        collateralFactor:
          overrides.collateralFactor && overrides.collateralFactor > 0
            ? overrides.collateralFactor
            : asset.collateralFactor,
        exchangeRate:
          overrides.exchangeRate && overrides.exchangeRate > 0
            ? overrides.exchangeRate
            : asset.exchangeRate,
      };
    }),
  };
  return enriched;
}

/**
 * Return all protocols enriched with the latest dynamic data.
 * Useful for cron jobs and reports that want a consistent snapshot.
 */
export async function getAllProtocolsWithDynamicData(): Promise<EnrichedProtocolConfig[]> {
  const protocolIds = PROTOCOL_REGISTRY.map((p) => p.id);
  const dynamicDataByProtocol = await getDynamicDataForProtocols(protocolIds);

  return PROTOCOL_REGISTRY.map((protocol) =>
    mergeDynamicData(protocol, dynamicDataByProtocol[protocol.id] ?? { assets: {} })
  );
}
