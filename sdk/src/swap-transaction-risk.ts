import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  keccak256,
  parseAbi,
  toBytes,
  type Hex,
} from 'viem';

import type { PreparedExactCallTransaction, SwapAssessment } from './types';

/** Original Uniswap V3 SwapRouter. Other selectors need their own reviewed adapter. */
export const V3_SINGLE_SWAP_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
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
  reader: SwapRiskReader;
  maxOracleDeviationBps?: number;
  maxSlippageBps?: number;
  maxBlockAgeSeconds?: number;
  now?: () => number;
}

export interface V3SwapRiskReport {
  schema: 'insight.swap-transaction-risk.v1';
  status: 'ACCEPTABLE' | 'RISK_REJECTED' | 'UNASSESSABLE';
  reasonCodes: string[];
  transaction: {
    chainId: number;
    from: string;
    router: string;
    calldataHash: Hex;
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
    allowedSlippageBps: number;
    routerCodeHash: Hex;
    sourceAttestationUid: string;
    destinationAttestationUid: string;
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
    typeof tx.data !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(tx.data) ||
    uint(tx.value ?? 0) !== 0n ||
    !HASH.test(input.routerCodeHash)
  ) {
    return reject('UNASSESSABLE', ['TRANSACTION_OR_PROFILE_INVALID']);
  }
  let decoded: ReturnType<typeof decodeFunctionData<typeof V3_SINGLE_SWAP_ABI>>;
  try {
    decoded = decodeFunctionData({ abi: V3_SINGLE_SWAP_ABI, data: tx.data });
  } catch {
    return reject('UNASSESSABLE', ['UNSUPPORTED_SWAP_CALL']);
  }
  if (
    decoded.functionName !== 'exactInputSingle' ||
    encodeFunctionData({
      abi: V3_SINGLE_SWAP_ABI,
      functionName: 'exactInputSingle',
      args: decoded.args,
    }).toLowerCase() !== tx.data.toLowerCase()
  ) {
    return reject('UNASSESSABLE', ['UNSUPPORTED_SWAP_CALL']);
  }
  const p = decoded.args[0];
  if (
    p.amountIn < 1n ||
    p.amountOutMinimum < 1n ||
    p.sqrtPriceLimitX96 !== 0n ||
    p.deadline > BigInt(Number.MAX_SAFE_INTEGER) ||
    p.deadline < 1n ||
    p.tokenIn.toLowerCase() === p.tokenOut.toLowerCase()
  ) {
    return reject('UNASSESSABLE', ['UNSUPPORTED_SWAP_SEMANTICS']);
  }
  const details: NonNullable<V3SwapRiskReport['transaction']> = {
    chainId: tx.chainId,
    from: tx.from.toLowerCase(),
    router: tx.to.toLowerCase(),
    calldataHash: keccak256(tx.data),
    inputToken: p.tokenIn.toLowerCase(),
    outputToken: p.tokenOut.toLowerCase(),
    recipient: p.recipient.toLowerCase(),
    fee: p.fee,
    amountIn: p.amountIn.toString(),
    amountOutMinimum: p.amountOutMinimum.toString(),
    deadline: Number(p.deadline),
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

  const now = input.now?.() ?? Math.floor(Date.now() / 1000);
  const maxDeviation = input.maxOracleDeviationBps ?? 100;
  const maxSlippage = input.maxSlippageBps ?? assessment.constraints.maxSlippageBps;
  const maxAge = input.maxBlockAgeSeconds ?? 30;
  if (
    ![now, maxDeviation, maxSlippage, maxAge].every(Number.isSafeInteger) ||
    now < 1 ||
    maxDeviation < 0 ||
    maxDeviation > 10_000 ||
    maxSlippage < 0 ||
    maxSlippage > 10_000 ||
    maxAge < 1 ||
    maxAge > 300
  ) {
    return reject('UNASSESSABLE', ['RISK_POLICY_INVALID'], details);
  }
  const validUntil = Math.min(details.deadline, assessment.constraints.validUntil ?? 0);
  if (validUntil <= now) return reject('RISK_REJECTED', ['QUOTE_OR_ASSESSMENT_EXPIRED'], details);
  const sourcePrice = uint(sourceData.consensusPrice),
    destinationPrice = uint(destinationData.consensusPrice);
  if (!sourcePrice || !destinationPrice)
    return reject('UNASSESSABLE', ['ORACLE_PRICE_UNAVAILABLE'], details);

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
    const simulated = decodeFunctionResult({
      abi: V3_SINGLE_SWAP_ABI,
      functionName: 'exactInputSingle',
      data: simulation.data,
    });
    if (simulated < 1n) return reject('RISK_REJECTED', ['SIMULATED_OUTPUT_ZERO'], details);
    const expected =
      (p.amountIn * sourcePrice * 10n ** BigInt(destinationDecimals as number)) /
      (destinationPrice * 10n ** BigInt(sourceDecimals as number));
    if (expected < 1n) return reject('UNASSESSABLE', ['ORACLE_REFERENCE_TOO_SMALL'], details);
    const deviation = Number(
      ((simulated > expected ? simulated - expected : expected - simulated) * 10_000n) / expected
    );
    const slippage =
      simulated > p.amountOutMinimum
        ? Number(((simulated - p.amountOutMinimum) * 10_000n) / simulated)
        : 0;
    const reasonCodes: string[] = [];
    if (simulated < p.amountOutMinimum) reasonCodes.push('SIMULATED_OUTPUT_BELOW_MINIMUM');
    if (deviation > maxDeviation) reasonCodes.push('QUOTE_ORACLE_DEVIATION_EXCEEDED');
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
        allowedSlippageBps: slippage,
        routerCodeHash: input.routerCodeHash.toLowerCase() as Hex,
        sourceAttestationUid: source.uid,
        destinationAttestationUid: destination.uid,
      },
      validUntil,
      signed: false,
    };
  } catch {
    return reject('UNASSESSABLE', ['SIMULATION_UNAVAILABLE'], details);
  }
}
