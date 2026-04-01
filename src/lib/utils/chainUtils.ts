import { oracleConfigs } from '@/lib/config/oracles';
import { CHAIN_CATEGORIES, getChainsByCategory, getChainCategory } from '@/lib/constants';
import {
  Blockchain,
  type OracleProvider,
  BLOCKCHAIN_VALUES,
  ORACLE_PROVIDER_VALUES,
} from '@/types/oracle';

export { CHAIN_CATEGORIES, getChainsByCategory, getChainCategory };

export function isBlockchain(value: unknown): value is Blockchain {
  return typeof value === 'string' && (BLOCKCHAIN_VALUES as readonly string[]).includes(value);
}

export function assertBlockchain(value: unknown, context?: string): Blockchain {
  if (!isBlockchain(value)) {
    throw new Error(
      `Invalid Blockchain value: ${JSON.stringify(value)}${context ? ` in ${context}` : ''}`
    );
  }
  return value;
}

export function safeBlockchainCast(value: unknown, fallback?: Blockchain): Blockchain | undefined {
  if (isBlockchain(value)) {
    return value;
  }
  return fallback;
}

/**
 * Gets all chains supported by an oracle provider
 * @param provider - The oracle provider
 * @returns Array of supported blockchains
 */
export function getSupportedChainsForOracle(provider: OracleProvider): Blockchain[] {
  const config = oracleConfigs[provider];
  return config?.supportedChains || [];
}

/**
 * Calculates chain coverage percentage for an oracle provider
 * @param provider - The oracle provider
 * @param totalChains - Optional array of total chains to calculate against
 * @returns Coverage percentage (0-100)
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
 * Gets chains commonly supported by two oracle providers
 * @param provider1 - First oracle provider
 * @param provider2 - Second oracle provider
 * @returns Array of common supported blockchains
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
 * Gets chains commonly supported by multiple oracle providers
 * @param providers - Array of oracle providers
 * @returns Array of common supported blockchains
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
 * Gets all oracle providers that support a specific chain
 * @param chain - The blockchain to check
 * @returns Array of supporting oracle providers
 */
export function getOraclesSupportingChain(chain: Blockchain): OracleProvider[] {
  return [...ORACLE_PROVIDER_VALUES].filter((provider) => {
    const config = oracleConfigs[provider];
    return config?.supportedChains.includes(chain);
  });
}

/**
 * Gets statistics on chain support across all oracles
 * @returns Record mapping each blockchain to number of supporting oracles
 */
export function getChainSupportStats(): Record<Blockchain, number> {
  const stats: Record<Blockchain, number> = {} as Record<Blockchain, number>;

  BLOCKCHAIN_VALUES.forEach((chain) => {
    stats[chain] = getOraclesSupportingChain(chain).length;
  });

  return stats;
}

/**
 * Gets chains sorted by number of supporting oracles (descending)
 * @returns Array of blockchains sorted by oracle support count
 */
export function getChainsSortedByOracleSupport(): Blockchain[] {
  const stats = getChainSupportStats();
  return BLOCKCHAIN_VALUES.slice().sort((a, b) => stats[b] - stats[a]);
}

/**
 * Gets heatmap data for chain coverage across all oracle providers
 * @returns Object containing providers, chains, and coverage matrix
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
 * Checks if a chain is supported by a specific oracle provider
 * @param chain - The blockchain to check
 * @param provider - The oracle provider
 * @returns Boolean indicating support status
 */
export function isChainSupportedByOracle(chain: Blockchain, provider: OracleProvider): boolean {
  const config = oracleConfigs[provider];
  return config?.supportedChains.includes(chain) || false;
}

/**
 * Gets the default oracle provider for a chain (first supporting provider)
 * @param chain - The blockchain
 * @returns Default oracle provider or null if none supports the chain
 */
export function getDefaultOracleForChain(chain: Blockchain): OracleProvider | null {
  const oracles = getOraclesSupportingChain(chain);
  return oracles.length > 0 ? oracles[0] : null;
}

/**
 * Gets recommended oracle providers for a chain
 * @param chain - The blockchain
 * @returns Array of recommended oracle providers
 */
export function getRecommendedOraclesForChain(chain: Blockchain): OracleProvider[] {
  return getOraclesSupportingChain(chain);
}

/**
 * Gets chain category statistics
 * @returns Record mapping category names to chain counts
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
 * Formats blockchain name for display (capitalizes each word)
 * @param chain - The blockchain enum value
 * @returns Formatted chain name
 */
export function formatChainName(chain: Blockchain): string {
  return chain
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gets the short ticker symbol for a blockchain
 * @param chain - The blockchain enum value
 * @returns Short ticker symbol (e.g., ETH, BTC, SOL)
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
