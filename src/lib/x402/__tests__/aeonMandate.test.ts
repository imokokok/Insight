import { getAddress, verifyTypedData, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

import {
  AEON_MANDATE_DOMAIN,
  AEON_MANDATE_FACILITATOR,
  AEON_MANDATE_PRIMARY_TYPE,
  MAX_UINT256,
  aeonMandateTypes,
  buildMandateAuthorization,
  buildMandateTypedData,
  ExactEvmMandateScheme,
  type MandateSigner,
} from '../aeonMandate';

const PAYER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const PAYER = getAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
const PAY_TO = getAddress('0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231');
const BSC_USDC = getAddress('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');
const NETWORK = 'eip155:56';

function baseRequirements() {
  return {
    network: NETWORK,
    payTo: PAY_TO,
    asset: BSC_USDC,
    amount: '20000', // 0.02 USDC on an 18-decimal grid
    maxTimeoutSeconds: 60,
  };
}

describe('buildMandateAuthorization', () => {
  it('backdates validAfter by 600s and bounds validBefore by the quote timeout', () => {
    const auth = buildMandateAuthorization({
      from: PAYER,
      payTo: PAY_TO,
      amountAtomic: '20000',
      maxTimeoutSeconds: 60,
      nowSeconds: 1_760_000_000,
    });
    expect(auth.from).toBe(PAYER);
    expect(auth.to).toBe(PAY_TO);
    expect(auth.value).toBe('20000');
    expect(auth.validAfter).toBe(String(1_760_000_000 - 600));
    expect(auth.validBefore).toBe(String(1_760_000_000 + 60));
    expect(auth.nonce).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('generates a fresh nonce per call', () => {
    const a = buildMandateAuthorization({
      from: PAYER,
      payTo: PAY_TO,
      amountAtomic: '1',
      maxTimeoutSeconds: 60,
    });
    const b = buildMandateAuthorization({
      from: PAYER,
      payTo: PAY_TO,
      amountAtomic: '1',
      maxTimeoutSeconds: 60,
    });
    expect(a.nonce).not.toBe(b.nonce);
  });
});

describe('buildMandateTypedData', () => {
  it('signs the tokenTransferWithAuthorization struct under the fixed Facilitator domain', () => {
    const authorization = buildMandateAuthorization({
      from: PAYER,
      payTo: PAY_TO,
      amountAtomic: '20000',
      maxTimeoutSeconds: 60,
      nowSeconds: 1_760_000_000,
    });
    const typedData = buildMandateTypedData({
      authorization,
      asset: BSC_USDC,
      chainId: 56,
    });
    expect(typedData.domain).toEqual({
      ...AEON_MANDATE_DOMAIN,
      chainId: 56,
      verifyingContract: AEON_MANDATE_FACILITATOR,
    });
    expect(typedData.primaryType).toBe(AEON_MANDATE_PRIMARY_TYPE);
    expect(typedData.types).toEqual(aeonMandateTypes);
    expect(typedData.message).toMatchObject({
      token: BSC_USDC,
      from: PAYER,
      to: PAY_TO,
      needApprove: true,
    });
  });

  it('rejects non-EVM chain ids', () => {
    const authorization = buildMandateAuthorization({
      from: PAYER,
      payTo: PAY_TO,
      amountAtomic: '1',
      maxTimeoutSeconds: 60,
    });
    expect(() =>
      buildMandateTypedData({ authorization, asset: BSC_USDC, chainId: Number.NaN })
    ).toThrow(/Invalid EVM chain id/);
  });
});

describe('ExactEvmMandateScheme', () => {
  function makeSigner(overrides: Partial<MandateSigner> = {}): MandateSigner & {
    approveCalls: { spender: string; amount: bigint }[];
  } {
    const account = privateKeyToAccount(PAYER_KEY);
    const approveCalls: { spender: string; amount: bigint }[] = [];
    return {
      address: account.address,
      approveCalls,
      signTypedData: (typedData) => account.signTypedData(typedData),
      readContract: overrides.readContract,
      sendTransaction: overrides.sendTransaction,
      waitForTransactionReceipt: overrides.waitForTransactionReceipt,
    };
  }

  it('skips approve when allowance already covers the amount', async () => {
    let approveCalls = 0;
    const signer = makeSigner({
      readContract: async () => BigInt('50000'),
      sendTransaction: async () => {
        approveCalls += 1;
        return '0x1';
      },
      waitForTransactionReceipt: async () => ({ status: 'success' }),
    });
    const scheme = new ExactEvmMandateScheme(signer);
    const result = await scheme.createPaymentPayload(2, baseRequirements());
    expect(approveCalls).toBe(0);
    expect(result.x402Version).toBe(2);
    expect(result.payload.authorization.value).toBe('20000');
    expect(result.payload.signature).toMatch(/^0x[0-9a-f]{130}$/i);
  });

  it('approves the facilitator (MAX_UINT256) and waits for success when allowance is short', async () => {
    const approveCalls: { spender: string; amount: bigint }[] = [];
    let receiptStatus = 'success';
    const signer = makeSigner({
      readContract: async () => BigInt(0),
      sendTransaction: async (tx) => {
        const { decodeFunctionData } = await import('viem');
        const decoded = decodeFunctionData({
          abi: (await import('../aeonMandate')).erc20AllowanceAbi,
          data: tx.data,
        });
        approveCalls.push({
          spender: decoded.args[0] as string,
          amount: decoded.args[1] as bigint,
        });
        return '0xhash1';
      },
      waitForTransactionReceipt: async () => ({ status: receiptStatus }),
    });
    const scheme = new ExactEvmMandateScheme(signer);
    await scheme.createPaymentPayload(2, baseRequirements());
    expect(approveCalls).toHaveLength(1);
    expect(approveCalls[0].spender).toBe(AEON_MANDATE_FACILITATOR);
    expect(approveCalls[0].amount).toBe(MAX_UINT256);

    receiptStatus = 'reverted';
    await expect(scheme.createPaymentPayload(2, baseRequirements())).rejects.toThrow(
      /approve transaction failed/
    );
  });

  it('produces a signature that recovers to the payer under the Facilitator domain', async () => {
    const signer = makeSigner(); // read-only: no approve path, pure signature
    const scheme = new ExactEvmMandateScheme(signer);
    const { payload } = await scheme.createPaymentPayload(2, baseRequirements());

    const typedData = buildMandateTypedData({
      authorization: payload.authorization,
      asset: BSC_USDC,
      chainId: 56,
    });
    const recovered = await verifyTypedData({
      ...typedData,
      address: PAYER,
      signature: payload.signature,
    });
    expect(recovered).toBe(true);
  });

  it('is duck-compatible with the x402Client scheme surface', () => {
    const signer = makeSigner();
    const scheme = new ExactEvmMandateScheme(signer);
    expect(scheme.scheme).toBe('exact');
    expect(typeof scheme.createPaymentPayload).toBe('function');
  });

  it('rejects non-EVM networks', async () => {
    const scheme = new ExactEvmMandateScheme(makeSigner());
    await expect(
      scheme.createPaymentPayload(2, { ...baseRequirements(), network: 'solana:mainnet' })
    ).rejects.toThrow(/EVM networks only/);
  });
});

describe('wallet client compatibility', () => {
  it('a viem walletClient on bsc satisfies the mandate signer surface', () => {
    const account = privateKeyToAccount(PAYER_KEY);
    const client = createWalletClient({ account, chain: bsc, transport: http() });
    const signer: MandateSigner = {
      address: client.account.address,
      signTypedData: (typedData) => client.signTypedData(typedData),
    };
    expect(signer.address).toBe(account.address);
  });
});
