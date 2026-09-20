import { createPublicClient, getAddress, http, parseAbi } from 'viem';
import { robinhood } from 'viem/chains';

import type { RobinhoodOnchainMultiplierState } from '../../../sdk/src/rwa-robinhood';

const ROBINHOOD_PUBLIC_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ROBINHOOD_READ_TIMEOUT_MS = 10_000;

const STOCK_TOKEN_CONTEXT_ABI = parseAbi([
  'function uid() view returns (bytes32)',
  'function uiMultiplier() view returns (uint256)',
  'function newUIMultiplier() view returns (uint256)',
  'function effectiveAt() view returns (uint256)',
  'function oraclePaused() view returns (bool)',
]);

export interface RobinhoodOnchainReadOptions {
  rpcUrl?: string;
  now?: () => number;
}

function settledBigInt(result: PromiseSettledResult<bigint>): string | null {
  return result.status === 'fulfilled' ? result.value.toString() : null;
}

/** Read issuer state directly from the ERC-8056 Stock Token contract. */
export async function readRobinhoodOnchainState(
  tokenAddress: `0x${string}`,
  options: RobinhoodOnchainReadOptions = {}
): Promise<RobinhoodOnchainMultiplierState> {
  const configuredUrl = options.rpcUrl?.trim() || process.env.ROBINHOOD_RPC_URL?.trim();
  const rpcUrl = configuredUrl || ROBINHOOD_PUBLIC_RPC_URL;
  const rpcMode = configuredUrl ? 'configured' : 'public-rate-limited';
  const client = createPublicClient({
    chain: robinhood,
    transport: http(rpcUrl, { timeout: ROBINHOOD_READ_TIMEOUT_MS, retryCount: 1 }),
  });
  const address = getAddress(tokenAddress);
  const contract = { address, abi: STOCK_TOKEN_CONTEXT_ABI } as const;

  const [uid, current, pending, effectiveAt, oraclePaused] = await Promise.allSettled([
    client.readContract({ ...contract, functionName: 'uid' }),
    client.readContract({ ...contract, functionName: 'uiMultiplier' }),
    client.readContract({ ...contract, functionName: 'newUIMultiplier' }),
    client.readContract({ ...contract, functionName: 'effectiveAt' }),
    client.readContract({ ...contract, functionName: 'oraclePaused' }),
  ]);

  const effectiveAtValue = effectiveAt.status === 'fulfilled' ? effectiveAt.value : null;
  const effectiveAtNumber =
    effectiveAtValue != null && effectiveAtValue <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(effectiveAtValue)
      : null;

  const results = [uid, current, pending, effectiveAt, oraclePaused];
  const complete = results.every((result) => result.status === 'fulfilled');
  const anyAvailable = results.some((result) => result.status === 'fulfilled');
  const available = current.status === 'fulfilled';

  return {
    attempted: true,
    available,
    complete,
    rpcMode,
    tokenUid: uid.status === 'fulfilled' ? uid.value : null,
    currentMultiplierAtomic: current.status === 'fulfilled' ? current.value.toString() : null,
    newMultiplierAtomic: settledBigInt(pending),
    effectiveAt: effectiveAtNumber,
    oraclePaused: oraclePaused.status === 'fulfilled' ? oraclePaused.value : null,
    verifiedAt: anyAvailable ? Math.floor((options.now?.() ?? Date.now()) / 1000) : null,
    errorCode: complete
      ? null
      : available
        ? 'ROBINHOOD_ONCHAIN_READ_PARTIAL'
        : 'ROBINHOOD_ONCHAIN_READ_FAILED',
  };
}

export function robinhoodOnchainNotRequested(): RobinhoodOnchainMultiplierState {
  return {
    attempted: false,
    available: false,
    complete: false,
    rpcMode: 'not-requested',
    tokenUid: null,
    currentMultiplierAtomic: null,
    newMultiplierAtomic: null,
    effectiveAt: null,
    oraclePaused: null,
    verifiedAt: null,
    errorCode: null,
  };
}
