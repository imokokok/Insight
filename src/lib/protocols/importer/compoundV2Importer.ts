import { decodeFunctionResult, encodeFunctionData } from 'viem';

import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { getChainId } from './chainId';
import { readContract } from './rpcClient';
import { normalizeSymbol, readTokenDecimals, readTokenSymbol, toHumanAmount } from './shared';

import type { ImportedPosition, SkippedAssetEntry } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('compound-v2-importer');

// Compound V2-style comptroller (Venus, BENQI are Compound V2 forks).
const COMPTROLLER_ABI = [
  {
    type: 'function',
    name: 'getAllMarkets',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'checkMembership',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'cToken', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const CTOKEN_ABI = [
  {
    type: 'function',
    name: 'underlying',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
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
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'borrowBalanceStored',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'exchangeRateStored',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const EXCHANGE_RATE_SCALE = 10n ** 18n;

async function callComptroller<T>(
  chainId: number,
  comptroller: `0x${string}`,
  functionName: string,
  args: readonly unknown[]
): Promise<T> {
  const data = encodeFunctionData({
    abi: COMPTROLLER_ABI,
    functionName: functionName as never,
    args: args as never,
  });
  const result = await readContract(chainId, comptroller, data);
  return decodeFunctionResult({
    abi: COMPTROLLER_ABI,
    functionName: functionName as never,
    data: result as `0x${string}`,
  }) as T;
}

async function callCToken<T>(
  chainId: number,
  cToken: `0x${string}`,
  functionName: string,
  args: readonly unknown[]
): Promise<T> {
  const data = encodeFunctionData({
    abi: CTOKEN_ABI,
    functionName: functionName as never,
    args: args as never,
  });
  const result = await readContract(chainId, cToken, data);
  return decodeFunctionResult({
    abi: CTOKEN_ABI,
    functionName: functionName as never,
    data: result as `0x${string}`,
  }) as T;
}

// Native-gas markets (qAVAX on BENQI, vBNB on Venus) have no `underlying()`
// contract. Derive the symbol from the cToken ticker by stripping the protocol
// prefix.
function nativeSymbolFromCToken(cTokenSymbol: string): string | null {
  const map: Record<string, string> = {
    qAVAX: 'AVAX',
    vBNB: 'BNB',
    cETH: 'ETH',
    cAVAX: 'AVAX',
  };
  return map[cTokenSymbol] ?? null;
}

export async function importCompoundV2Position(
  protocol: ProtocolConfig,
  address: `0x${string}`
): Promise<ImportedPosition> {
  const comptroller = protocol.contracts?.comptroller;
  if (!comptroller) {
    throw new ValidationError(`Protocol ${protocol.name} does not support on-chain import`, {
      details: { protocolId: protocol.id },
    });
  }

  const chainId = getChainId(protocol.chain);
  const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));

  const cTokens = await callComptroller<readonly `0x${string}`[]>(
    chainId,
    comptroller,
    'getAllMarkets',
    []
  );

  const collaterals: ImportedPosition['collaterals'] = [];
  const borrows: ImportedPosition['borrows'] = [];
  const skippedAssets: SkippedAssetEntry[] = [];
  const rawPositions: unknown[] = [];

  for (const cToken of cTokens) {
    const supplyRaw = await callCToken<bigint>(chainId, cToken, 'balanceOf', [address]);
    const borrowRaw = await callCToken<bigint>(chainId, cToken, 'borrowBalanceStored', [address]);
    const isCollateral = await callComptroller<boolean>(chainId, comptroller, 'checkMembership', [
      address,
      cToken,
    ]);

    // Resolve the underlying asset. Native-gas markets revert on `underlying()`.
    let underlying: `0x${string}` | null = null;
    let symbolOverride: string | null = null;
    try {
      underlying = await callCToken<`0x${string}`>(chainId, cToken, 'underlying', []);
    } catch {
      const cSymbol = await callCToken<string>(chainId, cToken, 'symbol', []);
      symbolOverride = nativeSymbolFromCToken(cSymbol) ?? null;
    }

    const symbol = symbolOverride
      ? symbolOverride
      : normalizeSymbol(await readTokenSymbol(chainId, underlying as `0x${string}`));
    const decimals =
      symbolOverride === 'AVAX' || symbolOverride === 'BNB'
        ? 18
        : await readTokenDecimals(chainId, underlying as `0x${string}`);

    if (supplyRaw > 0n && isCollateral) {
      const exchangeRate = await callCToken<bigint>(chainId, cToken, 'exchangeRateStored', []);
      const rawUnderlying = (supplyRaw * exchangeRate) / EXCHANGE_RATE_SCALE;
      const amount = toHumanAmount(rawUnderlying, decimals);
      if (amount > 1e-12) {
        if (supportedSymbols.has(symbol)) {
          collaterals.push({ symbol, amount, decimals, underlyingAsset: underlying ?? undefined });
          rawPositions.push({ kind: 'collateral', symbol, amount, underlyingAsset: underlying });
        } else {
          skippedAssets.push({
            underlyingAsset: (underlying ?? cToken) as `0x${string}`,
            symbol,
            reason: 'unsupported',
          });
        }
      }
    }

    if (borrowRaw > 0n) {
      const amount = toHumanAmount(borrowRaw, decimals);
      if (amount > 1e-12) {
        if (supportedSymbols.has(symbol)) {
          borrows.push({ symbol, amount, decimals, underlyingAsset: underlying ?? undefined });
          rawPositions.push({ kind: 'borrow', symbol, amount, underlyingAsset: underlying });
        } else {
          skippedAssets.push({
            underlyingAsset: (underlying ?? cToken) as `0x${string}`,
            symbol,
            reason: 'unsupported',
          });
        }
      }
    }
  }

  logger.info(
    `Imported Compound V2 position for ${address} on ${protocol.id}: ${collaterals.length} collaterals, ${borrows.length} borrows, ${skippedAssets.length} skipped`
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
