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
  // Normalize numeric block bounds to hex strings: some public RPCs (e.g.
  // mevblocker.io) reject decimal block numbers in eth_getLogs, and others reject
  // any non-hex value. viem's getBlockNumber() returns a bigint, so handle that too.
  const normBlock = (
    b: `0x${string}` | number | bigint | 'earliest' | 'latest' | 'pending' | undefined
  ): `0x${string}` | 'earliest' | 'latest' | 'pending' | undefined => {
    if (typeof b === 'number' || typeof b === 'bigint')
      return `0x${b.toString(16)}` as `0x${string}`;
    return b;
  };
  const normalized = {
    ...params,
    fromBlock: normBlock(params.fromBlock),
    toBlock: normBlock(params.toBlock),
  };

  // Alchemy's Free tier caps `eth_getLogs` at a 10-block range, so it is useless
  // for log scans and only wastes a round-trip (and, worse, the failed call would
  // mark the Alchemy endpoint unhealthy). `eth_call`/`eth_blockNumber` DO rely on
  // Alchemy, so we (a) drop Alchemy from the log-endpoint list and (b) use a
  // distinct health key (`<chain>-logs`) so a log-range failure can never poison
  // the Alchemy endpoint that the view-call path depends on.
  const logEndpoints = config.endpoints.filter((e) => !e.includes('alchemy.com'));
  return rpcClient.getLogs(String(chainId) + '-logs', logEndpoints, normalized);
}

export async function getBlockNumber(chainId: number): Promise<bigint> {
  const config = CHAINLINK_RPC_CONFIG[chainId];
  if (!config) {
    throw new Error(`No RPC config for chain ${chainId}`);
  }
  return rpcClient.getBlockNumber(String(chainId), config.endpoints);
}
