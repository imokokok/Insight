import { chainNames } from '@/lib/constants';
import { getAllProtocolsWithDynamicData } from '@/lib/protocols/dynamicData';
import { TTLCache } from '@/lib/utils/cache';
import type { Blockchain } from '@/types/oracle';

import type { AffectedProtocol } from './types';

const AFFECTED_PROTOCOLS_CACHE_TTL_MS = 2 * 60 * 1000;
const affectedProtocolsCache = new TTLCache({ maxSize: 128, cleanupIntervalMs: 0 });
const affectedProtocolsInFlight = new Map<string, Promise<CachedAffectedProtocol[]>>();

type CachedAffectedProtocol = Omit<
  AffectedProtocol,
  'riskSummary' | 'assetRole' | 'impactDirection'
> & {
  assetRole: 'collateral' | 'borrow';
  impactDirection: 'collateral-down' | 'borrow-up';
  chainName: string;
  ltPercent: number;
};

/** Test seam — clears bounded warm-instance entries and pending lookups. */
export function resetAffectedProtocolsCacheForTests(): void {
  affectedProtocolsCache.clear();
  affectedProtocolsInFlight.clear();
}

export interface FindAffectedProtocolsOptions {
  /** Emit a 'borrow' role entry alongside the 'collateral' entry (stablecoin-style). */
  includeBorrowRole?: boolean;
  /** Oracle-vs-market divergence (%) used to build the estimated-impact note. */
  oracleMarketDivergence?: number;
  /** Human-readable risk summary for a single (protocol, role) pair. */
  buildRiskSummary: (ctx: {
    symbol: string;
    protocolName: string;
    chainName: string;
    ltPercent: number;
    role: 'collateral' | 'borrow';
  }) => string;
}

/**
 * Single source of truth for "which lending protocols accept `symbol` as
 * collateral (and optionally as borrow), and what a peg break does to them".
 * Stablecoin and wrapped-asset monitors both call this with their own
 * `buildRiskSummary` text — the protocol-matching loop lives only here.
 */
export async function findAffectedProtocols(
  symbol: string,
  options: FindAffectedProtocolsOptions
): Promise<AffectedProtocol[]> {
  const { includeBorrowRole = false, oracleMarketDivergence = 0, buildRiskSummary } = options;

  const normalizedSymbol = symbol.toUpperCase();
  const normalizedDivergence = Number.isFinite(oracleMarketDivergence) ? oracleMarketDivergence : 0;
  const cacheKey = `${normalizedSymbol}:${includeBorrowRole ? 'cb' : 'c'}:${normalizedDivergence}`;
  let cached = affectedProtocolsCache.get<CachedAffectedProtocol[]>(cacheKey);
  if (!cached) {
    let request = affectedProtocolsInFlight.get(cacheKey);
    if (!request) {
      request = loadAffectedProtocols(normalizedSymbol, includeBorrowRole, normalizedDivergence);
      affectedProtocolsInFlight.set(cacheKey, request);
    }
    try {
      cached = await request;
      affectedProtocolsCache.set(cacheKey, cached, AFFECTED_PROTOCOLS_CACHE_TTL_MS);
    } finally {
      if (affectedProtocolsInFlight.get(cacheKey) === request) {
        affectedProtocolsInFlight.delete(cacheKey);
      }
    }
  }

  // The summary is caller-specific wording. Cache only the data-derived
  // template, then materialize the presentation string for every caller.
  return cached.map(({ chainName, ltPercent, ...protocol }) => ({
    ...protocol,
    riskSummary: buildRiskSummary({
      symbol: normalizedSymbol,
      protocolName: protocol.protocolName,
      chainName,
      ltPercent,
      role: protocol.assetRole,
    }),
  }));
}

async function loadAffectedProtocols(
  symbol: string,
  includeBorrowRole: boolean,
  oracleMarketDivergence: number
): Promise<CachedAffectedProtocol[]> {
  const protocols = await getAllProtocolsWithDynamicData();
  const results: CachedAffectedProtocol[] = [];

  // Estimated impact depends only on the divergence, not on the protocol, so
  // compute it once per symbol.
  let estimatedImpact: string | undefined;
  if (Math.abs(oracleMarketDivergence) >= 0.2) {
    const absDiv = Math.abs(oracleMarketDivergence).toFixed(2);
    estimatedImpact =
      oracleMarketDivergence > 0
        ? `Oracle reports ${absDiv}% above market; positions using ${symbol} as collateral have less safety buffer than the protocol displays`
        : `Oracle reports ${absDiv}% below market; debt denominated in ${symbol} may be overvalued`;
  }

  for (const protocol of protocols) {
    // Skip DEX-type protocols: they don't have borrow/liquidation mechanics.
    if (protocol.protocolType !== 'lending') continue;

    const asset = protocol.assets.find((a) => a.symbol === symbol);
    if (!asset) continue;

    const ltPercent = (1 / asset.liquidationThreshold) * 100;
    const chainName = chainNames[protocol.chain as Blockchain] ?? protocol.chain;

    const base: Omit<AffectedProtocol, 'assetRole' | 'impactDirection' | 'riskSummary'> = {
      protocolId: protocol.id,
      protocolName: protocol.name,
      chain: protocol.chain,
      liquidationThreshold: asset.liquidationThreshold,
      tvlUsd: protocol.tvlUsd,
      oracleMarketDivergence: oracleMarketDivergence !== 0 ? oracleMarketDivergence : undefined,
      estimatedImpact,
    };

    results.push({
      ...base,
      assetRole: 'collateral',
      impactDirection: 'collateral-down',
      chainName,
      ltPercent,
    });

    if (includeBorrowRole) {
      results.push({
        ...base,
        assetRole: 'borrow',
        impactDirection: 'borrow-up',
        chainName,
        ltPercent,
      });
    }
  }

  return results;
}
