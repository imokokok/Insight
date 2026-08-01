/**
 * @fileoverview Protocol risk parameters API service
 * Maps enriched protocol configs (static registry + dynamic DB overrides)
 * into API response shapes for /api/v1/protocols/*risk-params endpoints.
 */

import {
  getAllProtocolsWithDynamicData,
  getProtocolByIdWithDynamicData,
  type EnrichedProtocolConfig,
} from '@/lib/protocols/dynamicData';
import type { ProtocolAssetConfig } from '@/lib/protocols/protocolRegistry';

interface ProtocolAssetRiskParam {
  symbol: string;
  liquidationThreshold: number;
  maxLtv: number;
  collateralFactor: number;
  exchangeRate: number;
  source: 'on-chain' | 'registry';
  fetchedAt: string | null;
}

interface ProtocolRiskParamsResponse {
  protocolId: string;
  protocolName: string;
  chain: string;
  protocolType: 'lending' | 'dex';
  assetCount: number;
  fetchedAt: string | null;
  assets: ProtocolAssetRiskParam[];
}

function mapAssetToRiskParam(
  asset: ProtocolAssetConfig,
  enriched: EnrichedProtocolConfig,
  fetchedAt: string | null
): ProtocolAssetRiskParam {
  const dynamicAsset = enriched.dynamicData?.assets[asset.symbol];
  const hasDynamicOverride =
    dynamicAsset != null &&
    (dynamicAsset.liquidationThreshold != null ||
      dynamicAsset.maxLtv != null ||
      dynamicAsset.collateralFactor != null ||
      dynamicAsset.exchangeRate != null);

  return {
    symbol: asset.symbol,
    liquidationThreshold: asset.liquidationThreshold,
    maxLtv: asset.maxLtv,
    collateralFactor: asset.collateralFactor,
    exchangeRate: asset.exchangeRate,
    source: hasDynamicOverride ? 'on-chain' : 'registry',
    fetchedAt,
  };
}

function mapProtocolToResponse(enriched: EnrichedProtocolConfig): ProtocolRiskParamsResponse {
  const fetchedAt = enriched.dynamicData?.riskParamsFetchedAt ?? null;

  return {
    protocolId: enriched.id,
    protocolName: enriched.name,
    chain: enriched.chain,
    protocolType: enriched.protocolType,
    assetCount: enriched.assets.length,
    fetchedAt,
    assets: enriched.assets.map((asset) => mapAssetToRiskParam(asset, enriched, fetchedAt)),
  };
}

export async function getProtocolRiskParamsById(
  id: string
): Promise<ProtocolRiskParamsResponse | null> {
  const enriched = await getProtocolByIdWithDynamicData(id);
  if (!enriched) return null;
  return mapProtocolToResponse(enriched);
}

export async function getAllProtocolRiskParams(): Promise<ProtocolRiskParamsResponse[]> {
  const allEnriched = await getAllProtocolsWithDynamicData();
  return allEnriched
    .filter((protocol) => protocol.protocolType === 'lending')
    .map(mapProtocolToResponse);
}
