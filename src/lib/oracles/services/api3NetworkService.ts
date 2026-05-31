import { computeCommunalApi3ReaderProxyV1Address } from '@api3/contracts';
import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import { ALCHEMY_RPC } from '@/lib/config/serverEnv';
import { createLogger } from '@/lib/utils/logger';
import { Blockchain } from '@/types/oracle';

import { bigIntToPrice } from '../utils/oracleDataUtils';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

const logger = createLogger('API3NetworkService');

const api3RpcClient = new RpcClientWithFallback({ contextLabel: 'api3' });

// API3 dAPI Proxy contract ABI (simplified, only includes read function)
const DAPI_PROXY_ABI = [
  {
    inputs: [],
    name: 'read',
    outputs: [
      { internalType: 'int224', name: 'value', type: 'int224' },
      { internalType: 'uint32', name: 'timestamp', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Chain ID mapping (only includes API3-supported chains)
const CHAIN_ID_MAP: Partial<Record<Blockchain, number>> = {
  [Blockchain.ETHEREUM]: 1,
  [Blockchain.ARBITRUM]: 42161,
  [Blockchain.POLYGON]: 137,
  [Blockchain.AVALANCHE]: 43114,
  [Blockchain.BNB_CHAIN]: 56,
  [Blockchain.BASE]: 8453,
  [Blockchain.OPTIMISM]: 10,
  [Blockchain.FANTOM]: 250,
};

// RPC endpoint configuration
const RPC_ENDPOINTS: Record<number, string[]> = {
  1: ALCHEMY_RPC.ethereum
    ? [ALCHEMY_RPC.ethereum, 'https://eth.llamarpc.com', 'https://ethereum.publicnode.com']
    : ['https://eth.llamarpc.com', 'https://ethereum.publicnode.com'],
  42161: ALCHEMY_RPC.arbitrum
    ? [ALCHEMY_RPC.arbitrum, 'https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com']
    : ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com'],
  137: ALCHEMY_RPC.polygon
    ? [ALCHEMY_RPC.polygon, 'https://polygon-rpc.com', 'https://polygon.publicnode.com']
    : ['https://polygon-rpc.com', 'https://polygon.publicnode.com'],
  43114: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.publicnode.com'],
  56: ['https://bsc-dataseed.binance.org', 'https://bsc.publicnode.com'],
  8453: ALCHEMY_RPC.base
    ? [ALCHEMY_RPC.base, 'https://mainnet.base.org', 'https://base.publicnode.com']
    : ['https://mainnet.base.org', 'https://base.publicnode.com'],
  10: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
  250: ['https://rpc.ftm.tools', 'https://fantom.publicnode.com'],
};

// Token symbol to dAPI name mapping
// Based on actual on-chain verification results (2026-04-14)
const SYMBOL_TO_DAPI: Record<string, string> = {
  // === Major Cryptocurrencies ===
  ETH: 'ETH/USD',
  BTC: 'BTC/USD',
  BNB: 'BNB/USD',
  SOL: 'SOL/USD',
  // === Layer 2 Tokens ===
  ARB: 'ARB/USD',
  // === DeFi Tokens ===
  COMP: 'COMP/USD',
  BAL: 'BAL/USD',
  // === Stablecoins ===
  USDC: 'USDC/USD',
  USDT: 'USDT/USD',
  DAI: 'DAI/USD',
  // === Wrapped Assets ===
  WBTC: 'WBTC/USD',
  // === Other Verified Tokens ===
  AVAX: 'AVAX/USD',
  // === The following tokens exist on API3 Market but may not be activated; mapping retained for future use ===
  LINK: 'LINK/USD',
  MATIC: 'MATIC/USD',
  OP: 'OP/USD',
  UNI: 'UNI/USD',
  AAVE: 'AAVE/USD',
  PYTH: 'PYTH/USD',
  DOGE: 'DOGE/USD',
  XRP: 'XRP/USD',
  ADA: 'ADA/USD',
  DOT: 'DOT/USD',
  LTC: 'LTC/USD',
  BCH: 'BCH/USD',
  ETC: 'ETC/USD',
  XLM: 'XLM/USD',
  ATOM: 'ATOM/USD',
  SHIB: 'SHIB/USD',
  FTM: 'FTM/USD',
  GRT: 'GRT/USD',
  SUSHI: 'SUSHI/USD',
  MKR: 'MKR/USD',
  YFI: 'YFI/USD',
  CRV: 'CRV/USD',
  SNX: 'SNX/USD',
  THETA: 'THETA/USD',
  KAVA: 'KAVA/USD',
  PEPE: 'PEPE/USD',
  BONK: 'BONK/USD',
  WIF: 'WIF/USD',
  INJ: 'INJ/USD',
  SUI: 'SUI/USD',
  SEI: 'SEI/USD',
  TIA: 'TIA/USD',
  TON: 'TON/USD',
  FRAX: 'FRAX/USD',
  LUSD: 'LUSD/USD',
  WETH: 'WETH/USD',
};

interface PriceReading {
  value: number;
  timestamp: number;
  rawValue: bigint;
  decimals: number;
  decimalsIsFallback: boolean;
}

/**
 * Encode function call data
 */
function encodeFunctionData(functionName: 'read', abi: typeof DAPI_PROXY_ABI): `0x${string}` {
  return viemEncodeFunctionData({
    abi,
    functionName,
  });
}

/**
 * Decode uint224/int224 value
 */
function decodeInt224(data: string): bigint {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) {
    return BigInt(0);
  }
  // int224 is signed, need to handle sign bit
  const value = BigInt('0x' + cleanData.slice(0, 64));
  // Maximum value of int224 is 2^223 - 1
  const maxInt224 = (BigInt(1) << BigInt(223)) - BigInt(1);
  if (value > maxInt224) {
    // Negative number
    return value - (BigInt(1) << BigInt(224));
  }
  return value;
}

/**
 * Decode uint32 value
 */
function decodeUint32(data: string): number {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) {
    return 0;
  }
  // uint32 is in the second 32-byte position
  return parseInt(cleanData.slice(64, 128), 16);
}

async function rpcCall(
  chainId: number,
  method: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<unknown> {
  const endpoints = RPC_ENDPOINTS[chainId];
  if (!endpoints || endpoints.length === 0) {
    throw new Error(`No RPC endpoints for chain ${chainId}`);
  }
  if (signal?.aborted) {
    throw new Error(`Request aborted for chain ${chainId}`);
  }
  return api3RpcClient.rpcCallWithFallback(String(chainId), endpoints, method, params, signal);
}

const decimalsCache = new Map<string, number>();

async function readDecimalsFromContract(
  proxyAddress: string,
  chainId: number,
  signal?: AbortSignal
): Promise<{ decimals: number; isFallback: boolean }> {
  const cacheKey = `${chainId}:${proxyAddress}`;
  const cached = decimalsCache.get(cacheKey);
  if (cached !== undefined) {
    return { decimals: cached, isFallback: false };
  }

  try {
    const data = viemEncodeFunctionData({
      abi: DAPI_PROXY_ABI,
      functionName: 'decimals',
    });
    const result = await rpcCall(
      chainId,
      'eth_call',
      [{ to: proxyAddress, data }, 'latest'],
      signal
    );
    if (typeof result !== 'string' || !result || result === '0x') {
      return { decimals: 8, isFallback: true };
    }
    const cleanData = result.startsWith('0x') ? result.slice(2) : result;
    const parsed = parseInt(cleanData, 16);
    if (isNaN(parsed)) {
      return { decimals: 8, isFallback: true };
    }
    decimalsCache.set(cacheKey, parsed);
    return { decimals: parsed, isFallback: false };
  } catch {
    return { decimals: 8, isFallback: true };
  }
}

/**
 * Read price from dAPI Proxy contract
 */
async function readDAPIPrice(
  proxyAddress: string,
  chainId: number,
  _dapiName: string,
  signal?: AbortSignal
): Promise<PriceReading | null> {
  try {
    const decimalsResult = await readDecimalsFromContract(proxyAddress, chainId, signal);
    const data = encodeFunctionData('read', DAPI_PROXY_ABI);

    const result = await rpcCall(
      chainId,
      'eth_call',
      [
        {
          to: proxyAddress,
          data,
        },
        'latest',
      ],
      signal
    );

    if (typeof result !== 'string') {
      throw new Error('Invalid RPC response');
    }

    const rawValue = decodeInt224(result);
    const timestamp = decodeUint32(result);

    const value = bigIntToPrice(rawValue, decimalsResult.decimals);

    return {
      value,
      timestamp: timestamp * 1000,
      rawValue,
      decimals: decimalsResult.decimals,
      decimalsIsFallback: decimalsResult.isFallback,
    };
  } catch (error) {
    logger.error(
      `Failed to read dAPI price from ${proxyAddress}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

/**
 * Compute dAPI proxy address
 * Uses the computeCommunalApi3ReaderProxyV1Address function from @api3/contracts package
 */
function computeProxyAddress(dapiName: string, chainId: number): string | null {
  try {
    const address = computeCommunalApi3ReaderProxyV1Address(chainId, dapiName);
    return address;
  } catch (error) {
    logger.error(
      `Failed to compute proxy address for ${dapiName} on chain ${chainId}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

/**
 * Get token price (from API3 oracle network)
 */
async function getAPI3Price(
  symbol: string,
  chain: Blockchain = Blockchain.ETHEREUM,
  signal?: AbortSignal
): Promise<{
  price: number;
  timestamp: number;
  source: string;
  decimals: number;
  confidence: number;
  dapiName: string;
  proxyAddress: string;
  dataAge: number;
} | null> {
  try {
    const dapiName = SYMBOL_TO_DAPI[symbol.toUpperCase()];
    if (!dapiName) {
      logger.warn(`Symbol ${symbol} not supported by API3`);
      return null;
    }

    // Get chain ID
    const chainId = CHAIN_ID_MAP[chain];
    if (!chainId) {
      logger.warn(`Chain ${chain} not supported`);
      return null;
    }

    // Compute proxy address
    const proxyAddress = computeProxyAddress(dapiName, chainId);
    if (!proxyAddress) {
      logger.warn(`Failed to compute proxy address for ${dapiName} on ${chain}`);
      return null;
    }

    logger.info(`Computed proxy address for ${dapiName} on ${chain}: ${proxyAddress}`);

    // Read price
    const reading = await readDAPIPrice(proxyAddress, chainId, dapiName, signal);

    if (!reading) {
      return null;
    }

    logger.info(`Successfully fetched ${symbol} price from API3: $${reading.value}`);

    const dataAge = Date.now() - reading.timestamp;

    const confidence = reading.decimalsIsFallback ? 0.45 : 0.98;

    return {
      price: reading.value,
      timestamp: reading.timestamp,
      source: `api3-dapi-${chain}`,
      decimals: reading.decimals,
      confidence,
      dapiName,
      proxyAddress,
      dataAge,
    };
  } catch (error) {
    logger.error(
      `Failed to get API3 price for ${symbol}:`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

/**
 * Get historical price data
 * Note: API3 dAPI does not directly provide historical data; uses Binance API to fetch historical data
 */
async function getAPI3HistoricalPrices(
  _symbol: string,
  _chain: Blockchain = Blockchain.ETHEREUM,
  _period: number = 24
): Promise<Array<{ price: number; timestamp: number; source: string }>> {
  return [];
}

/**
 * Get supported token list
 */
function getAPI3SupportedSymbols(): string[] {
  return Object.keys(SYMBOL_TO_DAPI);
}

/**
 * Check if a token is supported
 */
function isAPI3SymbolSupported(symbol: string): boolean {
  return symbol.toUpperCase() in SYMBOL_TO_DAPI;
}

/**
 * Get supported chain list
 */
function getAPI3SupportedChains(): Blockchain[] {
  return [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.OPTIMISM,
  ];
}

export const api3NetworkService = {
  getPrice: getAPI3Price,
  getHistoricalPrices: getAPI3HistoricalPrices,
  getSupportedSymbols: getAPI3SupportedSymbols,
  isSymbolSupported: isAPI3SymbolSupported,
  getSupportedChains: getAPI3SupportedChains,
};
