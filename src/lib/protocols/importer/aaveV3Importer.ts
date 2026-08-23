import { type Abi, decodeFunctionResult, encodeFunctionData, formatUnits } from 'viem';

import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { getChainId } from './chainId';
import { readContract } from './rpcClient';

import type { ImportedAssetEntry, ImportedPosition, SkippedAssetEntry } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('aave-v3-importer');

const RAY = 10n ** 27n;

// Aave reserves use WETH/WPOL/etc. but the registry uses ETH/MATIC/etc.
const SYMBOL_NORMALIZATION: Record<string, string> = {
  WETH: 'ETH',
  WPOL: 'MATIC',
  USDCn: 'USDC',
  USDT0: 'USDT',
  USDbC: 'USDC',
};

function normalizeSymbol(aaveSymbol: string): string {
  return SYMBOL_NORMALIZATION[aaveSymbol] ?? aaveSymbol;
}

// The deployed UiPoolDataProvider (IUiPoolDataProvider_ABI from the address book)
// returns structs whose bool fields are encoded as uint256 and whose
// AggregatedReserveData layout differs from the published ABI, so decoding with
// the package ABI throws "Bytes value ... is not a valid boolean". We therefore
// decode with local ABIs that match the on-chain return shapes exactly.
//
// getUserReservesData(provider, user) -> (UserReserveData[], uint8)
//   UserReserveData { underlyingAsset, scaledATokenBalance, usageAsCollateralEnabledOnUser, scaledVariableDebt }
const GET_USER_RESERVES_ABI = [
  {
    type: 'function',
    name: 'getUserReservesData',
    stateMutability: 'view',
    inputs: [
      { name: 'provider', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'underlyingAsset', type: 'address' },
          { name: 'scaledATokenBalance', type: 'uint256' },
          { name: 'usageAsCollateralEnabledOnUser', type: 'uint256' },
          { name: 'scaledVariableDebt', type: 'uint256' },
        ],
      },
      { name: '', type: 'uint8' },
    ],
  },
] as const;

// IPool.getReserveData(asset) -> ReserveData (single tuple; the deployed pool
// returns the legacy 15-field ReserveData without the trailing
// flashLoanLiquidityPremium / underlyingAsset fields and without the second
// ReserveConfigurationMap component).
const GET_RESERVE_DATA_ABI = [
  {
    type: 'function',
    name: 'getReserveData',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'configuration', type: 'uint256' },
          { name: 'liquidityIndex', type: 'uint128' },
          { name: 'variableBorrowIndex', type: 'uint128' },
          { name: 'currentLiquidityRate', type: 'uint128' },
          { name: 'currentVariableBorrowRate', type: 'uint128' },
          { name: 'currentStableBorrowRate', type: 'uint128' },
          { name: 'lastUpdateTimestamp', type: 'uint40' },
          { name: 'id', type: 'uint16' },
          { name: 'aTokenAddress', type: 'address' },
          { name: 'stableDebtTokenAddress', type: 'address' },
          { name: 'variableDebtTokenAddress', type: 'address' },
          { name: 'interestRateStrategyAddress', type: 'address' },
          { name: 'accruedToTreasury', type: 'uint128' },
          { name: 'unbacked', type: 'uint128' },
          { name: 'isolationModeTotalDebt', type: 'uint128' },
        ],
      },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

async function callView<T>(
  chainId: number,
  to: `0x${string}`,
  abi: Abi,
  functionName: string,
  args: readonly unknown[]
): Promise<T> {
  const data = encodeFunctionData({
    abi,
    functionName: functionName as never,
    args: args as never,
  });
  const result = await readContract(chainId, to, data);
  return decodeFunctionResult({
    abi,
    functionName: functionName as never,
    data: result as `0x${string}`,
  }) as T;
}

interface UserReserve {
  underlyingAsset: `0x${string}`;
  scaledATokenBalance: bigint;
  usageAsCollateralEnabledOnUser: bigint;
  scaledVariableDebt: bigint;
}

interface ReserveMeta {
  liquidityIndex: bigint;
  variableBorrowIndex: bigint;
  aTokenAddress: `0x${string}`;
  stableDebtTokenAddress: `0x${string}`;
  variableDebtTokenAddress: `0x${string}`;
  symbol: string;
  decimals: number;
}

export async function importAaveV3Position(
  protocol: ProtocolConfig,
  address: `0x${string}`
): Promise<ImportedPosition> {
  if (!protocol.contracts?.poolDataProvider || !protocol.contracts.poolAddressesProvider) {
    throw new ValidationError(`Protocol ${protocol.name} does not support on-chain import`, {
      details: { protocolId: protocol.id },
    });
  }

  const chainId = getChainId(protocol.chain);
  const dataProvider = protocol.contracts.poolDataProvider;
  const pool = protocol.contracts.pool;
  const provider = protocol.contracts.poolAddressesProvider;

  if (!pool) {
    throw new ValidationError(`Protocol ${protocol.name} is missing the pool contract address`, {
      details: { protocolId: protocol.id },
    });
  }

  const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));

  const [userReservesResult] = await callView<[readonly UserReserve[], number]>(
    chainId,
    dataProvider,
    GET_USER_RESERVES_ABI,
    'getUserReservesData',
    [provider, address]
  );

  const userReserves = userReservesResult.map((r) => ({
    underlyingAsset: (r.underlyingAsset as `0x${string}`).toLowerCase() as `0x${string}`,
    scaledATokenBalance: BigInt(r.scaledATokenBalance as bigint | number | string),
    usageAsCollateralEnabledOnUser: BigInt(
      r.usageAsCollateralEnabledOnUser as bigint | number | string
    ),
    scaledVariableDebt: BigInt(r.scaledVariableDebt as bigint | number | string),
  }));

  const collaterals: ImportedAssetEntry[] = [];
  const borrows: ImportedAssetEntry[] = [];
  const skippedAssets: SkippedAssetEntry[] = [];
  const rawPositions: unknown[] = [];

  for (const userReserve of userReserves) {
    // Skip reserves the user has no position in (collateral, variable debt, or
    // collateral-enabled). NOTE: a borrower with *only* stable-rate debt and no
    // aToken/collateral/variable-debt on this reserve is skipped here — stable
    // debt is only captured when the reserve also passes this guard, because we
    // discover the stable debt token via getReserveData below. This is an
    // accepted edge case (stable-rate V3 borrowing is rare); the common case is
    // a borrower who also has collateral enabled or variable debt on the asset.
    const hasScaledPosition =
      userReserve.scaledATokenBalance > 0n ||
      userReserve.scaledVariableDebt > 0n ||
      userReserve.usageAsCollateralEnabledOnUser > 0n;
    if (!hasScaledPosition) continue;

    let meta: ReserveMeta;
    try {
      meta = await readReserveMeta(chainId, pool, userReserve.underlyingAsset);
    } catch (error) {
      logger.warn('Failed to read Aave reserve metadata; skipping reserve', {
        chainId,
        asset: userReserve.underlyingAsset,
        error: error instanceof Error ? error.message : String(error),
      });
      skippedAssets.push({
        underlyingAsset: userReserve.underlyingAsset,
        symbol: 'Unknown',
        reason: 'reserve_metadata_unavailable',
      });
      continue;
    }

    const normalizedSymbol = normalizeSymbol(meta.symbol);
    if (!supportedSymbols.has(normalizedSymbol)) {
      skippedAssets.push({
        underlyingAsset: userReserve.underlyingAsset,
        symbol: meta.symbol,
        reason: 'unsupported',
      });
      continue;
    }

    const decimals = meta.decimals;

    if (userReserve.scaledATokenBalance > 0n && userReserve.usageAsCollateralEnabledOnUser > 0n) {
      const rawCollateral = (userReserve.scaledATokenBalance * meta.liquidityIndex) / RAY;
      const amount = Number(formatUnits(rawCollateral, decimals));
      if (amount > 1e-12) {
        collaterals.push({
          symbol: normalizedSymbol,
          amount,
          decimals,
          underlyingAsset: userReserve.underlyingAsset,
        });
      }
    }

    if (userReserve.scaledVariableDebt > 0n) {
      const rawVariableDebt = (userReserve.scaledVariableDebt * meta.variableBorrowIndex) / RAY;
      const amount = Number(formatUnits(rawVariableDebt, decimals));
      if (amount > 1e-12) {
        borrows.push({
          symbol: normalizedSymbol,
          amount,
          decimals,
          underlyingAsset: userReserve.underlyingAsset,
        });
      }
    }

    // Stable debt: read the actual balance from the stable debt token.
    if (meta.stableDebtTokenAddress) {
      try {
        const stableBalance = await callView<bigint>(
          chainId,
          meta.stableDebtTokenAddress,
          ERC20_ABI,
          'balanceOf',
          [address]
        );
        if (stableBalance > 0n) {
          const amount = Number(formatUnits(stableBalance, decimals));
          if (amount > 1e-12) {
            borrows.push({
              symbol: normalizedSymbol,
              amount,
              decimals,
              underlyingAsset: userReserve.underlyingAsset,
            });
          }
        }
      } catch (error) {
        logger.warn('Failed to read Aave stable debt balance', {
          chainId,
          asset: userReserve.underlyingAsset,
          stableDebtToken: meta.stableDebtTokenAddress,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    rawPositions.push({
      ...userReserve,
      symbol: meta.symbol,
      normalizedSymbol,
      decimals,
    });
  }

  logger.info(
    `Imported Aave V3 position for ${address} on ${protocol.id}: ${collaterals.length} collaterals, ${borrows.length} borrows, ${skippedAssets.length} skipped`
  );

  return {
    address,
    protocolId: protocol.id,
    collaterals,
    borrows,
    skippedAssets,
    rawPositions,
    importedAt: Date.now(),
  };
}

async function readReserveMeta(
  chainId: number,
  pool: `0x${string}`,
  asset: `0x${string}`
): Promise<ReserveMeta> {
  const reserveData = await callView<Record<string, unknown>>(
    chainId,
    pool,
    GET_RESERVE_DATA_ABI,
    'getReserveData',
    [asset]
  );
  const rd = (Array.isArray(reserveData) ? reserveData[0] : reserveData) as Record<string, unknown>;

  const [symbol, decimalsRaw] = await Promise.all([
    callView<string>(chainId, asset, ERC20_ABI, 'symbol', []),
    callView<number>(chainId, asset, ERC20_ABI, 'decimals', []),
  ]);

  return {
    liquidityIndex: BigInt(rd.liquidityIndex as bigint | number | string),
    variableBorrowIndex: BigInt(rd.variableBorrowIndex as bigint | number | string),
    aTokenAddress: (rd.aTokenAddress as `0x${string}`).toLowerCase() as `0x${string}`,
    stableDebtTokenAddress: (
      rd.stableDebtTokenAddress as `0x${string}`
    ).toLowerCase() as `0x${string}`,
    variableDebtTokenAddress: (
      rd.variableDebtTokenAddress as `0x${string}`
    ).toLowerCase() as `0x${string}`,
    symbol,
    decimals: Number(decimalsRaw),
  };
}
