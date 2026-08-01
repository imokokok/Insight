/**
 * @fileoverview Cross-chain spread service
 * Builds a current cross-chain price spread matrix for a given provider/symbol.
 */

import { chainNames } from '@/lib/constants';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { getActiveFeedsMap } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

const logger = createLogger('cross-chain-spread-service');

const FETCH_CONCURRENCY = 6;

export interface ChainPrice {
  chain: Blockchain;
  chainName: string;
  price: number;
  timestamp: number;
  dataAgeSeconds: number | null;
}

export interface SpreadPair {
  xChain: Blockchain;
  yChain: Blockchain;
  x: string;
  y: string;
  value: number;
  percent: number;
}

export interface PriceDifference {
  chain: Blockchain;
  chainName: string;
  price: number;
  diff: number;
  diffPercent: number;
}

export interface CrossChainSpreadSummary {
  provider: OracleProvider;
  symbol: string;
  baseChain: Blockchain;
  chainCount: number;
  maxSpreadPercent: number;
}

export interface CrossChainSpreadResponse {
  summary: CrossChainSpreadSummary;
  prices: ChainPrice[];
  spreads: SpreadPair[];
  priceDifferences: PriceDifference[];
}

interface FetchPriceResult {
  chain: Blockchain;
  priceData?: PriceData;
  error?: string;
}

/**
 * Determine which chains the provider actually supports for the given symbol
 * by intersecting the provider's supportedChains with active feeds.
 */
async function resolveActiveChainsForSymbol(
  provider: OracleProvider,
  symbol: string
): Promise<Blockchain[]> {
  const client = getDefaultFactory().getClient(provider);
  const supportedChains = [...client.supportedChains];
  const baseSymbol = extractBaseSymbol(symbol).toUpperCase();

  try {
    const feedsMap = await getActiveFeedsMap(provider);

    // If DB has active feeds, only include chains that have a matching feed.
    if (feedsMap.size > 0) {
      const activeChainIds = new Set<number>();
      for (const feed of feedsMap.values()) {
        if (extractBaseSymbol(feed.symbol).toUpperCase() !== baseSymbol) continue;
        if (feed.chain_id === 0) {
          // Chain-agnostic feed (Supra/DIA/RedStone): include all supported chains.
          return supportedChains;
        }
        activeChainIds.add(feed.chain_id);
      }

      return supportedChains.filter((chain) => {
        const chainId = BLOCKCHAIN_TO_CHAIN_ID[chain];
        return activeChainIds.has(chainId);
      });
    }
  } catch (error) {
    logger.warn(
      'Failed to resolve active feeds for cross-chain spread; falling back to supportedChains',
      {
        error: error instanceof Error ? error.message : String(error),
        provider,
        symbol: baseSymbol,
      }
    );
  }

  // Fallback: trust the client's declared supportedChains. This keeps the
  // endpoint usable when the DB is empty/unreachable.
  return supportedChains;
}

async function fetchPricesForChains(
  provider: OracleProvider,
  symbol: string,
  chains: Blockchain[]
): Promise<FetchPriceResult[]> {
  return mapWithConcurrency(chains, FETCH_CONCURRENCY, async (chain) => {
    try {
      const priceData = await fetchPriceWithDatabase(provider, symbol, chain, true);
      return { chain, priceData };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch cross-chain price for ${provider}/${symbol}/${chain}`, {
        error: message,
      });
      return { chain, error: message };
    }
  });
}

function buildSpreadMatrix(prices: ChainPrice[]): SpreadPair[] {
  const matrix: SpreadPair[] = [];
  const priceByChain = new Map<Blockchain, number>();
  for (const p of prices) {
    priceByChain.set(p.chain, p.price);
  }

  for (const x of prices) {
    for (const y of prices) {
      const xPrice = priceByChain.get(x.chain) ?? 0;
      const yPrice = priceByChain.get(y.chain) ?? 0;
      const diff = Math.abs(xPrice - yPrice);
      const percent = xPrice > 0 && yPrice > 0 ? (diff / xPrice) * 100 : 0;

      matrix.push({
        xChain: x.chain,
        yChain: y.chain,
        x: x.chainName,
        y: y.chainName,
        value: diff,
        percent,
      });
    }
  }

  return matrix;
}

function buildPriceDifferences(prices: ChainPrice[], baseChain: Blockchain): PriceDifference[] {
  const basePriceData = prices.find((p) => p.chain === baseChain);
  if (!basePriceData) return [];
  const basePrice = basePriceData.price;

  return prices.map((priceData) => {
    const diff = priceData.price - basePrice;
    const diffPercent = basePrice > 0 && priceData.price > 0 ? (diff / basePrice) * 100 : 0;
    return {
      chain: priceData.chain,
      chainName: priceData.chainName,
      price: priceData.price,
      diff,
      diffPercent,
    };
  });
}

export async function getCrossChainSpreads(
  provider: OracleProvider,
  symbol: string,
  baseChain?: Blockchain
): Promise<CrossChainSpreadResponse> {
  const chains = await resolveActiveChainsForSymbol(provider, symbol);
  if (chains.length < 2) {
    throw new Error('INSUFFICIENT_DATA');
  }

  const fetchResults = await fetchPricesForChains(provider, symbol, chains);

  const successfulPrices: ChainPrice[] = [];
  for (const result of fetchResults) {
    if (result.priceData) {
      const now = Date.now();
      const dataAgeSeconds =
        result.priceData.ingestionTimestamp != null
          ? Math.max(0, Math.floor((now - result.priceData.ingestionTimestamp) / 1000))
          : null;

      successfulPrices.push({
        chain: result.chain,
        chainName: chainNames[result.chain],
        price: result.priceData.price,
        timestamp: result.priceData.timestamp,
        dataAgeSeconds,
      });
    }
  }

  if (successfulPrices.length < 2) {
    throw new Error('INSUFFICIENT_DATA');
  }

  // Sort for deterministic output.
  successfulPrices.sort((a, b) => a.chain.localeCompare(b.chain));

  const resolvedBaseChain = baseChain ?? successfulPrices[0].chain;
  const spreads = buildSpreadMatrix(successfulPrices);
  const priceDifferences = buildPriceDifferences(successfulPrices, resolvedBaseChain);
  const maxSpreadPercent = spreads.length > 0 ? Math.max(...spreads.map((s) => s.percent)) : 0;

  return {
    summary: {
      provider,
      symbol: extractBaseSymbol(symbol).toUpperCase(),
      baseChain: resolvedBaseChain,
      chainCount: successfulPrices.length,
      maxSpreadPercent,
    },
    prices: successfulPrices,
    spreads,
    priceDifferences,
  };
}
