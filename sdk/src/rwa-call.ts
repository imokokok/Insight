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
export type RwaTransaction = {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value: string;
  nonce: string;
};
export type RwaCallProfile = {
  schema: 'insight.rwa-call-profile.v1';
  adapter: 'uniswap-v3-exact-input-single';
  chainId: number;
  target: string;
  instrumentId: string;
  quoteToken: string;
  allowedFees: number[];
};
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
};
const addr = (v: string) => /^0x[0-9a-f]{40}$/.test(v) && v !== '0x' + '0'.repeat(40);
function requireValue(ok: unknown, code: string): asserts ok {
  if (!ok) throw new TypeError(code);
}
export function rwaCallProfileId(p: RwaCallProfile): string {
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
  const p = decoded.args[0],
    inputToken = p.tokenIn.toLowerCase(),
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
      profile.allowedFees.includes(p.fee),
    'RWA_CALL_AMOUNT_OR_RECEIVER'
  );
  requireValue(
    p.deadline <= BigInt(Number.MAX_SAFE_INTEGER) && p.deadline > BigInt(now),
    'RWA_CALL_DEADLINE'
  );
  return {
    profileId,
    action: request.action,
    inputToken,
    outputToken,
    inputAmount: p.amountIn.toString(),
    minimumOutput: p.amountOutMinimum.toString(),
    receiver,
    deadline: Number(p.deadline),
    sqrtPriceLimitX96: p.sqrtPriceLimitX96.toString(),
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
