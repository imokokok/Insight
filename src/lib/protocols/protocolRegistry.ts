import { OracleProvider, type Blockchain } from '@/types/oracle';

export type AssetCategory = 'stablecoin' | 'major' | 'alt' | 'micro';

export interface ProtocolAssetConfig {
  symbol: string;
  category: AssetCategory;
  oracleProvider: OracleProvider;
  // 清算抵押率：抵押品价值 / 借款价值 必须大于此值，否则被清算
  // 如 1.2 表示抵押率必须 > 120%
  liquidationCollateralRatio: number;
  // 最大 LTV（Loan To Value）：如 0.8 表示最多借出抵押品价值的 80%
  maxLtv: number;
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
  liquidationCollateralRatio: number,
  maxLtv: number
): ProtocolAssetConfig {
  return {
    symbol,
    category,
    oracleProvider: provider,
    liquidationCollateralRatio,
    maxLtv,
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
      // Aave V3 ETH: LT=82.5%, 等效清算抵押率 ~1.20
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2, 0.8),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.25, 0.73),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75),
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.4, 0.66),
    ],
  },
  {
    id: 'compound-v3-ethereum',
    name: 'Compound V3',
    chain: 'ethereum' as Blockchain,
    description: 'Algorithmic money market protocol on Ethereum',
    tvlUsd: 2_500_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8),
    ],
  },
  {
    id: 'uniswap-v3-ethereum',
    name: 'Uniswap V3',
    chain: 'ethereum' as Blockchain,
    description: 'Decentralized exchange with concentrated liquidity',
    tvlUsd: 4_000_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.TWAP, 1.15, 0.85),
      makeAsset('WBTC', 'major', OracleProvider.TWAP, 1.2, 0.8),
      makeAsset('USDC', 'stablecoin', OracleProvider.TWAP, 1.2, 0.85),
      makeAsset('USDT', 'stablecoin', OracleProvider.TWAP, 1.2, 0.85),
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.35, 0.7),
    ],
  },
  {
    id: 'aave-v3-arbitrum',
    name: 'Aave V3',
    chain: 'arbitrum' as Blockchain,
    description: 'Aave lending protocol on Arbitrum',
    tvlUsd: 3_000_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2, 0.8),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.25, 0.73),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75),
      makeAsset('ARB', 'alt', OracleProvider.CHAINLINK, 1.45, 0.63),
    ],
  },
  {
    id: 'compound-v3-arbitrum',
    name: 'Compound V3',
    chain: 'arbitrum' as Blockchain,
    description: 'Compound lending market on Arbitrum',
    tvlUsd: 800_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8),
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
