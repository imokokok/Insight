import {
  API3_AVAILABLE_PAIRS,
  oracleSupportedSymbols,
  SUPRA_AVAILABLE_PAIRS,
  SWITCHBOARD_AVAILABLE_PAIRS,
  WINKLINK_AVAILABLE_PAIRS,
} from '@/lib/oracles/constants/supportedSymbols';
import { BLOCKCHAIN_TO_CHAIN_ID, TWAP_POOL_ADDRESSES } from '@/lib/oracles/constants/twapConstants';
import { Blockchain, OracleProvider } from '@/types/oracle';

export interface OracleMetadata {
  oracleChains: Record<string, Blockchain[]>;
  oracleChainSymbols: Record<string, Partial<Record<Blockchain, string[]>>>;
}

/**
 * Display order for price-oracle selectors. Keeping this as plain metadata is
 * important: importing the richer oracle UI config used to instantiate every
 * oracle client and pulled chain SDKs into otherwise lightweight pages.
 */
export const PRICE_ORACLE_ORDER: readonly OracleProvider[] = [
  OracleProvider.CHAINLINK,
  OracleProvider.API3,
  OracleProvider.REDSTONE,
  OracleProvider.DIA,
  OracleProvider.WINKLINK,
  OracleProvider.SUPRA,
  OracleProvider.TWAP,
  OracleProvider.REFLECTOR,
  OracleProvider.FLARE,
  OracleProvider.SWITCHBOARD,
];

export const ORACLE_SUPPORTED_CHAINS: Record<OracleProvider, readonly Blockchain[]> = {
  [OracleProvider.CHAINLINK]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ],
  [OracleProvider.API3]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.OPTIMISM,
  ],
  [OracleProvider.REDSTONE]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
  ],
  [OracleProvider.DIA]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ],
  [OracleProvider.WINKLINK]: [Blockchain.TRON],
  [OracleProvider.SUPRA]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.SOLANA,
    Blockchain.BNB_CHAIN,
    Blockchain.AVALANCHE,
    Blockchain.ZKSYNC,
    Blockchain.SCROLL,
    Blockchain.MANTLE,
    Blockchain.LINEA,
    Blockchain.SUPRA_CHAIN,
    Blockchain.APTOS,
    Blockchain.SUI,
  ],
  [OracleProvider.TWAP]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
  ],
  [OracleProvider.REFLECTOR]: [Blockchain.STELLAR],
  [OracleProvider.FLARE]: [Blockchain.FLARE],
  [OracleProvider.SWITCHBOARD]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
    Blockchain.APTOS,
    Blockchain.SUI,
    Blockchain.MANTLE,
    Blockchain.LINEA,
    Blockchain.FLARE,
    Blockchain.SUPRA_CHAIN,
  ],
};

const PAIRS_BY_PROVIDER: Partial<Record<OracleProvider, Record<string, string[]>>> = {
  [OracleProvider.API3]: API3_AVAILABLE_PAIRS,
  [OracleProvider.WINKLINK]: WINKLINK_AVAILABLE_PAIRS,
  [OracleProvider.SUPRA]: SUPRA_AVAILABLE_PAIRS,
  [OracleProvider.SWITCHBOARD]: SWITCHBOARD_AVAILABLE_PAIRS,
};

function getStaticSymbolsForChain(provider: OracleProvider, chain: Blockchain): string[] {
  const explicitPairs = PAIRS_BY_PROVIDER[provider]?.[chain];
  if (explicitPairs) return [...explicitPairs];

  if (provider === OracleProvider.TWAP) {
    const chainId = BLOCKCHAIN_TO_CHAIN_ID[chain];
    return Object.entries(TWAP_POOL_ADDRESSES)
      .filter(([, pools]) => Boolean(chainId && pools[chainId]))
      .map(([symbol]) => symbol);
  }

  return [...(oracleSupportedSymbols[provider] ?? [])];
}

export function createStaticOracleMetadata(): OracleMetadata {
  const oracleChains: Record<string, Blockchain[]> = {};
  const oracleChainSymbols: Record<string, Partial<Record<Blockchain, string[]>>> = {};

  for (const provider of PRICE_ORACLE_ORDER) {
    const chains = [...ORACLE_SUPPORTED_CHAINS[provider]];
    oracleChains[provider] = chains;
    oracleChainSymbols[provider] = Object.fromEntries(
      chains.map((chain) => [chain, getStaticSymbolsForChain(provider, chain)])
    ) as Partial<Record<Blockchain, string[]>>;
  }

  return { oracleChains, oracleChainSymbols };
}

export function getOracleChains(metadata: OracleMetadata, provider: OracleProvider): Blockchain[] {
  return [...(metadata.oracleChains[provider] ?? ORACLE_SUPPORTED_CHAINS[provider] ?? [])];
}

export function getOracleSymbolsForChain(
  metadata: OracleMetadata,
  provider: OracleProvider,
  chain: Blockchain
): string[] {
  return [...(metadata.oracleChainSymbols[provider]?.[chain] ?? [])];
}

export function isOracleSymbolSupported(
  metadata: OracleMetadata,
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): boolean {
  const normalized = symbol.toUpperCase();
  if (chain) {
    return getOracleSymbolsForChain(metadata, provider, chain).some(
      (candidate) => candidate.toUpperCase() === normalized
    );
  }

  return getOracleChains(metadata, provider).some((candidateChain) =>
    getOracleSymbolsForChain(metadata, provider, candidateChain).some(
      (candidate) => candidate.toUpperCase() === normalized
    )
  );
}
