/**
 * AEON x402 "mandate" client scheme for stablecoins without on-chain EIP-3009
 * `transferWithAuthorization` — notably BNB Smart Chain's Binance-bridged
 * USDC (eip155:56). The stock @x402/evm client scheme signs a token-domain
 * EIP-3009 authorization the facilitator executes on-chain; on such tokens
 * the AEON facilitator instead verifies a *facilitator-domain* EIP-712
 * signature facilitator-side and pulls the tokens itself after a client-side
 * ERC-20 `approve`.
 *
 * Mirrored from the Insight repository (`src/lib/x402/aeonMandate.ts`, where
 * it is unit-tested against a real signature-recovery round trip). Wire
 * format verified against `@aeon-ai-pay/evm@2.1.4`
 * (`ExactEvmScheme.signAuthorizationNoSuperEip3009`) and the live facilitator
 * (facilitator.aeon.xyz, exact v2 on eip155:56), 2026-10-18. Keep the two
 * copies in sync until this scheme ships as its own npm package.
 */
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  type Address,
  type Hex,
} from 'viem';
import type { Chain, TypedDataDefinition } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';

/** Facilitator-side spender that pulls approved tokens (AEON, all chains). */
export const AEON_MANDATE_FACILITATOR: Address = getAddress(
  '0x555e3311a9893c9B17444C1Ff0d88192a57Ef13e'
);

/** Fixed EIP-712 domain values of the AEON mandate flow (not per-token). */
export const AEON_MANDATE_DOMAIN = { name: 'Facilitator', version: '1' } as const;

/** Struct name used by the AEON mandate signature. */
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

const MANDATE_VALID_AFTER_BUFFER_SECONDS = 600;

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

export interface MandateAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
}

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

export type MandateTypedData = TypedDataDefinition<
  typeof aeonMandateTypes,
  typeof AEON_MANDATE_PRIMARY_TYPE
>;

/** x402 v2 exact payment requirements subset the scheme consumes. */
export interface MandatePaymentRequirements {
  network: string;
  payTo: string;
  asset: string;
  amount: string;
  maxTimeoutSeconds: number;
}

export interface MandatePaymentPayloadResult {
  x402Version: number;
  payload: { authorization: MandateAuthorization; signature: Hex };
}

/**
 * Client scheme duck-compatible with `@x402/fetch`'s `x402Client` scheme
 * registration (`scheme: 'exact'` + `createPaymentPayload`). Register it for
 * the specific network whose token lacks EIP-3009 (e.g. eip155:56).
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
    const now = Math.floor(Date.now() / 1000);
    const authorization: MandateAuthorization = {
      from: getAddress(this.signer.address),
      to: getAddress(paymentRequirements.payTo),
      value: paymentRequirements.amount,
      validAfter: String(now - MANDATE_VALID_AFTER_BUFFER_SECONDS),
      validBefore: String(now + paymentRequirements.maxTimeoutSeconds),
      nonce: randomNonce(),
    };

    await this.ensureAllowance(getAddress(paymentRequirements.asset), paymentRequirements.amount);

    const signature = await this.signer.signTypedData({
      domain: { ...AEON_MANDATE_DOMAIN, chainId, verifyingContract: AEON_MANDATE_FACILITATOR },
      types: aeonMandateTypes,
      primaryType: AEON_MANDATE_PRIMARY_TYPE,
      message: {
        token: getAddress(paymentRequirements.asset),
        from: getAddress(authorization.from),
        to: getAddress(authorization.to),
        value: BigInt(authorization.value),
        validAfter: BigInt(authorization.validAfter),
        validBefore: BigInt(authorization.validBefore),
        nonce: authorization.nonce,
        needApprove: true,
      },
    });
    return { x402Version, payload: { authorization, signature } };
  }

  /**
   * Approve the facilitator (unlimited, only when allowance is short) so it
   * can pull the mandated amount. Read-only signers skip this silently; the
   * facilitator's verify then rejects with a clear allowance error.
   */
  private async ensureAllowance(asset: Address, amountAtomic: string): Promise<void> {
    const { readContract, sendTransaction, waitForTransactionReceipt } = this.signer;
    if (!readContract || !sendTransaction || !waitForTransactionReceipt) return;

    const allowance = (await readContract({
      address: asset,
      abi: erc20AllowanceAbi,
      functionName: 'allowance',
      args: [getAddress(this.signer.address), AEON_MANDATE_FACILITATOR],
    })) as unknown;
    if (typeof allowance === 'bigint' && allowance >= BigInt(amountAtomic)) return;

    const hash = await sendTransaction({
      to: asset,
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

/**
 * Build a mandate signer from a raw private key bound to one chain. Uses
 * viem wallet + public clients so the scheme can approve and read allowance;
 * pass a chain-specific `rpcUrl` in production (public fallbacks rate-limit).
 */
export function createMandateSignerFromKey(params: {
  privateKey: string;
  chain: Chain;
  rpcUrl?: string;
}): MandateSigner {
  const account: PrivateKeyAccount = privateKeyToAccount(
    (params.privateKey.startsWith('0x')
      ? params.privateKey
      : `0x${params.privateKey}`) as `0x${string}`
  );
  const transport = http(params.rpcUrl);
  const wallet = createWalletClient({ account, chain: params.chain, transport });
  const publicClient = createPublicClient({ chain: params.chain, transport });
  return {
    address: account.address,
    signTypedData: (typedData) => account.signTypedData(typedData),
    readContract: (args) =>
      publicClient.readContract({
        address: args.address,
        abi: args.abi,
        functionName: args.functionName,
        args: [...args.args],
      }),
    sendTransaction: (tx) =>
      wallet.sendTransaction({ to: tx.to, data: tx.data, account, chain: params.chain }),
    waitForTransactionReceipt: (args) => publicClient.waitForTransactionReceipt(args),
  };
}

function randomNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return `0x${hex}`;
}
