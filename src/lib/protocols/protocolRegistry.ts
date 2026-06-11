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
  {
    id: 'aave-v3-base',
    name: 'Aave V3',
    chain: 'base' as Blockchain,
    description: 'Aave lending protocol on Base',
    tvlUsd: 2_000_000_000,
    assets: [
      // Aave V3 Base: same as Ethereum — ETH LTV=80%, LT=82.5%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2125, 0.8, 0.8),
      // WBTC LTV=73%, LT=78%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // USDC LTV=77%, LT=80%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // USDT LTV=75%, LT=80%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // cbETH LTV=78%, LT=81%
      makeAsset('cbETH', 'alt', OracleProvider.CHAINLINK, 1.2346, 0.78, 0.78),
    ],
  },
  {
    id: 'compound-v3-base',
    name: 'Compound V3',
    chain: 'base' as Blockchain,
    description: 'Compound lending market on Base',
    tvlUsd: 1_000_000_000,
    assets: [
      // Compound V3 Base: same as Ethereum — ETH CF=83%, liquidation factor ~86%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83, 0.83),
      // WBTC CF=78%, liquidation factor ~81%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78, 0.78),
      // USDC CF=82%, liquidation factor ~85%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82, 0.82),
      // USDT CF=80%, liquidation factor ~83%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8, 0.8),
    ],
  },
  {
    id: 'spark-ethereum',
    name: 'Spark Protocol',
    chain: 'ethereum' as Blockchain,
    description: 'Sky (MakerDAO) affiliated lending protocol on Ethereum',
    tvlUsd: 3_500_000_000,
    assets: [
      // Spark (Aave V3 fork): ETH LTV=80%, LT=82.5%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2125, 0.8, 0.8),
      // WBTC LTV=73%, LT=78%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // USDC LTV=77%, LT=80%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // USDT LTV=75%, LT=80%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // DAI LTV=77%, LT=80%
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // wstETH eMode: LTV=97%, LT=97% (ETH-correlated eMode per Messari/Credora report)
      makeAsset('wstETH', 'alt', OracleProvider.CHAINLINK, 1.0309, 0.97, 0.97),
    ],
  },
  {
    id: 'morpho-blue-ethereum',
    name: 'Morpho Blue',
    chain: 'ethereum' as Blockchain,
    description: 'Permissionless lending engine with isolated markets on Ethereum',
    tvlUsd: 8_000_000_000,
    assets: [
      // Morpho Blue: isolated markets, each with a single LLTV
      // Governance-approved LLTVs: 86%, 91.5%, 94.5%, 96.5% (per docs.morpho.org)
      // ETH/USDC market: LLTV=86%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.1628, 0.86, 0.86),
      // WBTC/USDC market: LLTV=77%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2987, 0.77, 0.77),
      // wstETH/ETH market: LLTV=94.5% (highly correlated)
      makeAsset('wstETH', 'alt', OracleProvider.CHAINLINK, 1.0582, 0.945, 0.945),
      // USDC (primary borrow asset in most markets)
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.0406, 0.96, 0.96),
      // USDT (borrow asset)
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.0406, 0.96, 0.96),
      // DAI (borrow asset)
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.0406, 0.96, 0.96),
    ],
  },
  {
    id: 'venus-bnb-chain',
    name: 'Venus Protocol',
    chain: 'bnb-chain' as Blockchain,
    description: 'Leading lending protocol on BNB Chain',
    tvlUsd: 1_700_000_000,
    assets: [
      // Venus Core Pool: CF=LT (same value, per docs-v4.venus.io)
      // BNB CF=78%, LT=78% (per Venus governance proposal #5046)
      makeAsset('BNB', 'major', OracleProvider.CHAINLINK, 1.2821, 0.78, 0.78),
      // BTCB CF=70%, LT=70%
      makeAsset('BTCB', 'major', OracleProvider.CHAINLINK, 1.4286, 0.7, 0.7),
      // ETH CF=75%, LT=75%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.3333, 0.75, 0.75),
      // USDT CF=85%, LT=85%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.1765, 0.85, 0.85),
      // USDC CF=85%, LT=85%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.1765, 0.85, 0.85),
    ],
  },
  {
    id: 'benqi-avalanche',
    name: 'BENQI',
    chain: 'avalanche' as Blockchain,
    description: 'Leading lending protocol on Avalanche',
    tvlUsd: 500_000_000,
    assets: [
      // BENQI: CF=LT (Compound V2 fork model, per docs.benqi.fi)
      // AVAX CF=74%, LT=74%
      makeAsset('AVAX', 'major', OracleProvider.CHAINLINK, 1.3514, 0.74, 0.74),
      // WETH CF=75%, LT=75%
      makeAsset('WETH', 'major', OracleProvider.CHAINLINK, 1.3333, 0.75, 0.75),
      // BTC.b CF=69%, LT=69%
      makeAsset('BTC.b', 'major', OracleProvider.CHAINLINK, 1.4493, 0.69, 0.69),
      // WBTC CF=72.5%, LT=72.5%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.3793, 0.725, 0.725),
      // USDC CF=80%, LT=80%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.8, 0.8),
      // USDt CF=72.5%, LT=72.5%
      makeAsset('USDt', 'stablecoin', OracleProvider.CHAINLINK, 1.3793, 0.725, 0.725),
      // DAI CF=85%, LT=85%
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.1765, 0.85, 0.85),
      // LINK CF=67.5%, LT=67.5%
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.4815, 0.675, 0.675),
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
