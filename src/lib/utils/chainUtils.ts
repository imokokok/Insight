import { oracleConfigs } from '@/lib/config/oracles';
import { CHAIN_CATEGORIES, getChainsByCategory, getChainCategory } from '@/lib/constants';
import {
  Blockchain,
  type OracleProvider,
  BLOCKCHAIN_VALUES,
  ORACLE_PROVIDER_VALUES,
} from '@/types/oracle';

export { CHAIN_CATEGORIES, getChainsByCategory, getChainCategory };

/**
 * 获取预言机支持的所有链
 */
export function getSupportedChainsForOracle(provider: OracleProvider): Blockchain[] {
  const config = oracleConfigs[provider];
  return config?.supportedChains || [];
}

/**
 * 计算预言机的链覆盖率
 */
export function calculateChainCoverage(
  provider: OracleProvider,
  totalChains?: readonly Blockchain[]
): number {
  const config = oracleConfigs[provider];
  const supportedChains = config?.supportedChains || [];
  const total = totalChains || BLOCKCHAIN_VALUES;
  return (supportedChains.length / total.length) * 100;
}

/**
 * 获取两个预言机共同支持的链
 */
export function getCommonChainsBetweenOracles(
  provider1: OracleProvider,
  provider2: OracleProvider
): Blockchain[] {
  const chains1 = getSupportedChainsForOracle(provider1);
  const chains2 = getSupportedChainsForOracle(provider2);
  return chains1.filter((chain) => chains2.includes(chain));
}

/**
 * 获取多个预言机共同支持的链
 */
export function getCommonChainsForOracles(providers: OracleProvider[]): Blockchain[] {
  if (providers.length === 0) return [];
  if (providers.length === 1) return getSupportedChainsForOracle(providers[0]);

  let commonChains = getSupportedChainsForOracle(providers[0]);
  for (let i = 1; i < providers.length; i++) {
    const chains = getSupportedChainsForOracle(providers[i]);
    commonChains = commonChains.filter((chain) => chains.includes(chain));
  }
  return commonChains;
}

/**
 * 获取支持特定链的所有预言机
 */
export function getOraclesSupportingChain(chain: Blockchain): OracleProvider[] {
  return [...ORACLE_PROVIDER_VALUES].filter((provider) => {
    const config = oracleConfigs[provider];
    return config?.supportedChains.includes(chain);
  });
}

/**
 * 获取链支持数量统计
 */
export function getChainSupportStats(): Record<Blockchain, number> {
  const stats: Record<Blockchain, number> = {} as Record<Blockchain, number>;

  BLOCKCHAIN_VALUES.forEach((chain) => {
    stats[chain] = getOraclesSupportingChain(chain).length;
  });

  return stats;
}

/**
 * 按支持预言机数量排序链
 */
export function getChainsSortedByOracleSupport(): Blockchain[] {
  const stats = getChainSupportStats();
  return BLOCKCHAIN_VALUES.slice().sort((a, b) => stats[b] - stats[a]);
}

/**
 * 获取链覆盖热力图数据
 */
export function getChainCoverageHeatmapData(): {
  providers: OracleProvider[];
  chains: Blockchain[];
  coverage: Record<OracleProvider, Record<Blockchain, boolean>>;
} {
  const providers = [...ORACLE_PROVIDER_VALUES];
  const chains = [...BLOCKCHAIN_VALUES];
  const coverage: Record<OracleProvider, Record<Blockchain, boolean>> = {} as Record<
    OracleProvider,
    Record<Blockchain, boolean>
  >;

  providers.forEach((provider) => {
    const config = oracleConfigs[provider];
    coverage[provider] = {} as Record<Blockchain, boolean>;
    chains.forEach((chain) => {
      coverage[provider][chain] = config?.supportedChains.includes(chain) || false;
    });
  });

  return { providers, chains, coverage };
}

/**
 * 检查链是否被支持
 */
export function isChainSupportedByOracle(chain: Blockchain, provider: OracleProvider): boolean {
  const config = oracleConfigs[provider];
  return config?.supportedChains.includes(chain) || false;
}

/**
 * 获取链的默认预言机（支持该链的第一个预言机）
 */
export function getDefaultOracleForChain(chain: Blockchain): OracleProvider | null {
  const oracles = getOraclesSupportingChain(chain);
  return oracles.length > 0 ? oracles[0] : null;
}

/**
 * 获取链的推荐预言机列表（按市值排序）
 */
export function getRecommendedOraclesForChain(chain: Blockchain): OracleProvider[] {
  return getOraclesSupportingChain(chain);
}

/**
 * 获取链分类统计
 */
export function getChainCategoryStats(): Record<string, number> {
  const stats: Record<string, number> = {
    l1: 0,
    l2: 0,
    cosmos: 0,
    other: 0,
  };

  BLOCKCHAIN_VALUES.forEach((chain) => {
    const category = getChainCategory(chain);
    stats[category] = (stats[category] || 0) + 1;
  });

  return stats;
}

/**
 * 格式化链名称
 */
export function formatChainName(chain: Blockchain): string {
  return chain
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 获取链的简短名称
 */
export function getChainShortName(chain: Blockchain): string {
  const shortNames: Record<Blockchain, string> = {
    [Blockchain.ETHEREUM]: 'ETH',
    [Blockchain.ARBITRUM]: 'ARB',
    [Blockchain.OPTIMISM]: 'OP',
    [Blockchain.POLYGON]: 'MATIC',
    [Blockchain.SOLANA]: 'SOL',
    [Blockchain.AVALANCHE]: 'AVAX',
    [Blockchain.FANTOM]: 'FTM',
    [Blockchain.CRONOS]: 'CRO',
    [Blockchain.JUNO]: 'JUNO',
    [Blockchain.COSMOS]: 'ATOM',
    [Blockchain.OSMOSIS]: 'OSMO',
    [Blockchain.BNB_CHAIN]: 'BNB',
    [Blockchain.BASE]: 'BASE',
    [Blockchain.SCROLL]: 'SCR',
    [Blockchain.ZKSYNC]: 'ZKS',
    [Blockchain.APTOS]: 'APT',
    [Blockchain.SUI]: 'SUI',
    [Blockchain.GNOSIS]: 'GNO',
    [Blockchain.MANTLE]: 'MNT',
    [Blockchain.LINEA]: 'LIN',
    [Blockchain.CELESTIA]: 'TIA',
    [Blockchain.INJECTIVE]: 'INJ',
    [Blockchain.SEI]: 'SEI',
    [Blockchain.TRON]: 'TRX',
    [Blockchain.TON]: 'TON',
    [Blockchain.NEAR]: 'NEAR',
    [Blockchain.AURORA]: 'AUR',
    [Blockchain.CELO]: 'CELO',
    [Blockchain.STARKNET]: 'STRK',
    [Blockchain.BLAST]: 'BLAST',
    [Blockchain.CARDANO]: 'ADA',
    [Blockchain.POLKADOT]: 'DOT',
    [Blockchain.KAVA]: 'KAVA',
    [Blockchain.MOONBEAM]: 'GLMR',
    [Blockchain.STARKEX]: 'STX',
  };
  return shortNames[chain] || chain.toUpperCase().slice(0, 4);
}
