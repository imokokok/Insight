import { OracleProvider, type Blockchain } from '@/types/oracle';

export type AssetCategory = 'stablecoin' | 'major' | 'alt' | 'micro';

export interface ProtocolAssetConfig {
  symbol: string;
  category: AssetCategory;
  oracleProvider: OracleProvider;
  // Collateral factor: collateral value discount ratio (< 1), e.g. 0.825 means 82.5% of collateral value is counted
  // Corresponds to collFact in the OVer paper
  collateralFactor: number;
  // Liquidation threshold: collateral ratio threshold that triggers liquidation (> 1), e.g. 1.2 means ratio must > 120%
  // Corresponds to liquidation ratio in the OVer paper
  liquidationThreshold: number;
  // Max LTV (Loan To Value): e.g. 0.8 means you can borrow up to 80% of collateral value
  maxLtv: number;
  // cToken/aToken to underlying asset exchange rate, e.g. 0.02 means 1 cETH = 0.02 ETH
  // Corresponds to exchRt in the OVer paper
  exchangeRate: number;
  // Backward compatible: liquidationCollateralRatio = liquidationThreshold
  get liquidationCollateralRatio(): number;
}

export interface ProtocolConfig {
  id: string;
  name: string;
  chain: Blockchain;
  description: string;
  tvlUsd?: number;
  assets: ProtocolAssetConfig[];
}

function makeAsset(
  symbol: string,
  category: AssetCategory,
  provider: OracleProvider,
  liquidationThreshold: number,
  maxLtv: number,
  collateralFactor?: number,
  exchangeRate?: number
): ProtocolAssetConfig {
  const cf = collateralFactor ?? maxLtv; // Default collateralFactor = maxLtv (conservative estimate)
  const er = exchangeRate ?? 1; // Default exchange rate = 1 (directly holding underlying asset)
  return {
    symbol,
    category,
    oracleProvider: provider,
    collateralFactor: cf,
    liquidationThreshold,
    maxLtv,
    exchangeRate: er,
    get liquidationCollateralRatio() {
      return this.liquidationThreshold;
    },
  };
}

export const PROTOCOL_REGISTRY: ProtocolConfig[] = [
  {
    id: 'aave-v3-ethereum',
    name: 'Aave V3',
    chain: 'ethereum' as Blockchain,
    description: 'Leading decentralized lending protocol on Ethereum',
    tvlUsd: 12_000_000_000,
    assets: [
      // Aave V3 ETH: LT=82.5%, CF=80%, LTV=80%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2125, 0.8, 0.8),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.25, 0.73, 0.73),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.405, 0.66, 0.66),
    ],
  },
  {
    id: 'compound-v3-ethereum',
    name: 'Compound V3',
    chain: 'ethereum' as Blockchain,
    description: 'Algorithmic money market protocol on Ethereum',
    tvlUsd: 2_500_000_000,
    assets: [
      // Compound V3: collateralFactor = collateralFactorMantissa
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83, 0.83),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78, 0.78),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82, 0.82),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8, 0.8),
    ],
  },
  {
    id: 'uniswap-v3-ethereum',
    name: 'Uniswap V3',
    chain: 'ethereum' as Blockchain,
    description: 'Decentralized exchange with concentrated liquidity',
    tvlUsd: 4_000_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.TWAP, 1.15, 0.85, 0.85),
      makeAsset('WBTC', 'major', OracleProvider.TWAP, 1.2, 0.8, 0.8),
      makeAsset('USDC', 'stablecoin', OracleProvider.TWAP, 1.2, 0.85, 0.85),
      makeAsset('USDT', 'stablecoin', OracleProvider.TWAP, 1.2, 0.85, 0.85),
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.35, 0.7, 0.7),
    ],
  },
  {
    id: 'aave-v3-arbitrum',
    name: 'Aave V3',
    chain: 'arbitrum' as Blockchain,
    description: 'Aave lending protocol on Arbitrum',
    tvlUsd: 3_000_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2125, 0.8, 0.8),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.25, 0.73, 0.73),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      makeAsset('ARB', 'alt', OracleProvider.CHAINLINK, 1.45, 0.63, 0.63),
    ],
  },
  {
    id: 'compound-v3-arbitrum',
    name: 'Compound V3',
    chain: 'arbitrum' as Blockchain,
    description: 'Compound lending market on Arbitrum',
    tvlUsd: 800_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83, 0.83),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78, 0.78),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82, 0.82),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8, 0.8),
    ],
  },
];

export function getProtocolById(id: string): ProtocolConfig | undefined {
  return PROTOCOL_REGISTRY.find((p) => p.id === id);
}

export function getProtocolsByChain(chain: Blockchain): ProtocolConfig[] {
  return PROTOCOL_REGISTRY.filter((p) => p.chain === chain);
}

export function searchProtocols(query: string): ProtocolConfig[] {
  const q = query.toLowerCase().trim();
  if (!q) return PROTOCOL_REGISTRY;
  return PROTOCOL_REGISTRY.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.chain.toLowerCase().includes(q)
  );
}

export function getAllSupportedChains(): Blockchain[] {
  const chains = new Set<Blockchain>();
  PROTOCOL_REGISTRY.forEach((p) => chains.add(p.chain));
  return Array.from(chains);
}
