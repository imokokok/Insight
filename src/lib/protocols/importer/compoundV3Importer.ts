import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { getChainId } from './chainId';
import { readContract } from './rpcClient';
import { normalizeSymbol, readTokenDecimals, readTokenSymbol, toHumanAmount } from './shared';

import type { ImportedPosition, SkippedAssetEntry } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('compound-v3-importer');

// Compound V3 "Comet" interface (the USDC-base money market).
const COMET_ABI = [
  {
    type: 'function',
    name: 'baseToken',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getAssetList',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getCollateralBalance',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'asset', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getBorrowBalance',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'int256' }],
  },
] as const;

// Compound V3 stores base-token balances with a fixed 1e8 mantissa. One base
// unit (1e8) equals one whole base token (e.g. 1 USDC), so dividing the raw
// borrow by 1e8 yields the human-readable borrow amount.
const BASE_MANTISSA = 100_000_000n;

async function callComet<T>(
  chainId: number,
  comet: `0x${string}`,
  functionName: string,
  args: readonly unknown[]
): Promise<T> {
  const data = encodeFunctionData({
    abi: COMET_ABI,
    functionName: functionName as never,
    args: args as never,
  });
  const result = await readContract(chainId, comet, data);
  return decodeFunctionResult({
    abi: COMET_ABI,
    functionName: functionName as never,
    data: result as `0x${string}`,
  }) as T;
}

export async function importCompoundV3Position(
  protocol: ProtocolConfig,
  address: `0x${string}`
): Promise<ImportedPosition> {
  const comet = protocol.contracts?.comet;
  if (!comet) {
    throw new ValidationError(`Protocol ${protocol.name} does not support on-chain import`, {
      details: { protocolId: protocol.id },
    });
  }

  const chainId = getChainId(protocol.chain);
  const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));

  const baseToken = (await callComet<`0x${string}`>(chainId, comet, 'baseToken', [])).toLowerCase();

  // Compound V3's `getBorrowBalance`/`getAssetList`/`getCollateralBalance` REVERT
  // (rather than returning zero/empty) for any address that has never opened a
  // position in this market. Guard each call so a position-less wallet yields an
  // empty result instead of a hard error — this is the common case for a safety
  // check against a wallet that simply has no Compound V3 exposure.
  let borrowRaw = 0n;
  try {
    borrowRaw = await callComet<bigint>(chainId, comet, 'getBorrowBalance', [address]);
  } catch (error) {
    logger.warn('getBorrowBalance reverted (no Compound V3 position?)', {
      chainId,
      address,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  let assets: readonly `0x${string}`[] = [];
  try {
    assets = await callComet<readonly `0x${string}`[]>(chainId, comet, 'getAssetList', [address]);
  } catch (error) {
    logger.warn('getAssetList reverted (no Compound V3 collateral?)', {
      chainId,
      address,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const collaterals: ImportedPosition['collaterals'] = [];
  const borrows: ImportedPosition['borrows'] = [];
  const skippedAssets: SkippedAssetEntry[] = [];
  const rawPositions: unknown[] = [];

  // Borrowed base token (Compound V3 only allows borrowing the base asset).
  if (borrowRaw > 0n) {
    const symbol = normalizeSymbol(await readTokenSymbol(chainId, baseToken as `0x${string}`));
    const decimals = await readTokenDecimals(chainId, baseToken as `0x${string}`);
    const amount = Number(borrowRaw / BASE_MANTISSA);
    if (supportedSymbols.has(symbol)) {
      borrows.push({ symbol, amount, decimals, underlyingAsset: baseToken as `0x${string}` });
    } else {
      skippedAssets.push({
        underlyingAsset: baseToken as `0x${string}`,
        symbol,
        reason: 'unsupported',
      });
    }
    rawPositions.push({ kind: 'borrow', symbol, amount, underlyingAsset: baseToken });
  }

  for (const asset of assets) {
    const assetLower = asset.toLowerCase();
    // The base token cannot be collateral; a base-token supply position is not
    // relevant to liquidation risk and is skipped.
    if (assetLower === baseToken) continue;

    let collateralRaw = 0n;
    try {
      collateralRaw = await callComet<bigint>(chainId, comet, 'getCollateralBalance', [
        address,
        asset,
      ]);
    } catch (error) {
      // getCollateralBalance reverts for position-less assets; treat as zero.
      logger.warn('getCollateralBalance reverted (no Compound V3 collateral for asset?)', {
        chainId,
        address,
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (collateralRaw <= 0n) continue;

    const symbol = normalizeSymbol(await readTokenSymbol(chainId, asset));
    const decimals = await readTokenDecimals(chainId, asset);
    const amount = toHumanAmount(collateralRaw, decimals);

    if (!supportedSymbols.has(symbol)) {
      skippedAssets.push({ underlyingAsset: asset, symbol, reason: 'unsupported' });
      continue;
    }
    if (amount > 1e-12) {
      collaterals.push({ symbol, amount, decimals, underlyingAsset: asset });
      rawPositions.push({ kind: 'collateral', symbol, amount, underlyingAsset: asset });
    }
  }

  logger.info(
    `Imported Compound V3 position for ${address} on ${protocol.id}: ${collaterals.length} collaterals, ${borrows.length} borrows, ${skippedAssets.length} skipped`
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
