import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';

const rpcClient = new RpcClientWithFallback({ contextLabel: 'position-import' });

export async function readContract(
  chainId: number,
  to: `0x${string}`,
  data: `0x${string}`
): Promise<string> {
  const config = CHAINLINK_RPC_CONFIG[chainId];
  if (!config) {
    throw new Error(`No RPC config for chain ${chainId}`);
  }
  return rpcClient.ethCall(String(chainId), config.endpoints, to, data);
}

export async function getLogs(
  chainId: number,
  params: {
    address?: `0x${string}`;
    fromBlock?: `0x${string}` | number | 'earliest' | 'latest' | 'pending';
    toBlock?: `0x${string}` | number | 'earliest' | 'latest' | 'pending';
    topics?: (string | string[] | null)[];
  }
): Promise<unknown[]> {
  const config = CHAINLINK_RPC_CONFIG[chainId];
  if (!config) {
    throw new Error(`No RPC config for chain ${chainId}`);
  }
  return rpcClient.getLogs(String(chainId), config.endpoints, params);
}
