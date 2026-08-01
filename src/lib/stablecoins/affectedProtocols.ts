import { chainNames } from '@/lib/constants';
import { getAllProtocolsWithDynamicData } from '@/lib/protocols/dynamicData';
import type { Blockchain } from '@/types/oracle';

import type { StablecoinSymbol } from './config';
import type { AffectedProtocol } from '../risk/types';

const affectedProtocolsCache = new Map<string, AffectedProtocol[]>();

export async function findAffectedStablecoinProtocols(
  symbol: StablecoinSymbol,
  oracleMarketDivergence: number = 0
): Promise<AffectedProtocol[]> {
  const cacheKey = symbol;
  const cached = affectedProtocolsCache.get(cacheKey);
  if (cached) return cached;

  const protocols = await getAllProtocolsWithDynamicData();
  const results: AffectedProtocol[] = [];

  for (const protocol of protocols) {
    // Skip DEX-type protocols: they don't have borrow/liquidation mechanics,
    // so stablecoin depeg doesn't create liquidation risk for positions.
    if (protocol.protocolType !== 'lending') continue;

    const asset = protocol.assets.find((a) => a.symbol === symbol);
    if (!asset) continue;

    const ltPercent = (1 / asset.liquidationThreshold) * 100;
    const chainName = chainNames[protocol.chain as Blockchain] ?? protocol.chain;

    // Build estimated impact based on oracle-market divergence
    let estimatedImpact: string | undefined;
    if (Math.abs(oracleMarketDivergence) >= 0.2) {
      const absDiv = Math.abs(oracleMarketDivergence).toFixed(2);
      if (oracleMarketDivergence > 0) {
        estimatedImpact = `Oracle reports ${absDiv}% above market; positions using ${symbol} as collateral have less safety buffer than the protocol displays`;
      } else {
        estimatedImpact = `Oracle reports ${absDiv}% below market; debt denominated in ${symbol} may be overvalued`;
      }
    }

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
      oracleMarketDivergence: oracleMarketDivergence !== 0 ? oracleMarketDivergence : undefined,
      estimatedImpact,
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
      oracleMarketDivergence: oracleMarketDivergence !== 0 ? oracleMarketDivergence : undefined,
      estimatedImpact,
    });
  }

  affectedProtocolsCache.set(cacheKey, results);
  return results;
}
