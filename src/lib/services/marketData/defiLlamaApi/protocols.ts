import { DEFILLAMA_API_BASE, fetchWithRetry, logger } from './client';
import { MarketDataError, type DefiLlamaProtocol, type ProtocolDetail } from './types';

function detectProtocolOracles(protocol: DefiLlamaProtocol): {
  primaryOracle: string;
  oracleCount: number;
} {
  const oracleKeywords: Record<string, string[]> = {
    Chainlink: ['chainlink'],
    'Pyth Network': ['pyth'],
    API3: ['api3'],
    UMA: ['uma', 'optimistic oracle'],
    RedStone: ['redstone'],
    Switchboard: ['switchboard'],
    DIA: ['dia'],
  };

  const detectedOracles: string[] = [];
  const protocolName = protocol.name.toLowerCase();
  const protocolCategory = (protocol.category || '').toLowerCase();

  Object.entries(oracleKeywords).forEach(([oracle, keywords]) => {
    if (keywords.some((kw) => protocolName.includes(kw) || protocolCategory.includes(kw))) {
      detectedOracles.push(oracle);
    }
  });

  if (detectedOracles.length === 0) {
    if (protocol.chains?.includes('solana')) {
      return { primaryOracle: 'Pyth Network', oracleCount: 2 };
    }
    return { primaryOracle: 'Chainlink', oracleCount: 2 };
  }

  return {
    primaryOracle: detectedOracles[0],
    oracleCount: detectedOracles.length,
  };
}

function formatProtocolTVL(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function normalizeChainName(chain: string): string {
  const chainMap: Record<string, string> = {
    'binance-smart-chain': 'bsc',
    bsc: 'bsc',
    ethereum: 'ethereum',
    solana: 'solana',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    polygon: 'polygon',
    avalanche: 'avalanche',
    base: 'base',
    fantom: 'fantom',
    gnosis: 'gnosis',
  };
  return chainMap[chain.toLowerCase()] || chain.toLowerCase();
}

export async function fetchProtocolDetails(): Promise<ProtocolDetail[]> {
  try {
    logger.info('Fetching protocol details from DeFiLlama...');

    const response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/protocols`);
    const protocols: DefiLlamaProtocol[] = await response.json();

    if (!Array.isArray(protocols) || protocols.length === 0) {
      throw new MarketDataError('Invalid protocol data format', 'INVALID_DATA_FORMAT');
    }

    const protocolsWithOracles = protocols.filter((p) => {
      const name = p.name.toLowerCase();
      const category = (p.category || '').toLowerCase();
      return (
        (p.tvl || 0) > 0 &&
        (category.includes('oracle') ||
          category.includes('lending') ||
          category.includes('dex') ||
          category.includes('derivatives') ||
          category.includes('synthetics') ||
          category.includes('cdp') ||
          category.includes('yield') ||
          [
            'chainlink',
            'pyth',
            'api3',
            'uma',
            'redstone',
            'switchboard',
            'dia',
          ].some((kw) => name.includes(kw)))
      );
    });

    const protocolDetails: ProtocolDetail[] = protocolsWithOracles
      .slice(0, 50)
      .map((protocol) => {
        const { primaryOracle, oracleCount } = detectProtocolOracles(protocol);
        const chains = protocol.chains?.map(normalizeChainName) || [];

        return {
          id: protocol.name.toLowerCase().replace(/\s+/g, '-'),
          name: protocol.name,
          category: protocol.category || 'Other',
          tvl: protocol.tvl || 0,
          tvlFormatted: formatProtocolTVL(protocol.tvl || 0),
          chains: [...new Set(chains)],
          primaryOracle,
          oracleCount,
          change24h: 0,
          change7d: 0,
        };
      })
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 20);

    logger.info(`Fetched ${protocolDetails.length} protocols from DeFiLlama`);
    return protocolDetails;
  } catch (error) {
    logger.error(
      'Failed to fetch protocol details from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackProtocolDetails();
  }
}

function generateFallbackProtocolDetails(): ProtocolDetail[] {
  logger.warn('Using fallback protocol details data - API unavailable');
  return [];
}
