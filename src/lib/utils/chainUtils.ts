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
    [Blockchain.MOONRIVER]: 'MOVR',
    [Blockchain.METIS]: 'METIS',
    [Blockchain.STARKEX]: 'STX',
    [Blockchain.STELLAR]: 'XLM',
  };
  return shortNames[chain] || chain.toUpperCase().slice(0, 4);
}
