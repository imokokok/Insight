import {
  AaveV3Arbitrum,
  AaveV3Base,
  AaveV3Ethereum,
  AaveV3Optimism,
  AaveV3Polygon,
} from '@aave-dao/aave-address-book';

import { roundTo } from '@/lib/utils/format';
import { OracleProvider, type Blockchain } from '@/types/oracle';

export type AssetCategory = 'stablecoin' | 'major' | 'alt' | 'micro';

// Per-category deviation ratios (relative to major = 1.0)
// Used for per-asset deviation bounds in joint deviation & safety planning.
// These values are conservative empirical estimates for typical crypto stress
// moves: stablecoin depeg events ~3%, major assets ~15-20%, altcoins ~30-40%,
// micro-cap tokens ~50-70%.
//
// In addition, `deriveDeviationRatios` below adjusts these baselines per asset
// using each protocol's own liquidation-threshold parameters, so every
// integrated protocol contributes its own risk assessment.
const CATEGORY_DEVIATION_RATIOS: Record<AssetCategory, number> = {
  stablecoin: 0.15, // ~3% vs ~20% major stress move
  major: 1.0, // baseline
  alt: 1.75, // ~35% vs ~20% major stress move
  micro: 3.5, // ~70% vs ~20% major stress move
};

/**
 * Derive per-asset oracle-deviation ratios from a protocol's own risk parameters.
 *
 * For each asset category we pick the asset with the highest liquidation
 * threshold (i.e. the protocol considers it the safest in that category) as the
 * reference. Other assets in the same category get a higher ratio proportional
 * to how much lower their liquidation threshold is, reflecting the protocol's
 * own risk assessment.
 *
 * This lets every integrated protocol use its own risk parameters instead of a
 * single global guess.
 */
export function deriveDeviationRatios(protocol: ProtocolConfig): Record<string, number> {
  const referenceByCategory: Record<AssetCategory, ProtocolAssetConfig | undefined> = {
    stablecoin: undefined,
    major: undefined,
    alt: undefined,
    micro: undefined,
  };

  for (const asset of protocol.assets) {
    const current = referenceByCategory[asset.category];
    if (!current || 1 / asset.liquidationThreshold > 1 / current.liquidationThreshold) {
      referenceByCategory[asset.category] = asset;
    }
  }

  const ratios: Record<string, number> = {};
  for (const asset of protocol.assets) {
    const baseline = CATEGORY_DEVIATION_RATIOS[asset.category] ?? 1.0;
    const reference = referenceByCategory[asset.category];
    if (reference && reference.symbol !== asset.symbol) {
      const referenceLt = 1 / reference.liquidationThreshold;
      const assetLt = 1 / asset.liquidationThreshold;
      const riskMultiplier = Math.pow(referenceLt / assetLt, 2);
      ratios[asset.symbol] = roundTo(baseline * riskMultiplier, 3);
    } else {
      ratios[asset.symbol] = baseline;
    }
  }

  return ratios;
}

export interface ProtocolAssetConfig {
  symbol: string;
  category: AssetCategory;
  oracleProvider: OracleProvider;
  // Symbol used for price lookup; defaults to `symbol` if not set.
  // Useful for derivative tokens (e.g. iSUPRA → SUPRA, iUSDC → USDC) that track an underlying asset price.
  priceSymbol?: string;
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
  // Optional hint for on-demand exchange rate fetching. Set to 'lst' when the protocol's
  // price feed is for the underlying asset (e.g. ETH/USD) and the collateral is an LST
  // (wstETH/cbETH), so the safety check can fetch the latest LST/underlying rate.
  exchangeRateSource?: 'lst';
  // Backward compatible: liquidationCollateralRatio = liquidationThreshold
  get liquidationCollateralRatio(): number;
}

export type ProtocolType = 'lending' | 'dex';

export interface ProtocolConfig {
  id: string;
  name: string;
  chain: Blockchain;
  description: string;
  tvlUsd?: number;
  // Protocol type: 'lending' for money markets (Aave, Compound, etc.),
  // 'dex' for decentralized exchanges (Uniswap, Curve, etc.).
  // DEX-type protocols are excluded from lending risk analysis (affected protocols,
  // safety-check positions) since they don't have borrow/liquidation mechanics.
  protocolType: ProtocolType;
  assets: ProtocolAssetConfig[];
  // Optional safe default position used by the safety-check UI. Borrow value is
  // roughly $1,000 and LTV is kept around 30% of max LTV so the initial result
  // is not immediately liquidated or dangerous.
  defaultPosition?: {
    collaterals: { symbol: string; amount: number }[];
    borrows: { symbol: string; amount: number }[];
  };
  // Optional on-chain contract addresses used by the position importer.
  contracts?: {
    pool?: `0x${string}`;
    poolAddressesProvider?: `0x${string}`;
    poolDataProvider?: `0x${string}`;
    rewardsController?: `0x${string}`;
    // Compound V3 Comet (USDC market) for risk parameter reads.
    comet?: `0x${string}`;
    // Compound V2 style comptroller (Venus, BENQI).
    comptroller?: `0x${string}`;
    // Morpho Blue main contract.
    morpho?: `0x${string}`;
    // Morpho Blue market ids keyed by collateral asset symbol.
    // Each id is the bytes32 market identifier used by Morpho.
    morphoMarketIds?: Record<string, `0x${string}`>;
  };
}

function makeAsset(
  symbol: string,
  category: AssetCategory,
  provider: OracleProvider,
  liquidationThreshold: number,
  maxLtv: number,
  collateralFactor?: number,
  exchangeRate?: number,
  priceSymbol?: string,
  exchangeRateSource?: 'lst'
): ProtocolAssetConfig {
  const cf = collateralFactor ?? maxLtv; // Default collateralFactor = maxLtv (conservative estimate)
  const er = exchangeRate ?? 1; // Default exchange rate = 1 (directly holding underlying asset)
  return {
    symbol,
    category,
    oracleProvider: provider,
    priceSymbol,
    collateralFactor: cf,
    liquidationThreshold,
    maxLtv,
    exchangeRate: er,
    exchangeRateSource,
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
    protocolType: 'lending',
    tvlUsd: 12_000_000_000,
    assets: [
      // Aave V3 ETH: LT=83%, LTV=80%, CF=80%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2048, 0.8, 0.8),
      // Aave V3 WBTC: LT=78%, LTV=73%, CF=73%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // Aave V3 tBTC: LT=78%, LTV=73%, CF=73%
      makeAsset('tBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // Aave V3 USDC: LT=80%, LTV=77%, CF=77%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // Aave V3 USDT: LT=80%, LTV=75%, CF=75%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // Aave V3 LINK: LT=68%, LTV=65%, CF=65%
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.4706, 0.65, 0.65),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      pool: AaveV3Ethereum.POOL as `0x${string}`,
      poolAddressesProvider: AaveV3Ethereum.POOL_ADDRESSES_PROVIDER as `0x${string}`,
      poolDataProvider: AaveV3Ethereum.UI_POOL_DATA_PROVIDER as `0x${string}`,
      rewardsController: AaveV3Ethereum.DEFAULT_INCENTIVES_CONTROLLER as `0x${string}`,
    },
  },
  {
    id: 'compound-v3-ethereum',
    name: 'Compound V3',
    chain: 'ethereum' as Blockchain,
    description: 'Algorithmic money market protocol on Ethereum',
    protocolType: 'lending',
    tvlUsd: 2_500_000_000,
    assets: [
      // Compound V3: collateralFactor = collateralFactorMantissa
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83, 0.83),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78, 0.78),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82, 0.82),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8, 0.8),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      comet: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    },
  },
  {
    id: 'uniswap-v3-ethereum',
    name: 'Uniswap V3',
    chain: 'ethereum' as Blockchain,
    description: 'Decentralized exchange with concentrated liquidity',
    protocolType: 'dex',
    tvlUsd: 4_000_000_000,
    assets: [
      // Uniswap V3 TWAP oracle parameters (not lending LT/LTV/CF — used for
      // price deviation tracking only). The liquidationThreshold and maxLtv
      // values represent conservative oracle deviation bounds, not protocol
      // risk parameters, since DEXes do not have liquidation mechanics.
      makeAsset('ETH', 'major', OracleProvider.TWAP, 1.15, 0.85, 0.85),
      makeAsset('WBTC', 'major', OracleProvider.TWAP, 1.2, 0.8, 0.8),
      makeAsset('USDC', 'stablecoin', OracleProvider.TWAP, 1.2, 0.85, 0.85),
      makeAsset('USDT', 'stablecoin', OracleProvider.TWAP, 1.2, 0.85, 0.85),
      makeAsset('LINK', 'alt', OracleProvider.CHAINLINK, 1.35, 0.7, 0.7),
    ],
    // No defaultPosition: DEXes do not have borrow/liquidation positions.
  },
  {
    id: 'aave-v3-arbitrum',
    name: 'Aave V3',
    chain: 'arbitrum' as Blockchain,
    description: 'Aave lending protocol on Arbitrum',
    protocolType: 'lending',
    tvlUsd: 3_000_000_000,
    assets: [
      // Aave V3 ETH: LT=83%, LTV=80%, CF=80%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2048, 0.8, 0.8),
      // Aave V3 WBTC: LT=78%, LTV=73%, CF=73%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // Aave V3 cbBTC: LT=78%, LTV=73%, CF=73%
      makeAsset('cbBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // Aave V3 tBTC: LT=78%, LTV=73%, CF=73%
      makeAsset('tBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // Aave V3 USDC: LT=80%, LTV=77%, CF=77%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // Aave V3 USDT: LT=80%, LTV=75%, CF=75%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // Aave V3 ARB: LT=65%, LTV=50%, CF=50%
      makeAsset('ARB', 'alt', OracleProvider.CHAINLINK, 1.5385, 0.5, 0.5),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      pool: AaveV3Arbitrum.POOL as `0x${string}`,
      poolAddressesProvider: AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER as `0x${string}`,
      poolDataProvider: AaveV3Arbitrum.UI_POOL_DATA_PROVIDER as `0x${string}`,
      rewardsController: AaveV3Arbitrum.DEFAULT_INCENTIVES_CONTROLLER as `0x${string}`,
    },
  },
  {
    id: 'compound-v3-arbitrum',
    name: 'Compound V3',
    chain: 'arbitrum' as Blockchain,
    description: 'Compound lending market on Arbitrum',
    protocolType: 'lending',
    tvlUsd: 800_000_000,
    assets: [
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.15, 0.83, 0.83),
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2, 0.78, 0.78),
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.82, 0.82),
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.2, 0.8, 0.8),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      comet: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
    },
  },
  {
    id: 'aave-v3-base',
    name: 'Aave V3',
    chain: 'base' as Blockchain,
    description: 'Aave lending protocol on Base',
    protocolType: 'lending',
    tvlUsd: 2_000_000_000,
    assets: [
      // Aave V3 Base: ETH LT=83%, LTV=80%, CF=80%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2048, 0.8, 0.8),
      // WBTC LT=78%, LTV=73%, CF=73%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // cbBTC LT=78%, LTV=73%, CF=73%
      makeAsset('cbBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // tBTC LT=78%, LTV=73%, CF=73%
      makeAsset('tBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // USDC LT=80%, LTV=77%, CF=77%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // USDT LT=80%, LTV=75%, CF=75%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // cbETH LT=81%, LTV=78%, CF=78%
      makeAsset('cbETH', 'major', OracleProvider.CHAINLINK, 1.2346, 0.78, 0.78),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      pool: AaveV3Base.POOL as `0x${string}`,
      poolAddressesProvider: AaveV3Base.POOL_ADDRESSES_PROVIDER as `0x${string}`,
      poolDataProvider: AaveV3Base.UI_POOL_DATA_PROVIDER as `0x${string}`,
      rewardsController: AaveV3Base.DEFAULT_INCENTIVES_CONTROLLER as `0x${string}`,
    },
  },
  {
    id: 'compound-v3-base',
    name: 'Compound V3',
    chain: 'base' as Blockchain,
    description: 'Compound lending market on Base',
    protocolType: 'lending',
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
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      comet: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
    },
  },
  {
    id: 'aave-v3-optimism',
    name: 'Aave V3',
    chain: 'optimism' as Blockchain,
    description: 'Aave lending protocol on Optimism',
    protocolType: 'lending',
    tvlUsd: 1_800_000_000,
    assets: [
      // Aave V3 Optimism: ETH LT=83%, LTV=80%, CF=80%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2048, 0.8, 0.8),
      // WBTC LT=78%, LTV=73%, CF=73%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // USDC LT=80%, LTV=77%, CF=77%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // USDT LT=80%, LTV=75%, CF=75%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // DAI LT=80%, LTV=77%, CF=77%
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // wstETH LT=81%, LTV=78%, CF=78%
      makeAsset('wstETH', 'major', OracleProvider.CHAINLINK, 1.2346, 0.78, 0.78),
      // OP LT=65%, LTV=50%, CF=50%
      makeAsset('OP', 'alt', OracleProvider.CHAINLINK, 1.5385, 0.5, 0.5),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      pool: AaveV3Optimism.POOL as `0x${string}`,
      poolAddressesProvider: AaveV3Optimism.POOL_ADDRESSES_PROVIDER as `0x${string}`,
      poolDataProvider: AaveV3Optimism.UI_POOL_DATA_PROVIDER as `0x${string}`,
      rewardsController: AaveV3Optimism.DEFAULT_INCENTIVES_CONTROLLER as `0x${string}`,
    },
  },
  {
    id: 'aave-v3-polygon',
    name: 'Aave V3',
    chain: 'polygon' as Blockchain,
    description: 'Aave lending protocol on Polygon',
    protocolType: 'lending',
    tvlUsd: 1_200_000_000,
    assets: [
      // Aave V3 Polygon: ETH LT=83%, LTV=80%, CF=80%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.2048, 0.8, 0.8),
      // WBTC LT=78%, LTV=73%, CF=73%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2821, 0.73, 0.73),
      // USDC LT=80%, LTV=77%, CF=77%
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // USDT LT=80%, LTV=75%, CF=75%
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.75, 0.75),
      // DAI LT=80%, LTV=77%, CF=77%
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.25, 0.77, 0.77),
      // wstETH LT=81%, LTV=78%, CF=78%
      makeAsset('wstETH', 'major', OracleProvider.CHAINLINK, 1.2346, 0.78, 0.78),
      // MATIC LT=65%, LTV=50%, CF=50%
      makeAsset('MATIC', 'alt', OracleProvider.CHAINLINK, 1.5385, 0.5, 0.5),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      pool: AaveV3Polygon.POOL as `0x${string}`,
      poolAddressesProvider: AaveV3Polygon.POOL_ADDRESSES_PROVIDER as `0x${string}`,
      poolDataProvider: AaveV3Polygon.UI_POOL_DATA_PROVIDER as `0x${string}`,
      rewardsController: AaveV3Polygon.DEFAULT_INCENTIVES_CONTROLLER as `0x${string}`,
    },
  },
  {
    id: 'morpho-blue-base',
    name: 'Morpho Blue',
    chain: 'base' as Blockchain,
    description: 'Permissionless lending engine with isolated markets on Base',
    protocolType: 'lending',
    tvlUsd: 5_000_000_000,
    assets: [
      // Morpho Blue Base: isolated markets (LLTV = liquidation loan-to-value)
      // ETH/USDC market: LLTV=86%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.1628, 0.86, 0.86),
      // WBTC/USDC market: LLTV=77%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2987, 0.77, 0.77),
      // cbBTC/USDC market: LLTV=86%
      makeAsset('cbBTC', 'major', OracleProvider.CHAINLINK, 1.1628, 0.86, 0.86),
      // cbETH/ETH market: LLTV=94.5% (highly correlated LST)
      makeAsset('cbETH', 'major', OracleProvider.CHAINLINK, 1.0582, 0.945, 0.945),
      // wstETH/ETH market: LLTV=96.5%
      makeAsset('wstETH', 'major', OracleProvider.CHAINLINK, 1.0363, 0.965, 0.965),
      // USDC (primary borrow asset, stablecoin-correlated LLTV=94.5%)
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.0582, 0.945, 0.945),
      // USDT (borrow asset, stablecoin-correlated LLTV=94.5%)
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.0582, 0.945, 0.945),
      // DAI (borrow asset, stablecoin-correlated LLTV=94.5%)
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.0582, 0.945, 0.945),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      morpho: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    },
  },
  {
    id: 'morpho-blue-ethereum',
    name: 'Morpho Blue',
    chain: 'ethereum' as Blockchain,
    description: 'Permissionless lending engine with isolated markets on Ethereum',
    protocolType: 'lending',
    tvlUsd: 8_000_000_000,
    assets: [
      // Morpho Blue: isolated markets, each with a single LLTV
      // Governance-approved LLTVs: 86%, 91.5%, 94.5%, 96.5% (per docs.morpho.org)
      // ETH/USDC market: LLTV=86%
      makeAsset('ETH', 'major', OracleProvider.CHAINLINK, 1.1628, 0.86, 0.86),
      // WBTC/USDC market: LLTV=77%
      makeAsset('WBTC', 'major', OracleProvider.CHAINLINK, 1.2987, 0.77, 0.77),
      // tBTC/USDC market: LLTV=77%
      makeAsset('tBTC', 'major', OracleProvider.CHAINLINK, 1.2987, 0.77, 0.77),
      // wstETH/ETH market: LLTV=94.5% (highly correlated)
      makeAsset('wstETH', 'major', OracleProvider.CHAINLINK, 1.0582, 0.945, 0.945),
      // USDC (primary borrow asset in most markets)
      makeAsset('USDC', 'stablecoin', OracleProvider.CHAINLINK, 1.0406, 0.96, 0.96),
      // USDT (borrow asset)
      makeAsset('USDT', 'stablecoin', OracleProvider.CHAINLINK, 1.0406, 0.96, 0.96),
      // DAI (borrow asset)
      makeAsset('DAI', 'stablecoin', OracleProvider.CHAINLINK, 1.0406, 0.96, 0.96),
    ],
    defaultPosition: {
      collaterals: [{ symbol: 'ETH', amount: 2.5 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      morpho: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    },
  },
  {
    id: 'venus-bnb-chain',
    name: 'Venus Protocol',
    chain: 'bnb-chain' as Blockchain,
    description: 'Leading lending protocol on BNB Chain',
    protocolType: 'lending',
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
    defaultPosition: {
      collaterals: [{ symbol: 'BNB', amount: 7 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      comptroller: '0xfD36E2c2a6789Df231b53C25fF7a1858cE130693',
    },
  },
  {
    id: 'benqi-avalanche',
    name: 'BENQI',
    chain: 'avalanche' as Blockchain,
    description: 'Leading lending protocol on Avalanche',
    protocolType: 'lending',
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
    defaultPosition: {
      collaterals: [{ symbol: 'AVAX', amount: 700 }],
      borrows: [{ symbol: 'USDC', amount: 1000 }],
    },
    contracts: {
      comptroller: '0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4',
    },
  },
];

export function getProtocolById(id: string): ProtocolConfig | undefined {
  return PROTOCOL_REGISTRY.find((p) => p.id === id);
}
