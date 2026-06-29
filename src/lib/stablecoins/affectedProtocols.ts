import { chainNames } from '@/lib/constants';
import { PROTOCOL_REGISTRY } from '@/lib/protocols/protocolRegistry';
import type { Blockchain } from '@/types/oracle';

import type { StablecoinSymbol } from './config';
import type { AffectedProtocol } from '../risk/types';

export function findAffectedStablecoinProtocols(symbol: StablecoinSymbol): AffectedProtocol[] {
  const results: AffectedProtocol[] = [];

  for (const protocol of PROTOCOL_REGISTRY) {
    const asset = protocol.assets.find((a) => a.symbol === symbol);
    if (!asset) continue;

    const ltPercent = (1 / asset.liquidationThreshold) * 100;
    const chainName = chainNames[protocol.chain as Blockchain] ?? protocol.chain;

    // Stablecoin as collateral: depreciation erodes position safety buffer
    results.push({
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      assetRole: 'collateral',
      liquidationThreshold: asset.liquidationThreshold,
      tvlUsd: protocol.tvlUsd,
      impactDirection: 'collateral-down',
      riskSummary: `${protocol.name} on ${chainName} accepts ${symbol} as collateral (LT ${ltPercent.toFixed(0)}%). A depreciation of ${symbol} reduces the Health Factor of positions using it as collateral.`,
    });

    // Stablecoin as borrow asset: appreciation increases debt face value
    results.push({
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      assetRole: 'borrow',
      liquidationThreshold: asset.liquidationThreshold,
      tvlUsd: protocol.tvlUsd,
      impactDirection: 'borrow-up',
      riskSummary: `${protocol.name} on ${chainName} supports borrowing ${symbol} (LT ${ltPercent.toFixed(0)}%). An appreciation of ${symbol} makes debt denominated in ${symbol} more likely to trigger liquidation.`,
    });
  }

  return results;
}
