import { decodeFunctionResult, encodeFunctionData } from 'viem';

/**
 * Canonical Multicall3 deployment. It is deployed at this address on each EVM
 * network used by the snapshot collector. Calls are made with `eth_call`: no
 * transaction is signed, broadcast, or able to mutate chain state.
 */
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

export interface Multicall3Call {
  target: `0x${string}`;
  allowFailure: boolean;
  callData: `0x${string}`;
}

export interface Multicall3Result {
  success: boolean;
  returnData: `0x${string}`;
}

/** The smallest Multicall3 ABI surface required by the read-only collector. */
export const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

function isHexData(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-f]*$/i.test(value) && value.length % 2 === 0;
}

export function encodeAggregate3(calls: readonly Multicall3Call[]): `0x${string}` {
  if (calls.length === 0) throw new Error('Multicall3 requires at least one call');
  return encodeFunctionData({
    abi: MULTICALL3_ABI,
    functionName: 'aggregate3',
    args: [calls],
  });
}

/**
 * Decode and runtime-validate untrusted RPC output. TypeScript's inferred ABI
 * type is useful for construction but must not be trusted at this boundary.
 */
export function decodeAggregate3(data: `0x${string}`, expectedLength: number): Multicall3Result[] {
  const decoded = decodeFunctionResult({
    abi: MULTICALL3_ABI,
    functionName: 'aggregate3',
    data,
  });
  if (!Array.isArray(decoded) || decoded.length !== expectedLength) {
    throw new Error(
      `Invalid Multicall3 response length: expected ${expectedLength}, received ${
        Array.isArray(decoded) ? decoded.length : 'non-array'
      }`
    );
  }
  return decoded.map((result, index) => {
    if (
      !result ||
      typeof result !== 'object' ||
      typeof result.success !== 'boolean' ||
      !isHexData(result.returnData)
    ) {
      throw new Error(`Invalid Multicall3 result at index ${index}`);
    }
    return { success: result.success, returnData: result.returnData };
  });
}
