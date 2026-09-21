import { decodeFunctionData, encodeFunctionData, keccak256, parseAbi, toBytes } from 'viem';

import {
  rwaCanonicalJson,
  rwaInstrumentId,
  rwaIsUint256,
  rwaRequestHash,
  type RwaInstrument,
  type RwaRequest,
} from './rwa';

/** Only the original Uniswap v3 SwapRouter ABI with a deadline is admitted.
 * SwapRouter02, multicall, permit, native currency and arbitrary selectors are not aliases.
 * Deployment/implementation identity must be admitted by the consumer out of band.
 */
export const RWA_SWAP_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
/** Robinhood Chain's deployed SwapRouter02 omits the deadline from the swap
 * tuple. We admit only a deadline-protected multicall containing exactly one
 * canonical exactInputSingle call.
 */
export const RWA_SWAP_ROUTER02_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline,bytes[] data) payable returns (bytes[] results)',
]);
export type RwaTransaction = {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value: string;
  nonce: string;
};
export type RwaCallProfileV1 = {
  schema: 'insight.rwa-call-profile.v1';
  adapter: 'uniswap-v3-exact-input-single';
  chainId: number;
  target: string;
  instrumentId: string;
  quoteToken: string;
  allowedFees: number[];
};
export type RwaCallPool = { fee: number; address: string; codeHash: string };
export type RwaCallProfileV2 = {
  schema: 'insight.rwa-call-profile.v2';
  adapter: 'robinhood-uniswap-swap-router02-deadline-exact-input-single';
  chainId: 4663;
  target: string;
  targetCodeHash: string;
  factory: string;
  factoryCodeHash: string;
  instrumentId: string;
  quoteToken: string;
  quoteTokenCodeHash: string;
  pools: RwaCallPool[];
};
export type RwaCallProfile = RwaCallProfileV1 | RwaCallProfileV2;
export type RwaCallSemantics = {
  profileId: string;
  action: 'buy' | 'sell';
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  minimumOutput: string;
  receiver: string;
  deadline: number;
  sqrtPriceLimitX96: string;
  pool?: string;
};
const addr = (v: string) => /^0x[0-9a-f]{40}$/.test(v) && v !== '0x' + '0'.repeat(40);
const hash = (v: string) => /^0x[0-9a-f]{64}$/.test(v);
export const ROBINHOOD_RWA_SWAP_DEPLOYMENT = {
  chainId: 4663,
  target: '0xcaf681a66d020601342297493863e78c959e5cb2',
  targetCodeHash: '0x6f36c378e272c6324c48f045182bcb54bd8ad654cf9ebd42e8893d52c4cb25dc',
  factory: '0x1f7d7550b1b028f7571e69a784071f0205fd2efa',
  factoryCodeHash: '0xec72b1abd1f2faee020cfea9c646bd8994f9fb389054f6e574f103a895091739',
  quoteToken: '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
  quoteTokenCodeHash: '0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6',
} as const;
function requireValue(ok: unknown, code: string): asserts ok {
  if (!ok) throw new TypeError(code);
}
export function rwaCallProfileId(p: RwaCallProfile): string {
  if (p.schema === 'insight.rwa-call-profile.v2') {
    requireValue(
      Object.keys(p).sort().join(',') ===
        'adapter,chainId,factory,factoryCodeHash,instrumentId,pools,quoteToken,quoteTokenCodeHash,schema,target,targetCodeHash',
      'RWA_CALL_PROFILE_SHAPE'
    );
    const deployment = ROBINHOOD_RWA_SWAP_DEPLOYMENT;
    requireValue(
      p.adapter === 'robinhood-uniswap-swap-router02-deadline-exact-input-single' &&
        p.chainId === deployment.chainId &&
        p.target === deployment.target &&
        p.targetCodeHash === deployment.targetCodeHash &&
        p.factory === deployment.factory &&
        p.factoryCodeHash === deployment.factoryCodeHash &&
        p.quoteToken === deployment.quoteToken &&
        p.quoteTokenCodeHash === deployment.quoteTokenCodeHash &&
        /^0x[0-9a-f]{64}$/.test(p.instrumentId),
      'RWA_CALL_PROFILE_INVALID'
    );
    requireValue(
      Array.isArray(p.pools) &&
        p.pools.length > 0 &&
        p.pools.length <= 16 &&
        p.pools.every(
          (pool, index) =>
            Object.keys(pool).sort().join(',') === 'address,codeHash,fee' &&
            Number.isSafeInteger(pool.fee) &&
            pool.fee > 0 &&
            pool.fee < 2 ** 24 &&
            addr(pool.address) &&
            hash(pool.codeHash) &&
            (index === 0 || p.pools[index - 1].fee < pool.fee)
        ),
      'RWA_CALL_POOLS_INVALID'
    );
    return keccak256(toBytes(rwaCanonicalJson(p)));
  }
  requireValue(
    Object.keys(p).sort().join(',') ===
      'adapter,allowedFees,chainId,instrumentId,quoteToken,schema,target',
    'RWA_CALL_PROFILE_SHAPE'
  );
  requireValue(
    p.schema === 'insight.rwa-call-profile.v1' &&
      p.adapter === 'uniswap-v3-exact-input-single' &&
      Number.isSafeInteger(p.chainId) &&
      p.chainId > 0 &&
      addr(p.target) &&
      addr(p.quoteToken) &&
      /^0x[0-9a-f]{64}$/.test(p.instrumentId),
    'RWA_CALL_PROFILE_INVALID'
  );
  requireValue(
    Array.isArray(p.allowedFees) &&
      p.allowedFees.length > 0 &&
      p.allowedFees.length <= 16 &&
      new Set(p.allowedFees).size === p.allowedFees.length &&
      p.allowedFees.every((f) => Number.isSafeInteger(f) && f > 0 && f < 2 ** 24),
    'RWA_CALL_FEES_INVALID'
  );
  return keccak256(toBytes(rwaCanonicalJson(p)));
}
export function decodeRwaCall(
  tx: RwaTransaction,
  request: RwaRequest,
  instrument: RwaInstrument,
  profile: RwaCallProfile,
  now: number
): RwaCallSemantics {
  const profileId = rwaCallProfileId(profile);
  rwaRequestHash(request);
  requireValue(
    Object.keys(tx).sort().join(',') === 'chainId,data,from,nonce,to,value',
    'RWA_TRANSACTION_SHAPE'
  );
  requireValue(
    rwaInstrumentId(instrument) === request.instrumentId &&
      profile.instrumentId === request.instrumentId &&
      instrument.tokenChainId === profile.chainId &&
      profile.quoteToken !== instrument.tokenAddress,
    'RWA_CALL_INSTRUMENT_MISMATCH'
  );
  requireValue(
    Number.isSafeInteger(now) &&
      now > 0 &&
      tx.chainId === profile.chainId &&
      tx.to === profile.target &&
      addr(tx.from) &&
      tx.value === '0' &&
      rwaIsUint256(tx.nonce) &&
      /^0x(?:[0-9a-fA-F]{2})+$/.test(tx.data),
    'RWA_CALL_TARGET_OR_VALUE'
  );
  requireValue(
    rwaCanonicalJson(request.call) ===
      rwaCanonicalJson({
        chainId: tx.chainId,
        from: tx.from,
        to: tx.to,
        calldataHash: keccak256(tx.data as `0x${string}`),
        value: tx.value,
        nonce: tx.nonce,
      }),
    'RWA_CALL_SCOPE_MISMATCH'
  );
  let p: {
      tokenIn: string;
      tokenOut: string;
      fee: number;
      recipient: string;
      amountIn: bigint;
      amountOutMinimum: bigint;
      sqrtPriceLimitX96: bigint;
    },
    deadline: bigint,
    pool: string | undefined;
  if (profile.schema === 'insight.rwa-call-profile.v1') {
    const decoded = decodeFunctionData({ abi: RWA_SWAP_ABI, data: tx.data as `0x${string}` });
    requireValue(
      decoded.functionName === 'exactInputSingle' &&
        encodeFunctionData({
          abi: RWA_SWAP_ABI,
          functionName: decoded.functionName,
          args: decoded.args,
        }).toLowerCase() === tx.data.toLowerCase(),
      'RWA_CALL_NON_CANONICAL'
    );
    p = decoded.args[0];
    deadline = decoded.args[0].deadline;
  } else {
    const outer = decodeFunctionData({
      abi: RWA_SWAP_ROUTER02_ABI,
      data: tx.data as `0x${string}`,
    });
    requireValue(outer.functionName === 'multicall', 'RWA_CALL_NON_CANONICAL');
    const [outerDeadline, calls] = outer.args;
    requireValue(calls.length === 1, 'RWA_CALL_NON_CANONICAL');
    const inner = decodeFunctionData({ abi: RWA_SWAP_ROUTER02_ABI, data: calls[0] });
    requireValue(
      inner.functionName === 'exactInputSingle' &&
        encodeFunctionData({
          abi: RWA_SWAP_ROUTER02_ABI,
          functionName: inner.functionName,
          args: inner.args,
        }).toLowerCase() === calls[0].toLowerCase() &&
        encodeFunctionData({
          abi: RWA_SWAP_ROUTER02_ABI,
          functionName: outer.functionName,
          args: outer.args,
        }).toLowerCase() === tx.data.toLowerCase(),
      'RWA_CALL_NON_CANONICAL'
    );
    p = inner.args[0];
    deadline = outerDeadline;
    pool = profile.pools.find((candidate) => candidate.fee === p.fee)?.address;
  }
  const inputToken = p.tokenIn.toLowerCase(),
    outputToken = p.tokenOut.toLowerCase(),
    receiver = p.recipient.toLowerCase();
  requireValue(
    request.action === 'buy' || request.action === 'sell',
    'RWA_CALL_ACTION_UNSUPPORTED'
  );
  requireValue(
    inputToken === (request.action === 'buy' ? profile.quoteToken : instrument.tokenAddress) &&
      outputToken === (request.action === 'buy' ? instrument.tokenAddress : profile.quoteToken),
    'RWA_CALL_ASSET_MISMATCH'
  );
  requireValue(
    addr(receiver) &&
      p.amountIn.toString() === request.amount &&
      p.amountOutMinimum > 0n &&
      (profile.schema === 'insight.rwa-call-profile.v1'
        ? profile.allowedFees.includes(p.fee)
        : pool !== undefined),
    'RWA_CALL_AMOUNT_OR_RECEIVER'
  );
  requireValue(
    deadline <= BigInt(Number.MAX_SAFE_INTEGER) && deadline > BigInt(now),
    'RWA_CALL_DEADLINE'
  );
  const semantics: RwaCallSemantics = {
    profileId,
    action: request.action,
    inputToken,
    outputToken,
    inputAmount: p.amountIn.toString(),
    minimumOutput: p.amountOutMinimum.toString(),
    receiver,
    deadline: Number(deadline),
    sqrtPriceLimitX96: p.sqrtPriceLimitX96.toString(),
  };
  if (pool) semantics.pool = pool;
  return semantics;
}
export function buildRwaSwapRouter02Transaction(
  profile: RwaCallProfileV2,
  input: {
    from: string;
    nonce: string;
    instrument: RwaInstrument;
    action: 'buy' | 'sell';
    fee: number;
    amountIn: string;
    minimumOutput: string;
    receiver: string;
    deadline: number;
    sqrtPriceLimitX96?: string;
  }
): RwaTransaction {
  rwaCallProfileId(profile);
  const instrumentId = rwaInstrumentId(input.instrument),
    pool = profile.pools.find((candidate) => candidate.fee === input.fee),
    limit = input.sqrtPriceLimitX96 ?? '0';
  requireValue(
    instrumentId === profile.instrumentId &&
      input.instrument.tokenChainId === profile.chainId &&
      addr(input.instrument.tokenAddress) &&
      input.instrument.tokenAddress !== profile.quoteToken &&
      (input.action === 'buy' || input.action === 'sell') &&
      addr(input.from) &&
      addr(input.receiver) &&
      rwaIsUint256(input.nonce) &&
      rwaIsUint256(input.amountIn) &&
      BigInt(input.amountIn) > 0n &&
      rwaIsUint256(input.minimumOutput) &&
      BigInt(input.minimumOutput) > 0n &&
      rwaIsUint256(limit) &&
      BigInt(limit) < 2n ** 160n &&
      pool &&
      Number.isSafeInteger(input.deadline) &&
      input.deadline > 0,
    'RWA_SWAP_ROUTER02_INPUT_INVALID'
  );
  const tokenIn = input.action === 'buy' ? profile.quoteToken : input.instrument.tokenAddress,
    tokenOut = input.action === 'buy' ? input.instrument.tokenAddress : profile.quoteToken,
    inner = encodeFunctionData({
      abi: RWA_SWAP_ROUTER02_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: tokenIn as `0x${string}`,
          tokenOut: tokenOut as `0x${string}`,
          fee: input.fee,
          recipient: input.receiver as `0x${string}`,
          amountIn: BigInt(input.amountIn),
          amountOutMinimum: BigInt(input.minimumOutput),
          sqrtPriceLimitX96: BigInt(limit),
        },
      ],
    });
  return {
    chainId: profile.chainId,
    from: input.from,
    to: profile.target,
    data: encodeFunctionData({
      abi: RWA_SWAP_ROUTER02_ABI,
      functionName: 'multicall',
      args: [BigInt(input.deadline), [inner]],
    }),
    value: '0',
    nonce: input.nonce,
  };
}
export type RwaObservedTransfer = {
  token: string;
  from: string;
  to: string;
  amount: string;
  logIndex: number;
};
/** These transfers must originate in the authenticated receipt/observer, not caller estimates. */
export function assessRwaCallOutcome(
  semantics: RwaCallSemantics,
  sender: string,
  transfers: readonly RwaObservedTransfer[]
): { satisfied: boolean; reasons: string[] } {
  if (
    !Array.isArray(transfers) ||
    transfers.length > 1024 ||
    new Set(transfers.map((t) => t.logIndex)).size !== transfers.length ||
    transfers.some(
      (t) =>
        !addr(t.token) ||
        !addr(t.from) ||
        !addr(t.to) ||
        !rwaIsUint256(t.amount) ||
        !Number.isSafeInteger(t.logIndex) ||
        t.logIndex < 0
    )
  )
    return { satisfied: false, reasons: ['RWA_TRANSFERS_INVALID'] };
  const net = (token: string, holder: string): bigint =>
    transfers
      .filter((t) => t.token === token)
      .reduce<bigint>(
        (sum, t) =>
          sum +
          (t.to === holder ? BigInt(t.amount) : 0n) -
          (t.from === holder ? BigInt(t.amount) : 0n),
        0n
      );
  const reasons: string[] = [];
  if (-net(semantics.inputToken, sender) !== BigInt(semantics.inputAmount))
    reasons.push('RWA_INPUT_AMOUNT_MISMATCH');
  if (net(semantics.outputToken, semantics.receiver) < BigInt(semantics.minimumOutput))
    reasons.push('RWA_MINIMUM_OUTPUT_NOT_MET');
  if (
    transfers.some(
      (t) =>
        t.from === sender && t.token !== semantics.inputToken && t.token !== semantics.outputToken
    )
  )
    reasons.push('RWA_UNEXPECTED_ASSET_SPEND');
  return { satisfied: reasons.length === 0, reasons };
}
