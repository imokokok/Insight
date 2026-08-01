import { createLogger } from '@/lib/utils/logger';

import { PROTOCOL_REGISTRY, type ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('protocol-metrics-service');

const DEFILLAMA_API = 'https://api.llama.fi/protocol';

// Map Insight protocol id -> DeFiLlama protocol slug.
// Several protocols share the same slug because DeFiLlama aggregates by protocol, not by chain.
// Slugs verified against https://defillama.com/protocol/<slug>
const DEFILLAMA_SLUGS: Record<string, string> = {
  // Aave V3 (multi-chain)
  'aave-v3-ethereum': 'aave-v3',
  'aave-v3-arbitrum': 'aave-v3',
  'aave-v3-base': 'aave-v3',
  'aave-v3-optimism': 'aave-v3',
  'aave-v3-polygon': 'aave-v3',
  // Compound V3 (multi-chain)
  'compound-v3-ethereum': 'compound-v3',
  'compound-v3-arbitrum': 'compound-v3',
  'compound-v3-base': 'compound-v3',
  // Morpho Blue (multi-chain)
  'morpho-blue-ethereum': 'morpho-blue',
  'morpho-blue-base': 'morpho-blue',
  // Venus (multi-chain)
  'venus-bnb-chain': 'venus',
  // BENQI
  'benqi-avalanche': 'benqi',
  // Uniswap V3
  'uniswap-v3-ethereum': 'uniswap-v3',
};

// Map Insight chain name -> DeFiLlama chain display name.
const CHAIN_NAME_MAP: Record<string, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
  polygon: 'Polygon',
  'bnb-chain': 'BSC',
  avalanche: 'Avalanche',
};

interface DeFiLlamaProtocolResponse {
  slug?: string;
  currentChainTvls?: Record<string, number>;
  tvl?: number;
}

export interface ProtocolTvlResult {
  protocolId: string;
  tvlUsd: number | null;
  source: 'defillama' | 'fallback' | 'unsupported';
  error?: string;
}

const DEFILLAMA_TIMEOUT_MS = 15000;

async function fetchDefiLlamaProtocol(slug: string): Promise<DeFiLlamaProtocolResponse | null> {
  const url = `${DEFILLAMA_API}/${encodeURIComponent(slug)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFILLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DeFiLlama API returned ${response.status}`);
    }

    const data = (await response.json()) as DeFiLlamaProtocolResponse;
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch DeFiLlama data for ${slug}`, { error: message });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDefiLlamaProtocols(
  slugs: string[]
): Promise<Map<string, DeFiLlamaProtocolResponse | null>> {
  const dataBySlug = new Map<string, DeFiLlamaProtocolResponse | null>();

  const results = await Promise.allSettled(
    slugs.map(async (slug) => {
      const data = await fetchDefiLlamaProtocol(slug);
      return { slug, data } as const;
    })
  );

  // Use index-based iteration instead of results.indexOf(result) (O(n²)).
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      dataBySlug.set(result.value.slug, result.value.data);
    } else {
      const slug = slugs[i];
      logger.warn(`Unexpected DeFiLlama fetch failure for ${slug}`, {
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      dataBySlug.set(slug, null);
    }
  });

  return dataBySlug;
}

function extractChainTvl(
  data: DeFiLlamaProtocolResponse | null,
  protocol: ProtocolConfig
): number | null {
  if (!data) return null;

  // Prefer chain-specific TVL when available.
  const chainTvls = data.currentChainTvls;
  if (chainTvls && Object.keys(chainTvls).length > 0) {
    const targetChain = CHAIN_NAME_MAP[protocol.chain];
    if (targetChain && chainTvls[targetChain] && chainTvls[targetChain] > 0) {
      return chainTvls[targetChain];
    }

    // Fallback: try case-insensitive match.
    const match = Object.entries(chainTvls).find(
      ([chain, tvl]) => chain.toLowerCase() === protocol.chain.toLowerCase() && tvl > 0
    );
    if (match) return match[1];

    // Last resort: sum all chain TVLs if we cannot disambiguate.
    // This overestimates for multi-chain protocols but is better than returning null.
    const values = Object.values(chainTvls).filter((v) => typeof v === 'number' && v > 0);
    if (values.length > 0) {
      return values.reduce((a, b) => a + b, 0);
    }
  }

  // Final fallback: protocol aggregate TVL.
  if (typeof data.tvl === 'number' && data.tvl > 0) {
    return data.tvl;
  }

  return null;
}

async function fetchProtocolTvl(
  protocol: ProtocolConfig,
  data: DeFiLlamaProtocolResponse | null
): Promise<ProtocolTvlResult> {
  const slug = DEFILLAMA_SLUGS[protocol.id];
  if (!slug) {
    return {
      protocolId: protocol.id,
      tvlUsd: protocol.tvlUsd ?? null,
      source: 'unsupported',
      error: 'No DeFiLlama slug configured',
    };
  }

  const tvl = extractChainTvl(data, protocol);

  if (tvl && tvl > 0) {
    return {
      protocolId: protocol.id,
      tvlUsd: tvl,
      source: 'defillama',
    };
  }

  return {
    protocolId: protocol.id,
    tvlUsd: protocol.tvlUsd ?? null,
    source: 'fallback',
    error: 'Could not extract TVL from DeFiLlama, using registry fallback',
  };
}

export async function fetchAllProtocolTvls(): Promise<ProtocolTvlResult[]> {
  const results: ProtocolTvlResult[] = [];

  // Fetch unique slugs in parallel to avoid redundant DeFiLlama calls and
  // prevent one slow/hanging request from serially blocking the rest.
  const uniqueSlugs = [
    ...new Set(PROTOCOL_REGISTRY.map((protocol) => DEFILLAMA_SLUGS[protocol.id]).filter(Boolean)),
  ];

  logger.info(
    `Fetching TVL data for ${PROTOCOL_REGISTRY.length} protocols (${uniqueSlugs.length} unique DeFiLlama slugs)`
  );
  const startTime = Date.now();
  const dataBySlug = await fetchDefiLlamaProtocols(uniqueSlugs);
  logger.info(`DeFiLlama bulk fetch completed in ${Date.now() - startTime}ms`);

  for (const protocol of PROTOCOL_REGISTRY) {
    try {
      const slug = DEFILLAMA_SLUGS[protocol.id];
      const data = slug ? (dataBySlug.get(slug) ?? null) : null;
      const result = await fetchProtocolTvl(protocol, data);
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Unexpected error fetching TVL for ${protocol.id}`, new Error(message));
      results.push({
        protocolId: protocol.id,
        tvlUsd: protocol.tvlUsd ?? null,
        source: 'fallback',
        error: message,
      });
    }
  }

  return results;
}
