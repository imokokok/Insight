import { keccak256, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  baseAgentSwapGuardDecisionHash,
  type BaseAgentSwapGuardResult,
} from '../baseAgentSwapGuard';
import {
  createBaseAgentSwapGuardDecision,
  verifyBaseAgentSwapGuardDecision,
} from '../baseAgentSwapGuardAttestation';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const TOKEN = '0x4200000000000000000000000000000000000006' as const;
const ROUTER = '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5' as const;
const APPROVAL_DATA = '0x095ea7b3' as Hex;
const SWAP_DATA = '0x414bf389' as Hex;
const NOW = 1_792_252_800;

function guard(): BaseAgentSwapGuardResult {
  const unsigned: Omit<BaseAgentSwapGuardResult, 'decisionHash'> = {
    schema: 'insight.base-agent-swap-guard.v1',
    verdict: 'ALLOW',
    reasonCodes: [],
    evaluatedAt: new Date(NOW * 1_000).toISOString(),
    validUntil: NOW + 60,
    scope: {
      chainId: 8453,
      profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
      transactionAuthority: 'none',
      supportedCallShape: 'reviewed_single_hop_direct_router',
      accountAbstraction: 'not_assessed',
    },
    policy: {
      maxSlippageBps: 50,
      maxPriceImpactBps: 50,
      maxTwapDeviationBps: 50,
      maxReferenceDeviationBps: 100,
      maxQuoteAgeSeconds: 60,
    },
    market: {
      venue: 'aerodrome-slipstream',
      market: 'WETH/USDC',
      sourceAsset: 'WETH',
      destinationAsset: 'USDC',
      observedAt: new Date(NOW * 1_000).toISOString(),
      quoteAgeSeconds: 0,
      sourceFreshnessSeconds: 0,
      block: {
        number: '1',
        hash: `0x${'11'.repeat(32)}`,
        timestamp: new Date(NOW * 1_000).toISOString(),
      },
      pool: '0x2222222222222222222222222222222222222222',
      quoter: '0x3333333333333333333333333333333333333333',
      router: { address: ROUTER, codeHash: `0x${'44'.repeat(32)}` },
      exactInput: {
        amountInRaw: '1000000000000000000',
        quotedAmountOutRaw: '2000000000',
        amountOutMinimumRaw: '1990000000',
        effectiveDestinationPerSource: 2000,
        routeQuotePriceUsd: 2000,
        destinationConsensusPriceUsd: 1,
        priceImpactBps: 1,
        twapDeviationBpsFromSpot: 1,
      },
    },
    binding: {
      chainId: 8453,
      recipient: ACCOUNT,
      approval: {
        token: TOKEN,
        spender: ROUTER,
        amountRaw: '1000000000000000000',
        calldataHash: keccak256(APPROVAL_DATA),
      },
      swap: { to: ROUTER, value: '0x0', calldataHash: keccak256(SWAP_DATA) },
    },
    oracleChecks: null,
    preTradeAttestations: null,
    transactionsToSign: {
      approval: { to: TOKEN, value: '0x0', data: APPROVAL_DATA },
      swap: { to: ROUTER, value: '0x0', data: SWAP_DATA },
    },
    next: {
      humanConfirmationRequired: true,
      action: 'bind_and_request_user_confirmation',
      priorSeal: 'Bind decisionHash and the identical approval/swap calls before authorization.',
    },
    caveats: [],
  };
  return { ...unsigned, decisionHash: baseAgentSwapGuardDecisionHash(unsigned) };
}

const account = privateKeyToAccount(`0x${'11'.repeat(32)}` as Hex);
const dependencies = {
  signer: {
    address: account.address,
    signTypedData: account.signTypedData as (args: unknown) => Promise<string>,
  },
  now: () => NOW,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/base-agent-swap-guard/verify',
  trustAttester: async (address: string) => address.toLowerCase() === account.address.toLowerCase(),
};

describe('Base Agent Swap Guard attestation', () => {
  it('signs and independently verifies the exact approval and swap pair', async () => {
    const decision = await createBaseAgentSwapGuardDecision(guard(), dependencies);

    expect(decision.attestation).not.toBeNull();
    await expect(verifyBaseAgentSwapGuardDecision(decision, dependencies)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });

  it('signs and verifies a BNB Smart Chain decision with chain 56 in the signed data', async () => {
    const { decisionHash: _omit, ...rest } = guard();
    const bnbUnsigned: Omit<BaseAgentSwapGuardResult, 'decisionHash'> = {
      ...rest,
      scope: { ...rest.scope, chainId: 56, profileId: 'bnb-pancakeswap-v3-usdt-usdc-100' },
      binding: { ...rest.binding, chainId: 56 },
    };
    const unsigned = {
      ...bnbUnsigned,
      decisionHash: baseAgentSwapGuardDecisionHash(bnbUnsigned),
    };
    const decision = await createBaseAgentSwapGuardDecision(unsigned, dependencies);

    expect(decision.attestation).not.toBeNull();
    expect(decision.attestation?.data.chainId).toBe(56);
    await expect(verifyBaseAgentSwapGuardDecision(decision, dependencies)).resolves.toMatchObject({
      valid: true,
      reason: 'verified',
    });
  });

  it('refuses an approval that targets the router instead of the input token contract', async () => {
    const invalid = guard();
    invalid.transactionsToSign!.approval.to = ROUTER;

    const decision = await createBaseAgentSwapGuardDecision(invalid, dependencies);
    expect(decision.attestation).toBeNull();
  });

  it('detects swapped calldata after a signed decision is retained', async () => {
    const decision = await createBaseAgentSwapGuardDecision(guard(), dependencies);
    decision.guard.transactionsToSign!.swap.data = '0x1234';

    await expect(verifyBaseAgentSwapGuardDecision(decision, dependencies)).resolves.toMatchObject({
      valid: false,
      reason: expect.stringMatching(/decision_hash_mismatch|call_binding_mismatch/),
    });
  });
});
