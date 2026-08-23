import { decodeFunctionResult, encodeFunctionData, keccak256, stringToHex } from 'viem';

import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { getChainId } from './chainId';
import { getBlockNumber, getLogs, readContract } from './rpcClient';
import { normalizeSymbol, readTokenDecimals, readTokenSymbol, toHumanAmount } from './shared';

import type { ImportedPosition, SkippedAssetEntry } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('morpho-blue-importer');

// Morpho Blue main contract interface (permissionless isolated lending markets).
const MORPHO_BLUE_ABI = [
  {
    type: 'function',
    name: 'idToMarketParams',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { type: 'address' },
          { type: 'address' },
          { type: 'address' },
          { type: 'address' },
          { type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'market',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    // Morpho Blue's `market(bytes32)` returns ONLY the `Market` state struct
    // (6 words). Market parameters (loan/collateral token, oracle, irm, lltv)
    // come from the separate `idToMarketParams(bytes32)` call.
    outputs: [
      {
        type: 'tuple',
        components: [
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'position',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      {
        type: 'tuple',
        components: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
      },
    ],
  },
] as const;

// Morpho Blue deployment blocks, used as the lower bound for position-event
// scans. Scanning from `earliest` would span millions of blocks and trip RPC
// range caps, so we start at deployment.
const MORPHO_DEPLOY_BLOCK: Partial<Record<number, number>> = {
  1: 17_600_000, // Ethereum mainnet
  8453: 3_000_000, // Base
};

const SUPPLY_SIG = keccak256(stringToHex('Supply(bytes32,address,address,uint256,uint256)'));

interface LogShape {
  topics: string[];
  data: string;
}

async function callMorpho<T>(
  chainId: number,
  morpho: `0x${string}`,
  functionName: string,
  args: readonly unknown[]
): Promise<T> {
  const data = encodeFunctionData({
    abi: MORPHO_BLUE_ABI,
    functionName: functionName as never,
    args: args as never,
  });
  const result = await readContract(chainId, morpho, data);
  return decodeFunctionResult({
    abi: MORPHO_BLUE_ABI,
    functionName: functionName as never,
    data: result as `0x${string}`,
  }) as T;
}

// Morpho Blue log scans are chunked backward from the latest block in bounded
// windows. Scanning the full history (deploy block → latest) trips RPC range
// caps, so we walk backward in fixed-size chunks and stop at the deploy block.
// A single `Supply` scan covers every position opener, because a borrower must
// supply collateral before borrowing — so scanning `Supply` alone is sufficient
// to discover a user's markets while halving the number of log queries.
const MORPHO_CHUNK = 2000n;
const MORPHO_MAX_CHUNKS = 150; // ~300k blocks back (~34 days on Ethereum)

async function getUserMarketIds(
  chainId: number,
  morpho: `0x${string}`,
  address: `0x${string}`
): Promise<Set<`0x${string}`>> {
  const deployBlock = MORPHO_DEPLOY_BLOCK[chainId];
  if (!deployBlock) {
    logger.warn(`No Morpho Blue deploy block known for chain ${chainId}; skipping log scan`);
    return new Set();
  }

  const ids = new Set<`0x${string}`>();
  const addrLower = address.toLowerCase();
  try {
    const latest = await getBlockNumber(chainId);
    for (let i = 0n; i < MORPHO_MAX_CHUNKS; i++) {
      const to = latest - i * MORPHO_CHUNK;
      const from = to - MORPHO_CHUNK + 1n;
      const fromClamped = from < deployBlock ? deployBlock : from;
      // Scan all `Supply` events (no `null` topic wildcard — several public
      // RPCs reject null topic placeholders) and filter by owner client-side.
      const logs = (await getLogs(chainId, {
        address: morpho,
        fromBlock: Number(fromClamped),
        toBlock: Number(to),
        topics: [SUPPLY_SIG],
      })) as LogShape[];
      for (const log of logs) {
        const owner = log.topics[2];
        if (owner && owner.toLowerCase() === addrLower) {
          const id = log.topics[1] as `0x${string}` | undefined;
          if (id) ids.add(id);
        }
      }
      if (fromClamped <= deployBlock) break;
    }
  } catch (error) {
    // RPC range caps or log-index unavailability can make this scan fail.
    // Degrade gracefully: the user simply has no discoverable Morpho markets.
    logger.warn('Morpho Blue log scan failed; returning no markets', {
      chainId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return ids;
}

export async function importMorphoBluePosition(
  protocol: ProtocolConfig,
  address: `0x${string}`
): Promise<ImportedPosition> {
  const morpho = protocol.contracts?.morpho;
  if (!morpho) {
    throw new ValidationError(`Protocol ${protocol.name} does not support on-chain import`, {
      details: { protocolId: protocol.id },
    });
  }

  const chainId = getChainId(protocol.chain);
  const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));

  const marketIds = await getUserMarketIds(chainId, morpho, address);

  const collaterals: ImportedPosition['collaterals'] = [];
  const borrows: ImportedPosition['borrows'] = [];
  const skippedAssets: SkippedAssetEntry[] = [];
  const rawPositions: unknown[] = [];

  for (const id of marketIds) {
    // `idToMarketParams(bytes32)` → loan/collateral tokens, oracle, irm, lltv.
    const [loanToken, collateralToken] = await callMorpho<
      [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint]
    >(chainId, morpho, 'idToMarketParams', [id]);
    // `market(bytes32)` → Market state (totalSupply/Shares, totalBorrow*,
    // lastUpdate, fee). NOTE: it returns ONLY the Market struct, not
    // (params, market) — declaring the wrong shape silently corrupts decoding.
    const marketState = await callMorpho<[bigint, bigint, bigint, bigint, bigint, bigint]>(
      chainId,
      morpho,
      'market',
      [id]
    );
    const [, , totalBorrowAssets, totalBorrowShares] = marketState;

    const [supplyShares, borrowShares, collateralRaw] = await callMorpho<[bigint, bigint, bigint]>(
      chainId,
      morpho,
      'position',
      [id, address]
    );

    // Collateral is in raw collateral-token units (no shares).
    if (collateralRaw > 0n) {
      const symbol = normalizeSymbol(await readTokenSymbol(chainId, collateralToken));
      const decimals = await readTokenDecimals(chainId, collateralToken);
      const amount = toHumanAmount(collateralRaw, decimals);
      if (amount > 1e-12) {
        if (supportedSymbols.has(symbol)) {
          collaterals.push({ symbol, amount, decimals, underlyingAsset: collateralToken });
          rawPositions.push({
            kind: 'collateral',
            symbol,
            amount,
            underlyingAsset: collateralToken,
          });
        } else {
          skippedAssets.push({ underlyingAsset: collateralToken, symbol, reason: 'unsupported' });
        }
      }
    }

    // Borrow shares are converted to assets using the market's share ratio.
    if (borrowShares > 0n && totalBorrowShares > 0n) {
      const borrowRaw = (borrowShares * totalBorrowAssets) / totalBorrowShares;
      const symbol = normalizeSymbol(await readTokenSymbol(chainId, loanToken));
      const decimals = await readTokenDecimals(chainId, loanToken);
      const amount = toHumanAmount(borrowRaw, decimals);
      if (amount > 1e-12) {
        if (supportedSymbols.has(symbol)) {
          borrows.push({ symbol, amount, decimals, underlyingAsset: loanToken });
          rawPositions.push({ kind: 'borrow', symbol, amount, underlyingAsset: loanToken });
        } else {
          skippedAssets.push({ underlyingAsset: loanToken, symbol, reason: 'unsupported' });
        }
      }
    }

    void supplyShares;
  }

  logger.info(
    `Imported Morpho Blue position for ${address} on ${protocol.id}: ${collaterals.length} collaterals, ${borrows.length} borrows, ${skippedAssets.length} skipped (${marketIds.size} markets scanned)`
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
