import { chainNames } from '@/lib/constants';
import { PROTOCOL_REGISTRY } from '@/lib/protocols/protocolRegistry';
import type { Blockchain } from '@/types/oracle';

import type { AffectedProtocol } from '../risk/types';

export function findAffectedWrappedAssetProtocols(symbol: string): AffectedProtocol[] {
  const results: AffectedProtocol[] = [];

  for (const protocol of PROTOCOL_REGISTRY) {
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

  return results;
}
