import { chainNames } from '@/lib/constants';
import { getAllProtocolsWithDynamicData } from '@/lib/protocols/dynamicData';
import type { Blockchain } from '@/types/oracle';

import type { AffectedProtocol } from '../risk/types';

const affectedProtocolsCache = new Map<string, AffectedProtocol[]>();

export async function findAffectedWrappedAssetProtocols(
  symbol: string
): Promise<AffectedProtocol[]> {
  const cached = affectedProtocolsCache.get(symbol);
  if (cached) return cached;

  const protocols = await getAllProtocolsWithDynamicData();
  const results: AffectedProtocol[] = [];

  for (const protocol of protocols) {
    // Skip DEX-type protocols: they don't have borrow/liquidation mechanics.
    if (protocol.protocolType !== 'lending') continue;

    const asset = protocol.assets.find((a) => a.symbol === symbol);
    if (!asset) continue;

    const ltPercent = (1 / asset.liquidationThreshold) * 100;
    const chainName = chainNames[protocol.chain as Blockchain] ?? protocol.chain;

    // Wrapped asset risk is primarily on the collateral side: discount to underlying erodes HF
    results.push({
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      assetRole: 'collateral',
      liquidationThreshold: asset.liquidationThreshold,
      tvlUsd: protocol.tvlUsd,
      impactDirection: 'collateral-down',
      riskSummary: `${protocol.name} on ${chainName} accepts ${symbol} as collateral (LT ${ltPercent.toFixed(0)}%). If ${symbol} trades at a discount to its underlying asset, the Health Factor of positions collateralized by ${symbol} will decline.`,
    });
  }

  affectedProtocolsCache.set(symbol, results);
  return results;
}
