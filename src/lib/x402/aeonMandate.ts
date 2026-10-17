/**
 * Client-side payer for the AEON x402 facilitator "mandate" flow on networks
 * whose stablecoin has no on-chain EIP-3009 `transferWithAuthorization`
 * (notably BNB Smart Chain's Binance-bridged USDC, eip155:56).
 *
 * The stock `@x402/evm` client scheme signs a token-domain EIP-712
 * `TransferWithAuthorization` that the facilitator would normally execute
 * on-chain. With no EIP-3009 entrypoint the AEON facilitator instead verifies
 * a *facilitator-domain* signature facilitator-side and moves the tokens
 * itself after a client-side ERC-20 `approve`. That wire format is what this
 * module produces; it mirrors `@aeon-ai-pay/evm@2.1.4`
 * (`ExactEvmScheme.signAuthorizationNoSuperEip3009`), verified against the
 * live facilitator (facilitator.aeon.xyz, exact v2 on eip155:56) on 2026-10-18.
 *
 * Wire contract (all three pieces are load-bearing):
 *  1. ERC-20 `approve(AEON_MANDATE_FACILITATOR, amount)` when allowance is
 *     short — the facilitator pulls, it never pushes.
 *  2. EIP-712 over domain { name: 'Facilitator', version: '1', chainId,
 *     verifyingContract: AEON_MANDATE_FACILITATOR } with the
 *     `tokenTransferWithAuthorization` struct (note the extra `token` and
 *     `needApprove` fields vs standard EIP-3009).
 *  3. Standard x402 v2 exact payload shape `{ authorization, signature }`
 *     where `authorization` keeps the stock from/to/value/validAfter/
 *     validBefore/nonce fields — the facilitator joins the two halves.
 */

import { getAddress, type Address, type Hex, type TypedDataDefinition } from 'viem';

/** Facilitator-side spender that pulls approved tokens (AEON, all chains). */
export const AEON_MANDATE_FACILITATOR: Address = getAddress(
  '0x555e3311a9893c9B17444C1Ff0d88192a57Ef13e'
);

/** Fixed EIP-712 domain values of the AEON mandate flow (not per-token). */
export const AEON_MANDATE_DOMAIN = { name: 'Facilitator', version: '1' } as const;

/** Struct name and field order used by the AEON mandate signature. */
export const AEON_MANDATE_PRIMARY_TYPE = 'tokenTransferWithAuthorization' as const;

export const aeonMandateTypes = {
  tokenTransferWithAuthorization: [
    { name: 'token', type: 'address' },
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'needApprove', type: 'bool' },
  ],
} as const;

/** ERC-20 allow/approve surface the mandate flow needs. */
export const erc20AllowanceAbi = [
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const;

/** Buffer subtracted from signing time for `validAfter` (AEON uses 600s). */
export const MANDATE_VALID_AFTER_BUFFER_SECONDS = 600;

export const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

/** The authorization half of the x402 exact payload (stock field set). */
export interface MandateAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
}

/** Struct actually signed under the Facilitator domain. */
export interface MandateMessage {
  token: Address;
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  needApprove: true;
}

export type MandateTypedData = TypedDataDefinition<
  typeof aeonMandateTypes,
  typeof AEON_MANDATE_PRIMARY_TYPE
>;

/** Minimal signer surface the mandate scheme needs (viem wallet-shaped). */
export interface MandateSigner {
  address: Address;
  signTypedData: (typedData: MandateTypedData) => Promise<Hex>;
  readContract?: (args: {
    address: Address;
    abi: typeof erc20AllowanceAbi;
    functionName: 'allowance';
    args: readonly [Address, Address];
  }) => Promise<unknown>;
  sendTransaction?: (tx: { to: Address; data: Hex }) => Promise<Hex>;
  waitForTransactionReceipt?: (args: { hash: Hex }) => Promise<{ status: string }>;
}

/** x402 v2 exact payment requirements subset the scheme consumes. */
export interface MandatePaymentRequirements {
  /** CAIP-2 network id, e.g. `eip155:56`. */
  network: string;
  /** Payment recipient (the resource server's payTo). */
  payTo: string;
  /** ERC-20 token contract holding the funds. */
  asset: string;
  /** Atomic-unit amount string from the 402 quote. */
  amount: string;
  /** Quote validity the facilitator re-checks; bounds `validBefore`. */
  maxTimeoutSeconds: number;
}

export interface MandatePaymentPayload {
  authorization: MandateAuthorization;
  signature: Hex;
}

export interface MandatePaymentPayloadResult {
  x402Version: number;
  payload: MandatePaymentPayload;
}

/**
 * Build the unsigned authorization half. `validAfter` is backdated by 600s
 * and `validBefore` extends over the quote timeout, mirroring the AEON client.
 */
export function buildMandateAuthorization(params: {
  from: Address;
  payTo: Address;
  amountAtomic: string;
  maxTimeoutSeconds: number;
  /** Injectable clock (unix seconds) for tests. */
  nowSeconds?: number;
}): MandateAuthorization {
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  return {
    from: getAddress(params.from),
    to: getAddress(params.payTo),
    value: params.amountAtomic,
    validAfter: String(now - MANDATE_VALID_AFTER_BUFFER_SECONDS),
    validBefore: String(now + params.maxTimeoutSeconds),
    nonce: randomNonce(),
  };
}

/** Build the EIP-712 typed data the AEON facilitator verifies. */
export function buildMandateTypedData(params: {
  authorization: MandateAuthorization;
  /** ERC-20 token contract; checksummed into the message. */
  asset: string;
  /** EVM chain id parsed from the CAIP-2 network. */
  chainId: number;
}): MandateTypedData {
  const chainId = Number(params.chainId);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid EVM chain id for mandate signature: ${params.chainId}`);
  }
  const message: MandateMessage = {
    token: getAddress(params.asset),
    from: getAddress(params.authorization.from),
    to: getAddress(params.authorization.to),
    value: BigInt(params.authorization.value),
    validAfter: BigInt(params.authorization.validAfter),
    validBefore: BigInt(params.authorization.validBefore),
    nonce: params.authorization.nonce,
    needApprove: true,
  };
  return {
    domain: {
      ...AEON_MANDATE_DOMAIN,
      chainId,
      verifyingContract: AEON_MANDATE_FACILITATOR,
    },
    types: aeonMandateTypes,
    primaryType: AEON_MANDATE_PRIMARY_TYPE,
    message,
  };
}

/**
 * Client scheme duck-compatible with `@x402/fetch`'s `x402Client` scheme
 * registration (`scheme: 'exact'` + `createPaymentPayload`). Registers for a
 * specific CAIP-2 network only — mandate signing is per-network because it
 * only applies to tokens without EIP-3009.
 */
export class ExactEvmMandateScheme {
  readonly scheme = 'exact' as const;

  constructor(private readonly signer: MandateSigner) {}

  async createPaymentPayload(
    x402Version: number,
    paymentRequirements: MandatePaymentRequirements
  ): Promise<MandatePaymentPayloadResult> {
    if (!paymentRequirements.network.startsWith('eip155:')) {
      throw new Error(
        `AEON mandate scheme supports EVM networks only, got ${paymentRequirements.network}`
      );
    }
    const chainId = Number(paymentRequirements.network.split(':')[1]);
    const authorization = buildMandateAuthorization({
      from: this.signer.address,
      payTo: getAddress(paymentRequirements.payTo),
      amountAtomic: paymentRequirements.amount,
      maxTimeoutSeconds: paymentRequirements.maxTimeoutSeconds,
    });

    await this.ensureAllowance({
      asset: getAddress(paymentRequirements.asset),
      amountAtomic: paymentRequirements.amount,
    });

    const typedData = buildMandateTypedData({
      authorization,
      asset: paymentRequirements.asset,
      chainId,
    });
    const signature = await this.signer.signTypedData(typedData);
    return { x402Version, payload: { authorization, signature } };
  }

  /**
   * Approve the facilitator (unlimited, one tx when allowance is short) so it
   * can pull the mandated amount. Skipped entirely when the signer is
   * read-only (no `sendTransaction`) — the facilitator's verify rejects with
   * a clear allowance error instead of the client guessing.
   */
  private async ensureAllowance(params: { asset: Address; amountAtomic: string }): Promise<void> {
    const { readContract, sendTransaction, waitForTransactionReceipt } = this.signer;
    if (!readContract || !sendTransaction || !waitForTransactionReceipt) return;

    const allowance = (await readContract({
      address: params.asset,
      abi: erc20AllowanceAbi,
      functionName: 'allowance',
      args: [getAddress(this.signer.address), AEON_MANDATE_FACILITATOR],
    })) as unknown;

    if (typeof allowance === 'bigint' && allowance >= BigInt(params.amountAtomic)) return;

    const { encodeFunctionData } = await import('viem');
    const hash = await sendTransaction({
      to: params.asset,
      data: encodeFunctionData({
        abi: erc20AllowanceAbi,
        functionName: 'approve',
        args: [AEON_MANDATE_FACILITATOR, MAX_UINT256],
      }),
    });
    const receipt = await waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new Error(`Mandate approve transaction failed: ${hash}`);
    }
  }
}

/** 32 random bytes as 0x-hex (fresh per authorization, per EIP-3009 norms). */
function randomNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return `0x${hex}`;
}
