import { encodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import {
  CHRONICLE_ORACLE_ABI,
  CHRONICLE_RPC_CONFIG,
  getChroniclePriceFeed,
  MAKER_DSS_ABI,
  getMakerDSSContracts,
} from './chronicleDataSources';

const logger = createLogger('ChronicleOnChainService');

interface RPCResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface ChroniclePriceResult {
  price: bigint;
  isValid: boolean;
  timestamp: number;
}

interface MakerDAOIlkData {
  Art: bigint;
  rate: bigint;
  spot: bigint;
  line: bigint;
  dust: bigint;
}

interface MakerDAOVaultData {
  totalDebt: bigint;
  globalDebtCeiling: bigint;
  systemSurplus: bigint;
  systemDebt: bigint;
  ilks: Record<string, MakerDAOIlkData>;
}

async function makeRPCCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: RPCResponse<T> = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  if (data.result === undefined) {
    throw new Error('RPC response missing result');
  }

  return data.result;
}

async function callWithRetry<T>(
  chainId: number,
  callFn: (rpcUrl: string) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const config = CHRONICLE_RPC_CONFIG[chainId];
  if (!config) {
    throw new Error(`No RPC config for chainId: ${chainId}`);
  }

  const endpoints = config.endpoints;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const rpcUrl of endpoints) {
      try {
        return await callFn(rpcUrl);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`RPC call failed for ${rpcUrl}: ${lastError.message}`);
        continue;
      }
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error('All RPC endpoints failed');
}

export async function getChroniclePriceFromChain(
  symbol: string,
  chainId: number = 1
): Promise<ChroniclePriceResult> {
  try {
    const feed = getChroniclePriceFeed(symbol, chainId);
    if (!feed) {
      throw new Error(`No Chronicle price feed found for ${symbol} on chain ${chainId}`);
    }

    const data = encodeFunctionData({
      abi: CHRONICLE_ORACLE_ABI,
      functionName: 'peek',
    });

    const result = await callWithRetry(chainId, async (rpcUrl) => {
      return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
        {
          to: feed.address,
          data,
        },
        'latest',
      ]);
    });

    // Decode the result: (uint256 price, bool isValid)
    // The result is 64 bytes (2 * 32 bytes)
    const priceHex = result.slice(2, 66);
    const isValidHex = result.slice(66, 130);

    const price = BigInt('0x' + priceHex);
    const isValid = BigInt('0x' + isValidHex) === BigInt(1);

    return {
      price,
      isValid,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Failed to get Chronicle price for ${symbol}:`, error as Error);
    throw error;
  }
}

export async function getChroniclePriceWithRead(
  symbol: string,
  chainId: number = 1
): Promise<bigint> {
  try {
    const feed = getChroniclePriceFeed(symbol, chainId);
    if (!feed) {
      throw new Error(`No Chronicle price feed found for ${symbol} on chain ${chainId}`);
    }

    const data = encodeFunctionData({
      abi: CHRONICLE_ORACLE_ABI,
      functionName: 'read',
    });

    const result = await callWithRetry(chainId, async (rpcUrl) => {
      return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
        {
          to: feed.address,
          data,
        },
        'latest',
      ]);
    });

    return BigInt(result);
  } catch (error) {
    logger.error(`Failed to read Chronicle price for ${symbol}:`, error as Error);
    throw error;
  }
}

export async function getMakerDAOVaultData(chainId: number = 1): Promise<MakerDAOVaultData> {
  try {
    const contracts = getMakerDSSContracts(chainId);
    if (!contracts) {
      throw new Error(`No MakerDAO DSS contracts for chain ${chainId}`);
    }

    const ilkTypes = [
      'ETH-A',
      'ETH-B',
      'ETH-C',
      'WBTC-A',
      'WBTC-B',
      'WBTC-C',
      'USDC-A',
      'USDC-B',
      'USDT-A',
      'LINK-A',
      'STETH-A',
      'STETH-B',
      'WSTETH-A',
      'WSTETH-B',
      'RETH-A',
      'RETH-B',
    ];

    // Get global data
    const debtData = encodeFunctionData({
      abi: MAKER_DSS_ABI,
      functionName: 'debt',
    });

    const lineData = encodeFunctionData({
      abi: MAKER_DSS_ABI,
      functionName: 'Line',
    });

    const viceData = encodeFunctionData({
      abi: MAKER_DSS_ABI,
      functionName: 'vice',
    });

    const surplusData = encodeFunctionData({
      abi: MAKER_DSS_ABI,
      functionName: 'surplus',
    });

    const [debtResult, lineResult, viceResult, surplusResult] = await Promise.all([
      callWithRetry(chainId, async (rpcUrl) => {
        return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
          { to: contracts.vat, data: debtData },
          'latest',
        ]);
      }),
      callWithRetry(chainId, async (rpcUrl) => {
        return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
          { to: contracts.vat, data: lineData },
          'latest',
        ]);
      }),
      callWithRetry(chainId, async (rpcUrl) => {
        return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
          { to: contracts.vat, data: viceData },
          'latest',
        ]);
      }),
      callWithRetry(chainId, async (rpcUrl) => {
        return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
          { to: contracts.vat, data: surplusData },
          'latest',
        ]);
      }),
    ]);

    // Get ilk data
    const ilkDataMap: Record<string, MakerDAOIlkData> = {};

    for (const ilkType of ilkTypes) {
      try {
        const ilkBytes32 = '0x' + Buffer.from(ilkType.padEnd(32, '\0')).toString('hex');
        const ilkCallData = encodeFunctionData({
          abi: MAKER_DSS_ABI,
          functionName: 'ilks',
          args: [ilkBytes32 as `0x${string}`],
        });

        const ilkResult = await callWithRetry(chainId, async (rpcUrl) => {
          return await makeRPCCall<`0x${string}`>(rpcUrl, 'eth_call', [
            { to: contracts.vat, data: ilkCallData },
            'latest',
          ]);
        });

        // Decode ilk data: (uint256 Art, uint256 rate, uint256 spot, uint256 line, uint256 dust)
        const Art = BigInt('0x' + ilkResult.slice(2, 66));
        const rate = BigInt('0x' + ilkResult.slice(66, 130));
        const spot = BigInt('0x' + ilkResult.slice(130, 194));
        const line = BigInt('0x' + ilkResult.slice(194, 258));
        const dust = BigInt('0x' + ilkResult.slice(258, 322));

        if (Art > BigInt(0) || line > BigInt(0)) {
          ilkDataMap[ilkType] = { Art, rate, spot, line, dust };
        }
      } catch {
        // Skip ilks that don't exist
      }
    }

    return {
      totalDebt: BigInt(debtResult),
      globalDebtCeiling: BigInt(lineResult),
      systemSurplus: BigInt(surplusResult),
      systemDebt: BigInt(viceResult),
      ilks: ilkDataMap,
    };
  } catch (error) {
    logger.error('Failed to get MakerDAO vault data:', error as Error);
    throw error;
  }
}

export function formatChroniclePrice(price: bigint, decimals: number = 18): number {
  return Number(price) / Math.pow(10, decimals);
}

export function formatMakerDAORay(value: bigint): number {
  // MakerDAO uses RAY = 10^27 for fixed point numbers
  return Number(value) / 1e27;
}

export function formatMakerDAOWad(value: bigint): number {
  // MakerDAO uses WAD = 10^18 for fixed point numbers
  return Number(value) / 1e18;
}

export async function isRealDataAvailable(chainId: number = 1): Promise<boolean> {
  try {
    const config = CHRONICLE_RPC_CONFIG[chainId];
    if (!config || config.endpoints.length === 0) {
      return false;
    }

    // Test with a simple eth_blockNumber call
    await callWithRetry(chainId, async (rpcUrl) => {
      return await makeRPCCall<string>(rpcUrl, 'eth_blockNumber', []);
    });

    return true;
  } catch {
    return false;
  }
}
