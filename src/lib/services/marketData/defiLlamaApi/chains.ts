import { chainColors, baseColors, semanticColors, chartColors } from '@/lib/config/colors';

import { DEFILLAMA_API_BASE, fetchWithRetry, logger } from './client';
import { MarketDataError, type ChainBreakdown, type DefiLlamaChain } from './types';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: chainColors.ethereum,
  bsc: chainColors.bnbChain,
  polygon: chainColors.polygon,
  arbitrum: chainColors.arbitrum,
  optimism: chainColors.optimism,
  avalanche: chainColors.avalanche,
  solana: chainColors.solana,
  base: chainColors.base,
  fantom: chainColors.fantom,
  gnosis: chainColors.gnosis,
  linea: chainColors.linea,
  scroll: chainColors.scroll,
  zksync: chainColors.zkSync,
  mantle: chainColors.mantle,
  celo: chartColors.sequence[4],
  moonbeam: chartColors.recharts.cyan,
  moonriver: semanticColors.warning.DEFAULT,
  cronos: chainColors.cronos,
  kava: semanticColors.danger.DEFAULT,
  metis: chartColors.recharts.cyan,
  aurora: semanticColors.success.DEFAULT,
};

function formatChainTVS(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}`;
}

function getTopOracleForChain(chainId: string): { name: string; share: number } {
  const oracleMap: Record<string, { name: string; share: number }> = {
    ethereum: { name: 'Chainlink', share: 68.5 },
    solana: { name: 'Pyth Network', share: 72.3 },
    arbitrum: { name: 'Chainlink', share: 75.2 },
    bsc: { name: 'Chainlink', share: 82.1 },
    base: { name: 'Chainlink', share: 78.9 },
    avalanche: { name: 'Chainlink', share: 71.5 },
    polygon: { name: 'Chainlink', share: 69.8 },
    optimism: { name: 'Chainlink', share: 74.3 },
  };
  return oracleMap[chainId] || { name: 'Chainlink', share: 65.0 };
}

export async function fetchChainBreakdown(): Promise<ChainBreakdown[]> {
  try {
    logger.info('Fetching chain breakdown data from DeFiLlama...');

    const response = await fetchWithRetry(`${DEFILLAMA_API_BASE}/chains`);
    const chains: DefiLlamaChain[] = await response.json();

    if (!Array.isArray(chains) || chains.length === 0) {
      throw new MarketDataError('Invalid chain data format', 'INVALID_DATA_FORMAT');
    }

    const totalTvl = chains.reduce((sum, chain) => sum + (chain.tvl || 0), 0);

    const chainBreakdown: ChainBreakdown[] = chains
      .filter((chain) => chain.tvl > 0)
      .map((chain) => {
        const share = totalTvl > 0 ? (chain.tvl / totalTvl) * 100 : 0;
        const chainId =
          chain.chainId?.toLowerCase() || chain.name.toLowerCase().replace(/\s+/g, '-');
        const topOracle = getTopOracleForChain(chainId);

        return {
          chainId,
          chainName: chain.name,
          tvs: chain.tvl,
          tvsFormatted: formatChainTVS(chain.tvl),
          share: Number(share.toFixed(2)),
          protocols: 0,
          color: CHAIN_COLORS[chainId] || baseColors.gray[400],
          change24h: 0,
          change7d: 0,
          topOracle: topOracle.name,
          topOracleShare: topOracle.share,
        };
      })
      .sort((a, b) => b.tvs - a.tvs);

    const topChains = chainBreakdown.slice(0, 8);
    const othersTvs = chainBreakdown.slice(8).reduce((sum, c) => sum + c.tvs, 0);

    if (othersTvs > 0) {
      const othersShare = totalTvl > 0 ? (othersTvs / totalTvl) * 100 : 0;
      topChains.push({
        chainId: 'others',
        chainName: 'Others',
        tvs: othersTvs,
        tvsFormatted: formatChainTVS(othersTvs),
        share: Number(othersShare.toFixed(2)),
        protocols: chainBreakdown.slice(8).reduce((sum, c) => sum + c.protocols, 0),
        color: baseColors.gray[400],
        change24h: 0,
        change7d: 0,
        topOracle: 'Chainlink',
        topOracleShare: 65.0,
      });
    }

    logger.info(`Fetched ${topChains.length} chains from DeFiLlama`);
    return topChains;
  } catch (error) {
    logger.error(
      'Failed to fetch chain breakdown from API, using fallback',
      error instanceof Error ? error : new Error(String(error))
    );
    return generateFallbackChainBreakdown();
  }
}

function generateFallbackChainBreakdown(): ChainBreakdown[] {
  logger.warn('Using fallback chain breakdown data');
  return [
    {
      chainId: 'ethereum',
      chainName: 'Ethereum',
      tvs: 28500000000,
      tvsFormatted: '$28.5B',
      share: 42.3,
      protocols: 185,
      color: CHAIN_COLORS['ethereum'],
      change24h: 1.8,
      change7d: 4.2,
      topOracle: 'Chainlink',
      topOracleShare: 68.5,
    },
    {
      chainId: 'solana',
      chainName: 'Solana',
      tvs: 8200000000,
      tvsFormatted: '$8.2B',
      share: 12.2,
      protocols: 92,
      color: CHAIN_COLORS['solana'],
      change24h: 5.6,
      change7d: 15.8,
      topOracle: 'Pyth Network',
      topOracleShare: 72.3,
    },
    {
      chainId: 'arbitrum',
      chainName: 'Arbitrum',
      tvs: 6800000000,
      tvsFormatted: '$6.8B',
      share: 10.1,
      protocols: 78,
      color: CHAIN_COLORS['arbitrum'],
      change24h: 2.1,
      change7d: 6.5,
      topOracle: 'Chainlink',
      topOracleShare: 75.2,
    },
    {
      chainId: 'bsc',
      chainName: 'BSC',
      tvs: 5200000000,
      tvsFormatted: '$5.2B',
      share: 7.7,
      protocols: 65,
      color: CHAIN_COLORS['bsc'],
      change24h: -0.5,
      change7d: 2.1,
      topOracle: 'Chainlink',
      topOracleShare: 82.1,
    },
    {
      chainId: 'base',
      chainName: 'Base',
      tvs: 4800000000,
      tvsFormatted: '$4.8B',
      share: 7.1,
      protocols: 58,
      color: CHAIN_COLORS['base'],
      change24h: 3.2,
      change7d: 12.4,
      topOracle: 'Chainlink',
      topOracleShare: 78.9,
    },
    {
      chainId: 'avalanche',
      chainName: 'Avalanche',
      tvs: 3500000000,
      tvsFormatted: '$3.5B',
      share: 5.2,
      protocols: 42,
      color: CHAIN_COLORS['avalanche'],
      change24h: 1.2,
      change7d: 3.8,
      topOracle: 'Chainlink',
      topOracleShare: 71.5,
    },
    {
      chainId: 'polygon',
      chainName: 'Polygon',
      tvs: 2800000000,
      tvsFormatted: '$2.8B',
      share: 4.2,
      protocols: 38,
      color: CHAIN_COLORS['polygon'],
      change24h: -1.2,
      change7d: 1.5,
      topOracle: 'Chainlink',
      topOracleShare: 69.8,
    },
    {
      chainId: 'optimism',
      chainName: 'Optimism',
      tvs: 2100000000,
      tvsFormatted: '$2.1B',
      share: 3.1,
      protocols: 32,
      color: CHAIN_COLORS['optimism'],
      change24h: 1.8,
      change7d: 5.2,
      topOracle: 'Chainlink',
      topOracleShare: 74.3,
    },
    {
      chainId: 'others',
      chainName: 'Others',
      tvs: 5400000000,
      tvsFormatted: '$5.4B',
      share: 8.1,
      protocols: 95,
      color: baseColors.gray[400],
      change24h: 0.8,
      change7d: 3.2,
      topOracle: 'Chainlink',
      topOracleShare: 65.2,
    },
  ].sort((a, b) => b.tvs - a.tvs);
}
