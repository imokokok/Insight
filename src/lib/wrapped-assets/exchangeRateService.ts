import { encodeFunctionData } from 'viem';

import { getChainlinkRPCConfig } from '@/lib/oracles/services/chainlinkDataSources';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('lst-exchange-rate');

interface LSTExchangeRateConfig {
  symbol: string;
  contractAddress: `0x${string}`;
  functionName: string;
  abi: readonly {
    name: string;
    type: string;
    inputs: readonly { internalType: string; type: string }[];
    outputs: readonly { internalType: string; type: string }[];
    stateMutability: string;
  }[];
  decimals: number;
}

const WSTETH_ABI = [
  {
    inputs: [],
    name: 'stEthPerToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CBETH_ABI = [
  {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const LST_CONFIGS: Record<string, LSTExchangeRateConfig> = {
  wstETH: {
    symbol: 'wstETH',
    contractAddress: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    functionName: 'stEthPerToken',
    abi: WSTETH_ABI,
    decimals: 18,
  },
  cbETH: {
    symbol: 'cbETH',
    contractAddress: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    functionName: 'exchangeRate',
    abi: CBETH_ABI,
    decimals: 18,
  },
};

function decodeUint256(data: string): bigint {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) {
    return BigInt(0);
  }
  try {
    return BigInt('0x' + cleanData.slice(0, 64));
  } catch (error) {
    logger.error(
      'Failed to decode uint256',
      error instanceof Error ? error : new Error(String(error))
    );
    return BigInt(0);
  }
}

function formatRate(raw: bigint, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

class LSTExchangeRateService {
  private rpcClient = new RpcClientWithFallback({ contextLabel: 'lst-exchange-rate' });
  private cache = new Map<string, { rate: number; timestamp: number }>();
  // LST exchange rates change slowly (staking rewards accrue over hours/days).
  // 10-minute cache keeps safety-check calculations fresh while avoiding
  // repeated RPC calls when multiple users query the same asset.
  private cacheTTL = 10 * 60 * 1000;

  private getCacheKey(symbol: string, chainId: number): string {
    return `${symbol}-${chainId}`;
  }

  async getExchangeRate(symbol: string, chainId: number = 1): Promise<number> {
    const config = LST_CONFIGS[symbol];
    if (!config) {
      throw new Error(`No LST exchange rate config for ${symbol}`);
    }

    const cacheKey = this.getCacheKey(symbol, chainId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.rate;
    }

    const rpcConfig = getChainlinkRPCConfig(chainId);
    if (!rpcConfig || rpcConfig.endpoints.length === 0) {
      throw new Error(`No RPC config for chain ${chainId}`);
    }

    const data = encodeFunctionData({
      abi: config.abi,
      functionName: config.functionName as never,
    });

    const result = await this.rpcClient.ethCall(
      String(chainId),
      rpcConfig.endpoints,
      config.contractAddress,
      data
    );

    const raw = decodeUint256(result);
    if (raw === BigInt(0)) {
      throw new Error(`Invalid exchange rate for ${symbol}`);
    }

    const rate = formatRate(raw, config.decimals);
    this.cache.set(cacheKey, { rate, timestamp: Date.now() });

    logger.info(`Fetched ${symbol} exchange rate`, { symbol, chainId, rate });
    return rate;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const lstExchangeRateService = new LSTExchangeRateService();
