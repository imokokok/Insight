import { encodeFunctionResult } from 'viem';

import { MONAD_MULTICALL_MAX_INNER_CALLS, aggregateMonadCalls } from '../monadMulticall';
import { MULTICALL3_ABI, MULTICALL3_ADDRESS, type Multicall3Call } from '../multicall3';
import { type RpcClientWithFallback } from '../rpcClientWithFallback';

function aggregateResponse(count: number): `0x${string}` {
  return encodeFunctionResult({
    abi: MULTICALL3_ABI,
    functionName: 'aggregate3',
    result: Array.from({ length: count }, () => ({ success: true, returnData: '0x' as const })),
  });
}

test('chunks Monad Multicall3 reads into bounded outer RPC requests', async () => {
  const rpc = {
    ethCall: jest
      .fn()
      .mockResolvedValueOnce(aggregateResponse(MONAD_MULTICALL_MAX_INNER_CALLS))
      .mockResolvedValueOnce(aggregateResponse(1)),
  } as unknown as RpcClientWithFallback;
  const calls: Multicall3Call[] = Array.from(
    { length: MONAD_MULTICALL_MAX_INNER_CALLS + 1 },
    () => ({
      target: '0x0000000000000000000000000000000000000001',
      allowFailure: true,
      callData: '0x12345678',
    })
  );

  const results = await aggregateMonadCalls(rpc, ['https://rpc.example.test'], calls);

  expect(results).toHaveLength(MONAD_MULTICALL_MAX_INNER_CALLS + 1);
  expect(results.every((result) => result.success && result.returnData === '0x')).toBe(true);
  expect(rpc.ethCall).toHaveBeenCalledTimes(2);
  expect(rpc.ethCall).toHaveBeenNthCalledWith(
    1,
    '143',
    ['https://rpc.example.test'],
    MULTICALL3_ADDRESS,
    expect.any(String),
    undefined
  );
});
