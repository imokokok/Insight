import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  keccak256,
  parseAbi,
  toBytes,
  type Hex,
} from 'viem';

import {
  buildDecisionInputPairCommitment,
  decisionInputQuoteValidUntil,
  verifyDecisionInputAssessment,
} from './decision-input';

import type { DecisionInputTrust, PreparedExactCallTransaction, SwapAssessment } from './types';

/** Supported ERC-20 swap calls: original SwapRouter, or SwapRouter02 wrapped
 * in its deadline-enforcing multicall form. Native-value swaps remain rejected.
 */
export const V3_SINGLE_SWAP_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
export const V3_ROUTER02_SINGLE_SWAP_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
export const V3_ROUTER02_MULTICALL_ABI = parseAbi([
  'function multicall(uint256 deadline,bytes[] data) payable returns (bytes[] results)',
]);

export interface SwapRiskReader {
  getBlock(input: {
    blockTag: 'latest';
  }): Promise<{ number: bigint; timestamp: bigint; hash: Hex | null }>;
  getBytecode(input: { address: Hex; blockNumber: bigint }): Promise<Hex | undefined>;
  readContract(input: {
    address: Hex;
    abi: typeof DECIMALS_ABI;
    functionName: 'decimals';
    blockNumber: bigint;
  }): Promise<unknown>;
  call(input: {
    account: Hex;
    to: Hex;
    data: Hex;
    value: bigint;
    blockNumber: bigint;
  }): Promise<{ data?: Hex }>;
}

export interface V3SwapRiskRequest {
  assessment: SwapAssessment;
  transaction: PreparedExactCallTransaction;
  /** Independently reviewed runtime hash, provisioned by the operator. */
  routerCodeHash: Hex;
  /** Optional exact deployment address; required by strict trusted entry points. */
  routerAddress?: Hex;
  reader: SwapRiskReader;
  maxOracleDeviationBps?: number;
  maxTradeAmountDeviationBps?: number;
  maxSlippageBps?: number;
  maxBlockAgeSeconds?: number;
  now?: () => number;
  decisionInputTrust?: DecisionInputTrust;
}

export interface V3SwapRiskReport {
  schema: 'insight.swap-transaction-risk.v1';
  status: 'ACCEPTABLE' | 'RISK_REJECTED' | 'UNASSESSABLE';
  reasonCodes: string[];
  transaction: {
    chainId: number;
    from: string;
    router: string;
    /** Raw call bytes let an offline reviewer decode and bind the reported fields. */
    calldata: Hex;
    calldataHash: Hex;
    callProfile: 'UNISWAP_V3_SWAP_ROUTER' | 'UNISWAP_V3_SWAP_ROUTER02_DEADLINE_MULTICALL';
    inputToken: string;
    outputToken: string;
    recipient: string;
    fee: number;
    amountIn: string;
    amountOutMinimum: string;
    deadline: number;
  } | null;
  evidence: {
    blockNumber: string;
    blockHash: Hex;
    blockTimestamp: number;
    simulatedAmountOut: string;
    oracleExpectedAmountOut: string;
    oracleDeviationBps: number;
    actualTradeAmountUsdMicros: string;
    assessedTradeAmountUsdMicros: string;
    tradeAmountDeviationBps: number;
    allowedSlippageBps: number;
    routerCodeHash: Hex;
    sourceAttestationUid: string;
    destinationAttestationUid: string;
    decisionInputPair?: {
      sourceUid: string;
      destinationUid: string;
      sourceAssessmentHash: string;
      destinationAssessmentHash: string;
      policyDigest: string;
    };
  } | null;
  validUntil: number | null;
  /** Advisory SDK output, not a signed Insight attestation or execution guarantee. */
  signed: false;
}

/** Hash an unsigned advisory report into a PriorSeal context commitment. This
 * binds the local review record; it does not turn the RPC evidence into a signed
 * or independently verified Insight claim.
 */
export function v3SwapRiskCommitment(report: V3SwapRiskReport): {
  namespace: string;
  algorithm: 'keccak256';
  digest: Hex;
} {
  if (
    report.schema !== 'insight.swap-transaction-risk.v1' ||
    report.status !== 'ACCEPTABLE' ||
    report.reasonCodes.length !== 0 ||
    !report.transaction ||
    !report.evidence ||
    !report.validUntil
  ) {
    throw new TypeError('V3_SWAP_RISK_NOT_ACCEPTABLE');
  }
  return {
    namespace: 'insight.swap-transaction-risk.v1',
    algorithm: 'keccak256',
    digest: keccak256(toBytes(stableJson(report))),
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

const DECIMALS_ABI = parseAbi(['function decimals() view returns (uint8)']);
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const MAX_UINT256 = 2n ** 256n - 1n;

type V3SwapParams = {
  tokenIn: Hex;
  tokenOut: Hex;
  fee: number;
  recipient: Hex;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96: bigint;
  deadline?: bigint;
};
type DecodedV3SwapCall = {
  profile: NonNullable<V3SwapRiskReport['transaction']>['callProfile'];
  params: V3SwapParams;
  deadline: bigint;
};

function decodeV3SwapCall(calldata: Hex): DecodedV3SwapCall {
  try {
    const decoded = decodeFunctionData({ abi: V3_SINGLE_SWAP_ABI, data: calldata });
    if (
      decoded.functionName !== 'exactInputSingle' ||
      encodeFunctionData({
        abi: V3_SINGLE_SWAP_ABI,
        functionName: 'exactInputSingle',
        args: decoded.args,
      }).toLowerCase() !== calldata.toLowerCase()
    )
      throw new TypeError('noncanonical original router call');
    const params = decoded.args[0] as V3SwapParams;
    return { profile: 'UNISWAP_V3_SWAP_ROUTER', params, deadline: params.deadline! };
  } catch {
    const decoded = decodeFunctionData({ abi: V3_ROUTER02_MULTICALL_ABI, data: calldata });
    if (
      decoded.functionName !== 'multicall' ||
      encodeFunctionData({
        abi: V3_ROUTER02_MULTICALL_ABI,
        functionName: 'multicall',
        args: decoded.args,
      }).toLowerCase() !== calldata.toLowerCase()
    )
      throw new TypeError('noncanonical Router02 multicall');
    const [deadline, calls] = decoded.args;
    if (calls.length !== 1) throw new TypeError('Router02 multicall must contain exactly one swap');
    const inner = calls[0];
    const swap = decodeFunctionData({ abi: V3_ROUTER02_SINGLE_SWAP_ABI, data: inner });
    if (
      swap.functionName !== 'exactInputSingle' ||
      encodeFunctionData({
        abi: V3_ROUTER02_SINGLE_SWAP_ABI,
        functionName: 'exactInputSingle',
        args: swap.args,
      }).toLowerCase() !== inner.toLowerCase()
    )
      throw new TypeError('noncanonical Router02 exactInputSingle');
    return {
      profile: 'UNISWAP_V3_SWAP_ROUTER02_DEADLINE_MULTICALL',
      params: swap.args[0] as V3SwapParams,
      deadline,
    };
  }
}

function decodeSimulatedAmountOut(profile: DecodedV3SwapCall['profile'], data: Hex): bigint {
  if (profile === 'UNISWAP_V3_SWAP_ROUTER')
    return decodeFunctionResult({
      abi: V3_SINGLE_SWAP_ABI,
      functionName: 'exactInputSingle',
      data,
    });
  const results = decodeFunctionResult({
    abi: V3_ROUTER02_MULTICALL_ABI,
    functionName: 'multicall',
    data,
  });
  if (results.length !== 1)
    throw new TypeError('Router02 returned an unexpected multicall result count');
  return decodeFunctionResult({
    abi: V3_ROUTER02_SINGLE_SWAP_ABI,
    functionName: 'exactInputSingle',
    data: results[0],
  });
}

function uint(value: unknown): bigint | null {
  try {
    if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) return null;
    if (
      typeof value !== 'number' &&
      typeof value !== 'bigint' &&
      (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value))
    )
      return null;
    const parsed = BigInt(value);
    return parsed >= 0n && parsed <= MAX_UINT256 ? parsed : null;
  } catch {
    return null;
  }
}

function differenceBps(actual: bigint, expected: bigint): number {
  const value = ((actual > expected ? actual - expected : expected - actual) * 10_000n) / expected;
  return Number(value > 1_000_000n ? 1_000_000n : value);
}

function reject(
  status: V3SwapRiskReport['status'],
  reasonCodes: string[],
  transaction: V3SwapRiskReport['transaction'] = null
): V3SwapRiskReport {
  return {
    schema: 'insight.swap-transaction-risk.v1',
    status,
    reasonCodes,
    transaction,
    evidence: null,
    validUntil: null,
    signed: false,
  };
}

/** Evaluate the exact calldata against two signed oracle legs and one pinned-block
 * RPC simulation. No signer, broadcaster, mutable quote endpoint or wallet is used.
 * The caller must independently review the router deployment and configure its
 * hash. An RPC response and this unsigned report are not portable trust proofs.
 */
// The explicit boundary checks make this one adapter intentionally branch-heavy.
// eslint-disable-next-line complexity
export async function assessV3SwapTransaction(input: V3SwapRiskRequest): Promise<V3SwapRiskReport> {
  const { assessment, transaction: tx, reader } = input;
  if (
    !reader ||
    !Number.isSafeInteger(tx.chainId) ||
    tx.chainId < 1 ||
    typeof tx.from !== 'string' ||
    !ADDRESS.test(tx.from) ||
    typeof tx.to !== 'string' ||
    !ADDRESS.test(tx.to) ||
    (input.routerAddress !== undefined &&
      (!ADDRESS.test(input.routerAddress) ||
        tx.to.toLowerCase() !== input.routerAddress.toLowerCase())) ||
    typeof tx.data !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(tx.data) ||
    uint(tx.value ?? 0) !== 0n ||
    !HASH.test(input.routerCodeHash)
  ) {
    return reject('UNASSESSABLE', ['TRANSACTION_OR_PROFILE_INVALID']);
  }
  let decoded: DecodedV3SwapCall;
  try {
    decoded = decodeV3SwapCall(tx.data);
  } catch {
    return reject('UNASSESSABLE', ['UNSUPPORTED_SWAP_CALL']);
  }
  const p = decoded.params;
  if (
    p.amountIn < 1n ||
    p.amountOutMinimum < 1n ||
    p.fee < 1 ||
    p.recipient.toLowerCase() === `0x${'0'.repeat(40)}` ||
    p.tokenIn.toLowerCase() === `0x${'0'.repeat(40)}` ||
    p.tokenOut.toLowerCase() === `0x${'0'.repeat(40)}` ||
    p.sqrtPriceLimitX96 !== 0n ||
    decoded.deadline > BigInt(Number.MAX_SAFE_INTEGER) ||
    decoded.deadline < 1n ||
    p.tokenIn.toLowerCase() === p.tokenOut.toLowerCase()
  ) {
    return reject('UNASSESSABLE', ['UNSUPPORTED_SWAP_SEMANTICS']);
  }
  const details: NonNullable<V3SwapRiskReport['transaction']> = {
    chainId: tx.chainId,
    from: tx.from.toLowerCase(),
    router: tx.to.toLowerCase(),
    calldata: tx.data.toLowerCase() as Hex,
    calldataHash: keccak256(tx.data),
    callProfile: decoded.profile,
    inputToken: p.tokenIn.toLowerCase(),
    outputToken: p.tokenOut.toLowerCase(),
    recipient: p.recipient.toLowerCase(),
    fee: p.fee,
    amountIn: p.amountIn.toString(),
    amountOutMinimum: p.amountOutMinimum.toString(),
    deadline: Number(decoded.deadline),
  };
  if (uint(tx.sourceAmount) !== p.amountIn)
    return reject('UNASSESSABLE', ['INPUT_AMOUNT_MISMATCH'], details);
  const source = assessment.sourcePreTrade?.attestation;
  const destination = assessment.destinationPreTrade?.attestation;
  const sourceData = source?.data;
  const destinationData = destination?.data;
  const sourceId = `eip155:${tx.chainId}/erc20:${details.inputToken}`;
  const destinationId = `eip155:${tx.chainId}/erc20:${details.outputToken}`;
  if (
    !source ||
    !destination ||
    !sourceData ||
    !destinationData ||
    typeof source.signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(source.signature) ||
    typeof destination.signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(destination.signature) ||
    ![2, 3].includes(source.schemaVersion) ||
    ![2, 3].includes(destination.schemaVersion) ||
    String(sourceData?.sourceAssetId).toLowerCase() !== sourceId ||
    String(sourceData?.destinationAssetId).toLowerCase() !== destinationId ||
    String(destinationData?.sourceAssetId).toLowerCase() !== destinationId ||
    String(destinationData?.destinationAssetId).toLowerCase() !== sourceId ||
    assessment.contextCommitment == null
  )
    return reject('UNASSESSABLE', ['ORACLE_PAIR_SCOPE_UNAVAILABLE'], details);
  if (assessment.recommendation === 'UNASSESSABLE')
    return reject('UNASSESSABLE', ['ORACLE_ASSESSMENT_UNAVAILABLE'], details);
  if (assessment.recommendation !== 'RECOMMENDED')
    return reject('RISK_REJECTED', ['ORACLE_ASSESSMENT_NOT_RECOMMENDED'], details);

  let decisionInputPair:
    | NonNullable<NonNullable<V3SwapRiskReport['evidence']>['decisionInputPair']>
    | undefined;
  let decisionInputQuoteExpiry = Number.POSITIVE_INFINITY;
  if (input.decisionInputTrust) {
    const sourceInput = assessment.sourcePreTrade?.decisionInputAssessment;
    const destinationInput = assessment.destinationPreTrade?.decisionInputAssessment;
    if (
      !sourceInput ||
      !destinationInput ||
      sourceInput.status !== 'SUFFICIENT' ||
      destinationInput.status !== 'SUFFICIENT' ||
      sourceInput.action !== 'swap' ||
      destinationInput.action !== 'swap' ||
      sourceInput.chainId !== tx.chainId ||
      destinationInput.chainId !== tx.chainId ||
      Number(sourceInput.tradeAmountUsd) !== Number(sourceData.tradeAmountUsd) ||
      Number(destinationInput.tradeAmountUsd) !== Number(destinationData.tradeAmountUsd)
    ) {
      return reject('UNASSESSABLE', ['DECISION_INPUT_SCOPE_UNAVAILABLE'], details);
    }
    const [sourceInputVerification, destinationInputVerification] = await Promise.all([
      verifyDecisionInputAssessment(sourceInput, input.decisionInputTrust),
      verifyDecisionInputAssessment(destinationInput, input.decisionInputTrust),
    ]);
    if (
      !sourceInputVerification.valid ||
      !destinationInputVerification.valid ||
      sourceInputVerification.linkedPreTradeUid?.toLowerCase() !== source.uid.toLowerCase() ||
      destinationInputVerification.linkedPreTradeUid?.toLowerCase() !==
        destination.uid.toLowerCase()
    ) {
      return reject(
        'UNASSESSABLE',
        [
          !sourceInputVerification.valid
            ? `SOURCE_DECISION_INPUT_${sourceInputVerification.reason.toUpperCase()}`
            : '',
          !destinationInputVerification.valid
            ? `DESTINATION_DECISION_INPUT_${destinationInputVerification.reason.toUpperCase()}`
            : '',
          sourceInputVerification.linkedPreTradeUid?.toLowerCase() !== source.uid.toLowerCase()
            ? 'SOURCE_DECISION_INPUT_PRETRADE_MISMATCH'
            : '',
          destinationInputVerification.linkedPreTradeUid?.toLowerCase() !==
          destination.uid.toLowerCase()
            ? 'DESTINATION_DECISION_INPUT_PRETRADE_MISMATCH'
            : '',
        ].filter(Boolean),
        details
      );
    }
    try {
      const commitment = buildDecisionInputPairCommitment(
        sourceInput,
        destinationInput,
        input.decisionInputTrust.policy
      );
      decisionInputPair = {
        sourceUid: sourceInputVerification.uid!,
        destinationUid: destinationInputVerification.uid!,
        sourceAssessmentHash: sourceInputVerification.assessmentHash!,
        destinationAssessmentHash: destinationInputVerification.assessmentHash!,
        policyDigest: commitment.digest,
      };
      decisionInputQuoteExpiry = Math.min(
        decisionInputQuoteValidUntil(sourceInput, input.decisionInputTrust.policy),
        decisionInputQuoteValidUntil(destinationInput, input.decisionInputTrust.policy)
      );
    } catch {
      return reject('UNASSESSABLE', ['DECISION_INPUT_POLICY_MISMATCH'], details);
    }
  }

  const now = input.now?.() ?? Math.floor(Date.now() / 1000);
  const maxDeviation = Math.min(
    input.maxOracleDeviationBps ?? 100,
    input.decisionInputTrust?.policy.maxReferenceDeviationBps ?? 10_000
  );
  const maxAmountDeviation = input.maxTradeAmountDeviationBps ?? 100;
  const maxSlippage = Math.min(
    input.maxSlippageBps ?? assessment.constraints.maxSlippageBps,
    input.decisionInputTrust?.policy.maxSlippageBps ?? 10_000
  );
  const maxAge = Math.min(
    input.maxBlockAgeSeconds ?? 30,
    input.decisionInputTrust?.policy.maxQuoteAgeSeconds ?? 300
  );
  if (
    ![now, maxDeviation, maxAmountDeviation, maxSlippage, maxAge].every(Number.isSafeInteger) ||
    now < 1 ||
    maxDeviation < 0 ||
    maxDeviation > 10_000 ||
    maxAmountDeviation < 0 ||
    maxAmountDeviation > 10_000 ||
    maxSlippage < 0 ||
    maxSlippage > 10_000 ||
    maxAge < 1 ||
    maxAge > 300
  ) {
    return reject('UNASSESSABLE', ['RISK_POLICY_INVALID'], details);
  }
  const validUntil = Math.min(
    details.deadline,
    assessment.constraints.validUntil ?? 0,
    decisionInputQuoteExpiry
  );
  if (validUntil <= now) return reject('RISK_REJECTED', ['QUOTE_OR_ASSESSMENT_EXPIRED'], details);
  const sourcePrice = uint(sourceData.consensusPrice),
    destinationPrice = uint(destinationData.consensusPrice);
  if (!sourcePrice || !destinationPrice)
    return reject('UNASSESSABLE', ['ORACLE_PRICE_UNAVAILABLE'], details);
  const assessedAmount = uint(sourceData.tradeAmountUsd);
  if (!assessedAmount || assessedAmount !== uint(destinationData.tradeAmountUsd))
    return reject('UNASSESSABLE', ['ASSESSED_TRADE_AMOUNT_UNAVAILABLE'], details);

  try {
    const block = await reader.getBlock({ blockTag: 'latest' });
    if (
      block.number < 0n ||
      block.timestamp > BigInt(Number.MAX_SAFE_INTEGER) ||
      !block.hash ||
      !HASH.test(block.hash)
    )
      return reject('UNASSESSABLE', ['BLOCK_EVIDENCE_UNAVAILABLE'], details);
    const blockTimestamp = Number(block.timestamp);
    if (blockTimestamp > now + 5 || now - blockTimestamp > maxAge)
      return reject('UNASSESSABLE', ['BLOCK_STALE'], details);
    const simulationValidUntil = Math.min(validUntil, blockTimestamp + maxAge);
    if (simulationValidUntil <= now)
      return reject('RISK_REJECTED', ['SIMULATION_WINDOW_EXPIRED'], details);
    const code = await reader.getBytecode({ address: tx.to as Hex, blockNumber: block.number });
    if (
      !code ||
      code === '0x' ||
      keccak256(code).toLowerCase() !== input.routerCodeHash.toLowerCase()
    ) {
      return reject('UNASSESSABLE', ['ROUTER_CODE_UNVERIFIED'], details);
    }
    const [sourceDecimals, destinationDecimals, simulation] = await Promise.all([
      reader.readContract({
        address: p.tokenIn,
        abi: DECIMALS_ABI,
        functionName: 'decimals',
        blockNumber: block.number,
      }),
      reader.readContract({
        address: p.tokenOut,
        abi: DECIMALS_ABI,
        functionName: 'decimals',
        blockNumber: block.number,
      }),
      reader.call({
        account: tx.from as Hex,
        to: tx.to as Hex,
        data: tx.data,
        value: 0n,
        blockNumber: block.number,
      }),
    ]);
    if (
      ![sourceDecimals, destinationDecimals].every(
        (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 36
      ) ||
      !simulation.data
    )
      return reject('UNASSESSABLE', ['SIMULATION_EVIDENCE_UNAVAILABLE'], details);
    const simulated = decodeSimulatedAmountOut(decoded.profile, simulation.data);
    if (simulated < 1n) return reject('RISK_REJECTED', ['SIMULATED_OUTPUT_ZERO'], details);
    const actualAmount =
      (p.amountIn * sourcePrice * 1_000_000n) /
      (10n ** BigInt(sourceDecimals as number) * 100_000_000n);
    if (actualAmount < 1n) return reject('UNASSESSABLE', ['TRADE_AMOUNT_TOO_SMALL'], details);
    const amountDeviation = differenceBps(actualAmount, assessedAmount);
    const expected =
      (p.amountIn * sourcePrice * 10n ** BigInt(destinationDecimals as number)) /
      (destinationPrice * 10n ** BigInt(sourceDecimals as number));
    if (expected < 1n) return reject('UNASSESSABLE', ['ORACLE_REFERENCE_TOO_SMALL'], details);
    const deviation = differenceBps(simulated, expected);
    const slippage =
      simulated > p.amountOutMinimum
        ? Number(((simulated - p.amountOutMinimum) * 10_000n) / simulated)
        : 0;
    const reasonCodes: string[] = [];
    if (simulated < p.amountOutMinimum) reasonCodes.push('SIMULATED_OUTPUT_BELOW_MINIMUM');
    if (deviation > maxDeviation) reasonCodes.push('QUOTE_ORACLE_DEVIATION_EXCEEDED');
    if (amountDeviation > maxAmountDeviation) reasonCodes.push('TRADE_AMOUNT_SCOPE_MISMATCH');
    if (slippage > maxSlippage) reasonCodes.push('MINIMUM_OUTPUT_TOO_LOW');
    if (blockTimestamp > details.deadline) reasonCodes.push('SWAP_DEADLINE_PASSED');
    return {
      schema: 'insight.swap-transaction-risk.v1',
      status: reasonCodes.length ? 'RISK_REJECTED' : 'ACCEPTABLE',
      reasonCodes,
      transaction: details,
      evidence: {
        blockNumber: block.number.toString(),
        blockHash: block.hash,
        blockTimestamp,
        simulatedAmountOut: simulated.toString(),
        oracleExpectedAmountOut: expected.toString(),
        oracleDeviationBps: deviation,
        actualTradeAmountUsdMicros: actualAmount.toString(),
        assessedTradeAmountUsdMicros: assessedAmount.toString(),
        tradeAmountDeviationBps: amountDeviation,
        allowedSlippageBps: slippage,
        routerCodeHash: input.routerCodeHash.toLowerCase() as Hex,
        sourceAttestationUid: source.uid,
        destinationAttestationUid: destination.uid,
        ...(decisionInputPair ? { decisionInputPair } : {}),
      },
      validUntil: simulationValidUntil,
      signed: false,
    };
  } catch {
    return reject('UNASSESSABLE', ['SIMULATION_UNAVAILABLE'], details);
  }
}
