import { decodeFunctionData, keccak256, toBytes } from 'viem';

import { V3_SINGLE_SWAP_ABI } from './swap-transaction-risk';

import type {
  PreparedExactCallTransaction,
  PriorSealContextCommitment,
  PriorSealIntent,
  PriorSealSubmitTransaction,
} from './types';

export const PRIORSEAL_SWAP_APPROVAL_NAMESPACE = 'priorseal.swap-approval.v1';

type DefiTransaction = {
  chainId: number;
  from: string;
  to: string;
  data: `0x${string}`;
  nonce: string;
  value: string;
};

type DefiAttempt = {
  authorizationId: string;
  status: string;
  transaction: DefiTransaction;
  txHash: string | null;
};

export type PriorSealGatewayAcceptanceKey = {
  issuer: string;
  keyId: string;
  algorithm: string;
  publicKey: string;
  status: string;
  validFrom: number | null;
  validUntil: number | null;
};

/** Structural type for PriorSeal's Node-only `priorseal-sdk/defi` gateway. */
export interface PriorSealDefiExecutionGateway {
  execute(input: {
    audience: string;
    authorizationId: string;
    intent: PriorSealIntent;
    transaction: DefiTransaction;
    acceptanceKey: PriorSealGatewayAcceptanceKey;
    adapter: { kind: 'uniswap-v3-single'; approval: unknown };
  }): Promise<{ replay: boolean; attempt: DefiAttempt }>;
  status(authorizationId: string): Promise<DefiAttempt | null>;
}

export class PriorSealGatewayExecutionError extends Error {
  readonly name = 'PriorSealGatewayExecutionError';

  constructor(
    message: string,
    readonly authorizationId: string,
    readonly attemptStatus: string | null,
    options: { cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
  }
}

/** Create a submit callback that delegates the exact call to PriorSeal's durable
 * DeFi gateway, which rechecks its accepted authorization before signing and
 * broadcasting. Keep the gateway, shared attempt store and signer on the server.
 */
export function createPriorSealDefiSubmitter(input: {
  gateway: PriorSealDefiExecutionGateway;
  approval: unknown;
  routerAddress: `0x${string}`;
  routerCodeHash: `0x${string}`;
  acceptanceKey: PriorSealGatewayAcceptanceKey;
}): PriorSealSubmitTransaction {
  if (
    !input.gateway ||
    typeof input.gateway.execute !== 'function' ||
    typeof input.gateway.status !== 'function'
  ) {
    throw new TypeError('PriorSeal DeFi execution gateway with status lookup is required.');
  }
  if (
    !input.acceptanceKey ||
    typeof input.acceptanceKey.issuer !== 'string' ||
    !input.acceptanceKey.issuer.trim() ||
    typeof input.acceptanceKey.keyId !== 'string' ||
    !input.acceptanceKey.keyId.trim() ||
    input.acceptanceKey.algorithm !== 'Ed25519' ||
    typeof input.acceptanceKey.publicKey !== 'string' ||
    !input.acceptanceKey.publicKey.includes('BEGIN PUBLIC KEY') ||
    !['active', 'retired'].includes(input.acceptanceKey.status) ||
    ![input.acceptanceKey.validFrom, input.acceptanceKey.validUntil].every(
      (value) => value === null || (Number.isSafeInteger(value) && value > 0)
    ) ||
    (input.acceptanceKey.validFrom !== null &&
      input.acceptanceKey.validUntil !== null &&
      input.acceptanceKey.validFrom > input.acceptanceKey.validUntil)
  ) {
    throw new TypeError('A valid, independently pinned PriorSeal acceptance key is required.');
  }
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(input.routerAddress) ||
    !/^0x[0-9a-fA-F]{64}$/.test(input.routerCodeHash)
  ) {
    throw new TypeError('A reviewed Uniswap V3 router address and code hash are required.');
  }
  const approval =
    input.approval && typeof input.approval === 'object' && !Array.isArray(input.approval)
      ? (input.approval as Record<string, unknown>)
      : null;
  if (
    typeof approval?.routerCodeHash !== 'string' ||
    approval.routerCodeHash.toLowerCase() !== input.routerCodeHash.toLowerCase() ||
    typeof approval.router !== 'string' ||
    approval.router.toLowerCase() !== input.routerAddress.toLowerCase()
  ) {
    throw new TypeError(
      'Insight and PriorSeal must use the same reviewed router address and code hash.'
    );
  }

  const normalizedApproval = Object.freeze(normalizeSwapApproval(input.approval));
  if (
    normalizedApproval.routerCodeHash !== input.routerCodeHash.toLowerCase() ||
    normalizedApproval.router !== input.routerAddress.toLowerCase()
  ) {
    throw new TypeError('PriorSeal swap approval does not match the reviewed router deployment.');
  }
  const authorizationContextCommitments: readonly PriorSealContextCommitment[] = Object.freeze([
    Object.freeze({
      namespace: PRIORSEAL_SWAP_APPROVAL_NAMESPACE,
      algorithm: 'keccak256',
      digest: keccak256(toBytes(JSON.stringify(normalizedApproval))),
    }),
  ]);

  const submitTransaction: PriorSealSubmitTransaction = async ({
    transaction,
    priorSealAuthorization,
  }) => {
    assertApprovalMatchesTransaction(normalizedApproval, transaction);
    const authorization = priorSealAuthorization.authorization;
    const authorizationId = authorization.authorizationId;
    if (
      !authorizationId ||
      !authorization.audience ||
      authorization.intent.schema !== 'priorseal.intent.v2'
    ) {
      throw new TypeError('Accepted PriorSeal authorization is incomplete.');
    }
    const exactTransaction = toDefiTransaction(transaction);
    let attempt: DefiAttempt | null = null;
    try {
      ({ attempt } = await input.gateway.execute({
        audience: authorization.audience,
        authorizationId,
        intent: authorization.intent,
        transaction: exactTransaction,
        acceptanceKey: input.acceptanceKey,
        adapter: { kind: 'uniswap-v3-single', approval: normalizedApproval },
      }));
    } catch (cause) {
      try {
        attempt = await input.gateway.status(authorizationId);
      } catch {
        throw new PriorSealGatewayExecutionError(
          `PriorSeal gateway execution is unresolved; inspect authorization ${authorizationId} before retrying.`,
          authorizationId,
          null,
          { cause }
        );
      }
      if (!attempt?.txHash || attempt.status === 'REJECTED') {
        throw new PriorSealGatewayExecutionError(
          `PriorSeal gateway execution is unresolved; inspect authorization ${authorizationId} before retrying.`,
          authorizationId,
          attempt?.status ?? null,
          { cause }
        );
      }
    }
    if (
      !attempt ||
      attempt.authorizationId !== authorizationId ||
      !sameTransaction(attempt.transaction, exactTransaction) ||
      !/^0x[0-9a-fA-F]{64}$/.test(String(attempt.txHash)) ||
      attempt.status === 'REJECTED'
    ) {
      throw new PriorSealGatewayExecutionError(
        `PriorSeal gateway returned no submitted transaction for authorization ${authorizationId}.`,
        authorizationId,
        attempt?.status ?? null
      );
    }
    return { txHash: attempt.txHash!, taker: transaction.from };
  };
  Object.defineProperties(submitTransaction, {
    authorizationContextCommitments: { value: authorizationContextCommitments, enumerable: true },
    assertAuthorizationTransaction: {
      value: (transaction: PreparedExactCallTransaction) =>
        assertApprovalMatchesTransaction(normalizedApproval, transaction),
      enumerable: true,
    },
  });
  return Object.freeze(submitTransaction);
}

function normalizeSwapApproval(value: unknown): {
  schema: 'priorseal.swap-approval.v1';
  chainId: number;
  sender: string;
  router: string;
  routerCodeHash: string;
  inputToken: string;
  outputToken: string;
  maxInputAmount: string;
  minOutputAmount: string;
  recipient: string;
  fee: number;
  deadline: number;
} {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('A valid PriorSeal V3 swap approval is required.');
  }
  const candidate = value as Record<string, unknown>;
  const keys = [
    'schema',
    'chainId',
    'sender',
    'router',
    'routerCodeHash',
    'inputToken',
    'outputToken',
    'maxInputAmount',
    'minOutputAmount',
    'recipient',
    'fee',
    'deadline',
  ];
  if (Object.keys(candidate).sort().join(',') !== [...keys].sort().join(',')) {
    throw new TypeError('PriorSeal V3 swap approval has an unsupported shape.');
  }
  const nonzeroAddress = (entry: unknown, field: string): string => {
    if (
      typeof entry !== 'string' ||
      !/^0x[0-9a-fA-F]{40}$/.test(entry) ||
      /^0x0{40}$/i.test(entry)
    ) {
      throw new TypeError(`PriorSeal swap approval ${field} must be a nonzero EVM address.`);
    }
    return entry.toLowerCase();
  };
  const positiveAmount = (entry: unknown, field: string): string => {
    if (
      typeof entry !== 'string' ||
      !/^(0|[1-9][0-9]*)$/.test(entry) ||
      BigInt(entry) < 1n ||
      BigInt(entry) >= 2n ** 256n
    ) {
      throw new TypeError(
        `PriorSeal swap approval ${field} must be a positive uint256 decimal string.`
      );
    }
    return entry;
  };
  if (candidate.schema !== 'priorseal.swap-approval.v1') {
    throw new TypeError('PriorSeal V3 swap approval schema is unsupported.');
  }
  if (
    typeof candidate.chainId !== 'number' ||
    !Number.isSafeInteger(candidate.chainId) ||
    candidate.chainId < 1
  ) {
    throw new TypeError('PriorSeal swap approval chainId must be a positive safe integer.');
  }
  if (
    typeof candidate.fee !== 'number' ||
    !Number.isSafeInteger(candidate.fee) ||
    candidate.fee < 1 ||
    candidate.fee >= 1_000_000
  ) {
    throw new TypeError('PriorSeal swap approval fee is invalid.');
  }
  if (
    typeof candidate.deadline !== 'number' ||
    !Number.isSafeInteger(candidate.deadline) ||
    candidate.deadline < 1
  ) {
    throw new TypeError('PriorSeal swap approval deadline is invalid.');
  }
  if (
    typeof candidate.routerCodeHash !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(candidate.routerCodeHash)
  ) {
    throw new TypeError('PriorSeal swap approval routerCodeHash is invalid.');
  }
  const inputToken = nonzeroAddress(candidate.inputToken, 'inputToken');
  const outputToken = nonzeroAddress(candidate.outputToken, 'outputToken');
  if (inputToken === outputToken)
    throw new TypeError('PriorSeal swap approval token pair must be distinct.');
  return {
    schema: 'priorseal.swap-approval.v1',
    chainId: candidate.chainId,
    sender: nonzeroAddress(candidate.sender, 'sender'),
    router: nonzeroAddress(candidate.router, 'router'),
    routerCodeHash: candidate.routerCodeHash.toLowerCase(),
    inputToken,
    outputToken,
    maxInputAmount: positiveAmount(candidate.maxInputAmount, 'maxInputAmount'),
    minOutputAmount: positiveAmount(candidate.minOutputAmount, 'minOutputAmount'),
    recipient: nonzeroAddress(candidate.recipient, 'recipient'),
    fee: candidate.fee,
    deadline: candidate.deadline,
  };
}

function assertApprovalMatchesTransaction(
  approval: ReturnType<typeof normalizeSwapApproval>,
  transaction: PreparedExactCallTransaction
): void {
  let decoded: ReturnType<typeof decodeFunctionData<typeof V3_SINGLE_SWAP_ABI>>;
  try {
    decoded = decodeFunctionData({ abi: V3_SINGLE_SWAP_ABI, data: transaction.data });
  } catch (cause) {
    throw new TypeError(
      'Prepared transaction is not a supported Uniswap V3 exactInputSingle call.',
      { cause }
    );
  }
  if (decoded.functionName !== 'exactInputSingle') {
    throw new TypeError(
      'Prepared transaction is not a supported Uniswap V3 exactInputSingle call.'
    );
  }
  const params = decoded.args[0];
  const amountIn = BigInt(params.amountIn);
  const minimumOutput = BigInt(params.amountOutMinimum);
  const transactionValue = BigInt(transaction.value ?? 0);
  if (
    transaction.chainId !== approval.chainId ||
    transaction.from.toLowerCase() !== approval.sender ||
    transaction.to.toLowerCase() !== approval.router ||
    transactionValue !== 0n ||
    params.tokenIn.toLowerCase() !== approval.inputToken ||
    params.tokenOut.toLowerCase() !== approval.outputToken ||
    params.recipient.toLowerCase() !== approval.recipient ||
    params.fee !== approval.fee ||
    params.sqrtPriceLimitX96 !== 0n ||
    params.deadline > BigInt(approval.deadline) ||
    amountIn < 1n ||
    amountIn > BigInt(approval.maxInputAmount) ||
    minimumOutput < BigInt(approval.minOutputAmount)
  ) {
    throw new TypeError(
      'Prepared transaction does not satisfy the committed PriorSeal swap approval.'
    );
  }
}

function toDefiTransaction(transaction: PreparedExactCallTransaction): DefiTransaction {
  if (!Number.isSafeInteger(transaction.chainId) || transaction.chainId < 1) {
    throw new TypeError('Prepared transaction chainId must be a positive safe integer.');
  }
  return Object.freeze({
    chainId: transaction.chainId,
    from: transaction.from,
    to: transaction.to,
    data: transaction.data,
    nonce: toUnsignedDecimal(transaction.nonce, 'nonce'),
    value: toUnsignedDecimal(transaction.value ?? 0, 'value'),
  });
}

function toUnsignedDecimal(value: bigint | number | string, field: string): string {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) {
    throw new TypeError(`Prepared transaction ${field} must be an unsigned integer.`);
  }
  if (typeof value === 'string' && !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new TypeError(`Prepared transaction ${field} must be an unsigned decimal string.`);
  }
  const parsed = BigInt(value);
  if (parsed < 0n || parsed >= 2n ** 256n) {
    throw new TypeError(`Prepared transaction ${field} is outside uint256.`);
  }
  return parsed.toString();
}

function sameTransaction(actual: DefiTransaction, expected: DefiTransaction): boolean {
  return Boolean(
    actual &&
    actual.chainId === expected.chainId &&
    actual.from?.toLowerCase() === expected.from.toLowerCase() &&
    actual.to?.toLowerCase() === expected.to.toLowerCase() &&
    actual.data?.toLowerCase() === expected.data.toLowerCase() &&
    actual.nonce === expected.nonce &&
    actual.value === expected.value
  );
}
