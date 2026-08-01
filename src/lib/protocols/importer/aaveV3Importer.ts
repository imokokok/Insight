import { IUiPoolDataProvider_ABI } from '@aave-dao/aave-address-book/abis';
import { decodeFunctionResult, encodeFunctionData, formatUnits } from 'viem';

import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { getChainId } from './chainId';
import { readContract } from './rpcClient';

import type { ImportedAssetEntry, ImportedPosition, SkippedAssetEntry } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('aave-v3-importer');

const RAY = 10n ** 27n;

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

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

interface ReserveData {
  underlyingAsset: `0x${string}`;
  symbol: string;
  decimals: bigint;
  liquidityIndex: bigint;
  variableBorrowIndex: bigint;
  priceInMarketReferenceCurrency: bigint;
  stableDebtTokenAddress: `0x${string}`;
}

interface UserReserveData {
  underlyingAsset: `0x${string}`;
  scaledATokenBalance: bigint;
  usageAsCollateralEnabledOnUser: boolean;
  stableBorrowRate: bigint;
  scaledVariableDebt: bigint;
  principalStableDebt: bigint;
  stableBorrowLastUpdateTimestamp: bigint;
}

async function callUiPoolDataProvider<T>(
  chainId: number,
  dataProvider: `0x${string}`,
  functionName: string,
  args: readonly unknown[]
): Promise<T> {
  const data = encodeFunctionData({
    abi: IUiPoolDataProvider_ABI,
    functionName: functionName as never,
    args: args as never,
  });

  const result = await readContract(chainId, dataProvider, data);

  return decodeFunctionResult({
    abi: IUiPoolDataProvider_ABI,
    functionName: functionName as never,
    data: result as `0x${string}`,
  }) as T;
}

async function readStableDebtBalance(
  chainId: number,
  stableDebtToken: `0x${string}`,
  address: `0x${string}`
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const result = await readContract(chainId, stableDebtToken, data);

  return decodeFunctionResult({
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    data: result as `0x${string}`,
  }) as bigint;
}

function toReserveData(raw: unknown): ReserveData {
  const r = raw as Record<string, unknown>;
  return {
    underlyingAsset: (r.underlyingAsset as `0x${string}`).toLowerCase() as `0x${string}`,
    symbol: String(r.symbol),
    decimals: BigInt(r.decimals as bigint | number | string),
    liquidityIndex: BigInt(r.liquidityIndex as bigint | number | string),
    variableBorrowIndex: BigInt(r.variableBorrowIndex as bigint | number | string),
    priceInMarketReferenceCurrency: BigInt(
      r.priceInMarketReferenceCurrency as bigint | number | string
    ),
    stableDebtTokenAddress: (
      r.stableDebtTokenAddress as `0x${string}`
    ).toLowerCase() as `0x${string}`,
  };
}

function toUserReserveData(raw: unknown): UserReserveData {
  const r = raw as Record<string, unknown>;
  return {
    underlyingAsset: (r.underlyingAsset as `0x${string}`).toLowerCase() as `0x${string}`,
    scaledATokenBalance: BigInt(r.scaledATokenBalance as bigint | number | string),
    usageAsCollateralEnabledOnUser: Boolean(r.usageAsCollateralEnabledOnUser),
    stableBorrowRate: BigInt(r.stableBorrowRate as bigint | number | string),
    scaledVariableDebt: BigInt(r.scaledVariableDebt as bigint | number | string),
    principalStableDebt: BigInt(r.principalStableDebt as bigint | number | string),
    stableBorrowLastUpdateTimestamp: BigInt(
      r.stableBorrowLastUpdateTimestamp as bigint | number | string
    ),
  };
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
  const provider = protocol.contracts.poolAddressesProvider;

  const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));

  const [reservesResult] = await callUiPoolDataProvider<[readonly unknown[], unknown]>(
    chainId,
    dataProvider,
    'getReservesData',
    [provider]
  );

  const reserveMap = new Map<string, ReserveData>();
  for (const raw of reservesResult) {
    const reserve = toReserveData(raw);
    reserveMap.set(reserve.underlyingAsset, reserve);
  }

  const [userReservesResult] = await callUiPoolDataProvider<[readonly unknown[], number]>(
    chainId,
    dataProvider,
    'getUserReservesData',
    [provider, address]
  );

  const userReserves = userReservesResult.map(toUserReserveData);

  const collaterals: ImportedAssetEntry[] = [];
  const borrows: ImportedAssetEntry[] = [];
  const skippedAssets: SkippedAssetEntry[] = [];
  const rawPositions: unknown[] = [];

  for (const userReserve of userReserves) {
    const reserve = reserveMap.get(userReserve.underlyingAsset);
    if (!reserve) {
      skippedAssets.push({
        underlyingAsset: userReserve.underlyingAsset,
        symbol: 'Unknown',
        reason: 'unknown_reserve',
      });
      continue;
    }

    const normalizedSymbol = normalizeSymbol(reserve.symbol);
    if (!supportedSymbols.has(normalizedSymbol)) {
      skippedAssets.push({
        underlyingAsset: reserve.underlyingAsset,
        symbol: reserve.symbol,
        reason: 'unsupported',
      });
      continue;
    }

    const decimals = Number(reserve.decimals);

    if (userReserve.scaledATokenBalance > 0n && userReserve.usageAsCollateralEnabledOnUser) {
      const rawCollateral = (userReserve.scaledATokenBalance * reserve.liquidityIndex) / RAY;
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
      const rawVariableDebt = (userReserve.scaledVariableDebt * reserve.variableBorrowIndex) / RAY;
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

    if (userReserve.principalStableDebt > 0n && reserve.stableDebtTokenAddress) {
      try {
        const stableBalance = await readStableDebtBalance(
          chainId,
          reserve.stableDebtTokenAddress,
          address
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
        logger.warn('Failed to read stable debt balance, falling back to principal', {
          underlyingAsset: userReserve.underlyingAsset,
          stableDebtToken: reserve.stableDebtTokenAddress,
          error: error instanceof Error ? error.message : String(error),
        });
        const amount = Number(formatUnits(userReserve.principalStableDebt, decimals));
        if (amount > 1e-12) {
          borrows.push({
            symbol: normalizedSymbol,
            amount,
            decimals,
            underlyingAsset: userReserve.underlyingAsset,
          });
        }
      }
    }

    if (
      userReserve.scaledATokenBalance > 0n ||
      userReserve.scaledVariableDebt > 0n ||
      userReserve.principalStableDebt > 0n
    ) {
      rawPositions.push({
        ...userReserve,
        symbol: reserve.symbol,
        normalizedSymbol,
        decimals,
      });
    }
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
