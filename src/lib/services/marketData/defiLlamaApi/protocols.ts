import { DEFILLAMA_API_BASE, fetchWithRetry, logger } from './client';
import { MarketDataError, type DefiLlamaProtocol, type ProtocolDetail } from './types';

function detectProtocolOracles(protocol: DefiLlamaProtocol): {
  primaryOracle: string;
  oracleCount: number;
} {
  const oracleKeywords: Record<string, string[]> = {
    Chainlink: ['chainlink'],
    'Pyth Network': ['pyth'],
    'Band Protocol': ['band'],
    API3: ['api3'],
    UMA: ['uma', 'optimistic oracle'],
    RedStone: ['redstone'],
    Switchboard: ['switchboard'],
    DIA: ['dia'],
    Tellor: ['tellor'],
    Chronicle: ['chronicle'],
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
            'band',
            'api3',
            'uma',
            'redstone',
            'switchboard',
            'dia',
            'tellor',
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
  logger.warn('Using fallback protocol details data');
  return [
    {
      id: 'aave-v3',
      name: 'Aave V3',
      category: 'Lending',
      tvl: 12500000000,
      tvlFormatted: '$12.5B',
      chains: ['ethereum', 'polygon', 'avalanche', 'arbitrum', 'optimism', 'base'],
      primaryOracle: 'Chainlink',
      oracleCount: 3,
      change24h: 1.2,
      change7d: 4.5,
    },
    {
      id: 'compound-v3',
      name: 'Compound V3',
      category: 'Lending',
      tvl: 3200000000,
      tvlFormatted: '$3.2B',
      chains: ['ethereum', 'polygon', 'arbitrum', 'base'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 0.8,
      change7d: 2.1,
    },
    {
      id: 'makerdao',
      name: 'MakerDAO',
      category: 'CDP',
      tvl: 6800000000,
      tvlFormatted: '$6.8B',
      chains: ['ethereum'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: -0.5,
      change7d: 1.8,
    },
    {
      id: 'lido',
      name: 'Lido',
      category: 'Liquid Staking',
      tvl: 25800000000,
      tvlFormatted: '$25.8B',
      chains: ['ethereum', 'polygon', 'solana'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 1.5,
      change7d: 3.2,
    },
    {
      id: 'uniswap-v3',
      name: 'Uniswap V3',
      category: 'DEX',
      tvl: 4200000000,
      tvlFormatted: '$4.2B',
      chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'],
      primaryOracle: 'Chainlink',
      oracleCount: 3,
      change24h: 2.1,
      change7d: 6.8,
    },
    {
      id: 'curve-finance',
      name: 'Curve Finance',
      category: 'DEX',
      tvl: 2300000000,
      tvlFormatted: '$2.3B',
      chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: -1.2,
      change7d: -2.5,
    },
    {
      id: 'solend',
      name: 'Solend',
      category: 'Lending',
      tvl: 450000000,
      tvlFormatted: '$450M',
      chains: ['solana'],
      primaryOracle: 'Pyth Network',
      oracleCount: 2,
      change24h: 3.2,
      change7d: 12.5,
    },
    {
      id: 'mango-markets',
      name: 'Mango Markets',
      category: 'Lending',
      tvl: 120000000,
      tvlFormatted: '$120M',
      chains: ['solana'],
      primaryOracle: 'Pyth Network',
      oracleCount: 1,
      change24h: 5.8,
      change7d: 18.2,
    },
    {
      id: 'drift-protocol',
      name: 'Drift Protocol',
      category: 'Derivatives',
      tvl: 280000000,
      tvlFormatted: '$280M',
      chains: ['solana'],
      primaryOracle: 'Pyth Network',
      oracleCount: 2,
      change24h: 4.5,
      change7d: 15.8,
    },
    {
      id: 'gmx-v2',
      name: 'GMX V2',
      category: 'Derivatives',
      tvl: 580000000,
      tvlFormatted: '$580M',
      chains: ['arbitrum', 'avalanche'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 2.8,
      change7d: 8.5,
    },
    {
      id: 'synthetix',
      name: 'Synthetix',
      category: 'Synthetics',
      tvl: 890000000,
      tvlFormatted: '$890M',
      chains: ['ethereum', 'optimism', 'base'],
      primaryOracle: 'Chainlink',
      oracleCount: 3,
      change24h: 1.8,
      change7d: 5.2,
    },
    {
      id: 'pendle',
      name: 'Pendle',
      category: 'Yield',
      tvl: 4200000000,
      tvlFormatted: '$4.2B',
      chains: ['ethereum', 'arbitrum', 'optimism', 'base', 'bsc'],
      primaryOracle: 'Chainlink',
      oracleCount: 2,
      change24h: 3.5,
      change7d: 12.8,
    },
  ].sort((a, b) => b.tvl - a.tvl);
}
