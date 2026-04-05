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
  logger.warn('Using fallback chain breakdown data - API unavailable');
  return [];
}
