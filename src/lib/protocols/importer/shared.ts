import { decodeFunctionResult, encodeFunctionData, formatUnits } from 'viem';

import { readContract } from './rpcClient';

// Minimal ERC20 metadata ABI (symbol / decimals). `symbol` is declared both as
// `string` (modern tokens) and `bytes32` (a handful of legacy tokens) so the
// readers below can fall back when the string decode fails.
const ERC20_STRING_ABI = [
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

const ERC20_BYTES32_ABI = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const;

// Reserves / markets often expose wrapped or bridged tickers that differ from
// the canonical symbols used in PROTOCOL_REGISTRY. Normalize so on-chain
// positions match registry assets.
export const SYMBOL_NORMALIZATION: Record<string, string> = {
  WETH: 'ETH',
  WPOL: 'MATIC',
  USDCn: 'USDC',
  USDT0: 'USDT',
  USDbC: 'USDC',
  'USDC.e': 'USDC',
  'USDbC.e': 'USDC',
  WBNB: 'BNB',
};

export function normalizeSymbol(symbol: string): string {
  return SYMBOL_NORMALIZATION[symbol] ?? symbol;
}

export async function readTokenSymbol(chainId: number, token: `0x${string}`): Promise<string> {
  const data = encodeFunctionData({ abi: ERC20_STRING_ABI, functionName: 'symbol', args: [] });
  const result = await readContract(chainId, token, data);
  try {
    return decodeFunctionResult({
      abi: ERC20_STRING_ABI,
      functionName: 'symbol',
      data: result as `0x${string}`,
    }) as string;
  } catch {
    // Legacy tokens return bytes32.
    const raw = decodeFunctionResult({
      abi: ERC20_BYTES32_ABI,
      functionName: 'symbol',
      data: result as `0x${string}`,
    }) as `0x${string}`;
    return Buffer.from(raw.slice(2), 'hex').toString('utf8').replace(/\0/g, '').trim();
  }
}

export async function readTokenDecimals(chainId: number, token: `0x${string}`): Promise<number> {
  const data = encodeFunctionData({ abi: ERC20_STRING_ABI, functionName: 'decimals', args: [] });
  const result = await readContract(chainId, token, data);
  return decodeFunctionResult({
    abi: ERC20_STRING_ABI,
    functionName: 'decimals',
    data: result as `0x${string}`,
  }) as number;
}

/**
 * Convert a raw on-chain token amount to a human-readable number using the
 * token's decimals. Matches the convention used by the Aave V3 importer.
 */
export function toHumanAmount(raw: bigint, decimals: number): number {
  return Number(formatUnits(raw, decimals));
}
