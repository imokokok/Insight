/**
 * Tests for the Base Agent Swap Guard settlement closure. The service is the
 * post-settlement half of the guard workflow: it verifies the signed decision,
 * requires the executed bytes to match the guarded calls exactly, reconciles the
 * ERC-20 fill against the guarded quote, and signs the closure. These tests pin
 * the fail-closed paths — an unverifiable decision, a byte-different transaction,
 * and a presented-but-wrong approval all produce no settlement.
 */

import { keccak256, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { TRANSFER_TOPIC } from '@/lib/execution/events';
import type {
  RpcClientWithFallback,
  RpcTransaction,
  RpcTransactionReceipt,
} from '@/lib/oracles/utils/rpcClientWithFallback';

import {
  baseAgentSwapGuardDecisionHash,
  type BaseAgentSwapGuardResult,
} from '../baseAgentSwapGuard';
import { createBaseAgentSwapGuardDecision } from '../baseAgentSwapGuardAttestation';
import {
  settleBaseAgentSwapGuard,
  verifyBaseAgentSwapGuardSettlement,
} from '../baseAgentSwapGuardSettlement';

const NOW = 1_792_252_800;
const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const ROUTER = '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5' as const;
const WETH = '0x4200000000000000000000000000000000000006' as const;
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const APPROVAL_DATA = '0x095ea7b3deadbeef' as Hex;
const SWAP_DATA = '0x414bf389cafebabe' as Hex;
const SWAP_TX = ('0x' + 'ab'.repeat(32)) as Hex;
const APPROVAL_TX = ('0x' + 'cd'.repeat(32)) as Hex;

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
        token: WETH,
        spender: ROUTER,
        amountRaw: '1000000000000000000',
        calldataHash: keccak256(APPROVAL_DATA),
      },
      swap: { to: ROUTER, value: '0x0', calldataHash: keccak256(SWAP_DATA) },
    },
    oracleChecks: null,
    preTradeAttestations: null,
    transactionsToSign: {
      approval: { to: WETH, value: '0x0', data: APPROVAL_DATA },
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
const signerDependencies = {
  signer: {
    address: account.address,
    signTypedData: account.signTypedData as (args: unknown) => Promise<string>,
  },
  now: () => NOW,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/base-agent-swap-guard/verify',
  trustAttester: async (address: string) => address.toLowerCase() === account.address.toLowerCase(),
};

async function signedDecision(): Promise<
  Awaited<ReturnType<typeof createBaseAgentSwapGuardDecision>>
> {
  return createBaseAgentSwapGuardDecision(guard(), signerDependencies);
}

function transferLog(
  token: string,
  from: string,
  to: string,
  value: bigint,
  txHash: Hex = SWAP_TX
) {
  const padAddr = (a: string) => '0x' + a.slice(2).padStart(64, '0');
  const padUint = (v: bigint) => '0x' + v.toString(16).padStart(64, '0');
  return {
    address: token as `0x${string}`,
    topics: [TRANSFER_TOPIC, padAddr(from) as `0x${string}`, padAddr(to) as `0x${string}`],
    data: padUint(value) as `0x${string}`,
    blockNumber: '0x10',
    transactionHash: txHash,
    transactionIndex: '0x0',
    logIndex: '0x0',
    removed: false,
  };
}

interface ChainFixture {
  swapTx: RpcTransaction | null;
  approvalTx: RpcTransaction | null;
  receipt: RpcTransactionReceipt | null;
  block: { timestamp: string } | null;
  decimals: Record<string, number>;
}

function baseChain(): ChainFixture {
  return {
    swapTx: {
      hash: SWAP_TX,
      blockNumber: '0x10',
      from: ACCOUNT,
      to: ROUTER,
      value: '0x0',
      input: SWAP_DATA,
    },
    approvalTx: null,
    receipt: {
      transactionHash: SWAP_TX,
      transactionIndex: '0x0',
      blockHash: '0xblock',
      blockNumber: '0x10',
      from: ACCOUNT,
      to: ROUTER,
      cumulativeGasUsed: '0x1',
      gasUsed: '0x5208',
      effectiveGasPrice: '0x3b9aca00',
      status: '0x1',
      type: '0x2',
      contractAddress: null,
      logs: [
        transferLog(WETH, ACCOUNT, ROUTER, 10n ** 18n),
        transferLog(USDC, ROUTER, ACCOUNT, 2_000_000_000n),
      ],
    },
    block: { timestamp: '0x' + (NOW + 10).toString(16) },
    decimals: { [WETH.toLowerCase()]: 18, [USDC.toLowerCase()]: 6 },
  };
}

function fakeClient(fx: ChainFixture): RpcClientWithFallback {
  return {
    getTransactionByHash: async (_key, _endpoints, hash) => {
      const h = hash.toLowerCase();
      if (fx.swapTx && h === fx.swapTx.hash.toLowerCase()) return fx.swapTx;
      if (fx.approvalTx && h === APPROVAL_TX.toLowerCase()) return fx.approvalTx;
      return null;
    },
    getTransactionReceipt: async () => fx.receipt,
    getBlockByNumber: async () => fx.block,
    ethCall: async (_key, _endpoints, token) => {
      const d = fx.decimals[token.toLowerCase()];
      if (d === undefined) throw new Error('no decimals fixture');
      return ('0x' + d.toString(16).padStart(64, '0')) as `0x${string}`;
    },
  } as unknown as RpcClientWithFallback;
}

const baseParams = {
  now: () => NOW,
  trustAttester: signerDependencies.trustAttester,
  signer: signerDependencies.signer,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/base-agent-swap-guard/settlement',
};

describe('settleBaseAgentSwapGuard', () => {
  it('closes a faithful settlement and binds decisionHash, tx hashes and the fill', async () => {
    const decision = await signedDecision();
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(baseChain()),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code} (${result.reason ?? '-'})`);
    const s = result.settlement;
    expect(s.signature).not.toBeNull();
    expect(s.attester).toBe(account.address.toLowerCase());
    expect(s.data.decisionHash).toBe(decision.decisionHash);
    expect(s.data.fillStatus).toBe('FULL');
    expect(s.data.sourceAmountRaw).toBe('1000000000000000000');
    expect(s.data.destinationAmountRaw).toBe('2000000000');
    expect(s.data.realizedSlippageBps).toBe('0');
    // The approval transaction was not presented; that is reported, never hidden.
    expect(s.reasonCodes).toEqual(['APPROVAL_TX_NOT_PRESENTED']);
  });

  it('closes a BNB Smart Chain settlement with chain 56 binding and 18-decimal reconciliation', async () => {
    const bnbUSDT = '0x55d398326f99059fF775485246999027B3197955' as const;
    const bnbUSDC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as const;
    const bnbClone: Record<string, unknown> = JSON.parse(JSON.stringify(guard()));
    delete bnbClone.decisionHash; // baseAgentSwapGuardDecisionHash must not see a hash field.
    const bnbUnsigned: Omit<BaseAgentSwapGuardResult, 'decisionHash'> = {
      ...(bnbClone as unknown as Omit<BaseAgentSwapGuardResult, 'decisionHash'>),
      scope: {
        ...(guard().scope as object),
        chainId: 56,
        profileId: 'bnb-pancakeswap-v3-usdt-usdc-100',
      },
      market: {
        ...guard().market,
        venue: 'pancakeswap-v3',
        market: 'USDT/USDC',
        sourceAsset: 'USDT',
        destinationAsset: 'USDC',
        pool: '0x92b7807bf19b7dddf89b706143896d05228f3121',
        quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
        router: {
          address: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
          codeHash: `0x${'44'.repeat(32)}`,
        },
        exactInput: {
          ...guard().market.exactInput,
          amountInRaw: '1250000000000000000',
          quotedAmountOutRaw: '1249000000000000000',
          amountOutMinimumRaw: '1242755000000000000',
          effectiveDestinationPerSource: 0.9992,
          routeQuotePriceUsd: 1,
          destinationConsensusPriceUsd: 1,
        },
      },
      binding: {
        ...(guard().binding as object),
        chainId: 56,
        approval: {
          ...(guard().binding.approval as object),
          token: bnbUSDT,
          amountRaw: '1250000000000000000',
        },
      },
    } as Omit<BaseAgentSwapGuardResult, 'decisionHash'>;
    // Keep the executable calls consistent with the BNB binding.
    const bnbUnsignedWithCalls = {
      ...bnbUnsigned,
      transactionsToSign: {
        approval: { ...bnbUnsigned.transactionsToSign.approval, to: bnbUSDT },
        swap: { ...bnbUnsigned.transactionsToSign.swap },
      },
    };
    const bnbDecision = await createBaseAgentSwapGuardDecision(
      {
        ...bnbUnsignedWithCalls,
        decisionHash: baseAgentSwapGuardDecisionHash(bnbUnsignedWithCalls),
      },
      signerDependencies
    );

    const bnbFx: ChainFixture = {
      ...baseChain(),
      receipt: {
        ...baseChain().receipt!,
        logs: [
          transferLog(bnbUSDT, ACCOUNT, ROUTER, 1_250_000_000_000_000_000n),
          transferLog(bnbUSDC, ROUTER, ACCOUNT, 1_249_000_000_000_000_000n),
        ],
      },
      decimals: { [bnbUSDT.toLowerCase()]: 18, [bnbUSDC.toLowerCase()]: 18 },
    };

    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision: bnbDecision,
      swapTxHash: SWAP_TX,
      client: fakeClient(bnbFx),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code} (${result.reason ?? '-'})`);
    expect(result.settlement.data.chainId).toBe(56);
    expect(result.settlement.data.fillStatus).toBe('FULL');
    expect(result.settlement.data.sourceAmountRaw).toBe('1250000000000000000');
    expect(result.settlement.data.destinationAmountRaw).toBe('1249000000000000000');
    expect(result.settlement.reasonCodes).toEqual(['APPROVAL_TX_NOT_PRESENTED']);
  });

  it('accepts a matching presented approval tx and drops the not-presented code', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.approvalTx = {
      hash: APPROVAL_TX,
      blockNumber: '0xf',
      from: ACCOUNT,
      to: WETH,
      value: '0x0',
      input: APPROVAL_DATA,
    };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      approvalTxHash: APPROVAL_TX,
      client: fakeClient(fx),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.settlement.reasonCodes).toEqual([]);
    expect(result.settlement.data.approvalTxHash).toBe(APPROVAL_TX);
  });

  it('rejects a swap transaction whose calldata differs from the guarded bytes', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.swapTx = { ...fx.swapTx!, input: '0xdeadbeef' as Hex };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    expect(result).toMatchObject({ ok: false, code: 'ON_CHAIN_CALL_MISMATCH' });
  });

  it('rejects a swap transaction sent to a different contract', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.swapTx = { ...fx.swapTx!, to: ACCOUNT };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    expect(result).toMatchObject({ ok: false, code: 'ON_CHAIN_CALL_MISMATCH' });
  });

  it('rejects a swap transaction carrying native value', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.swapTx = { ...fx.swapTx!, value: '0x1' };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    expect(result).toMatchObject({ ok: false, code: 'ON_CHAIN_CALL_MISMATCH' });
  });

  it('rejects a presented approval tx that does not match the guarded approval', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.approvalTx = {
      hash: APPROVAL_TX,
      blockNumber: '0xf',
      from: ACCOUNT,
      to: WETH,
      value: '0x0',
      input: '0x095ea7b3ffffffff' as Hex,
    };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      approvalTxHash: APPROVAL_TX,
      client: fakeClient(fx),
    });

    expect(result).toMatchObject({ ok: false, code: 'ON_CHAIN_CALL_MISMATCH' });
  });

  it('reports a missing swap transaction instead of closing', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.swapTx = null;
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    expect(result).toMatchObject({ ok: false, code: 'SWAP_TX_NOT_FOUND' });
  });

  it('refuses to close over an unsigned decision', async () => {
    const unsigned = await createBaseAgentSwapGuardDecision(guard(), {
      ...signerDependencies,
      signer: null,
    });
    expect(unsigned.attestation).toBeNull();
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision: unsigned,
      swapTxHash: SWAP_TX,
      client: fakeClient(baseChain()),
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'DECISION_NOT_VERIFIABLE',
      reason: 'missing_attestation',
    });
  });

  it('signs a reverted swap as a real outcome, not a failure', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.receipt = { ...fx.receipt!, status: '0x0', logs: [] };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.settlement.data.fillStatus).toBe('REVERTED');
    expect(result.settlement.data.sourceAmountRaw).toBe('');
    expect(result.settlement.reasonCodes).toEqual([
      'APPROVAL_TX_NOT_PRESENTED',
      'SWAP_TX_REVERTED',
    ]);
  });

  it('reports realized slippage beyond the guarded policy and the guaranteed minimum', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.receipt = {
      ...fx.receipt!,
      logs: [
        transferLog(WETH, ACCOUNT, ROUTER, 10n ** 18n),
        transferLog(USDC, ROUTER, ACCOUNT, 1_980_000_000n),
      ],
    };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.settlement.data.realizedSlippageBps).toBe('100');
    expect(result.settlement.reasonCodes).toContain('REALIZED_SLIPPAGE_EXCEEDED');
    expect(result.settlement.reasonCodes).toContain('RECEIVED_BELOW_GUARANTEED_MINIMUM');
  });

  it('flags a fill executed after the decision window', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.block = { timestamp: '0x' + (NOW + 120).toString(16) };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.settlement.reasonCodes).toContain('EXECUTED_AFTER_DECISION_WINDOW');
  });

  it('reports a mismatched input amount against the guarded commitment', async () => {
    const decision = await signedDecision();
    const fx = baseChain();
    fx.receipt = {
      ...fx.receipt!,
      logs: [
        transferLog(WETH, ACCOUNT, ROUTER, 2n * 10n ** 18n),
        transferLog(USDC, ROUTER, ACCOUNT, 4_000_000_000n),
      ],
    };
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      client: fakeClient(fx),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.settlement.reasonCodes).toContain('SOURCE_AMOUNT_MISMATCH');
  });

  it('issues an unsigned closure when no attester is configured', async () => {
    const decision = await signedDecision();
    const result = await settleBaseAgentSwapGuard({
      ...baseParams,
      decision,
      swapTxHash: SWAP_TX,
      signer: null,
      client: fakeClient(baseChain()),
    });

    if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
    expect(result.settlement.signature).toBeNull();
    expect(result.settlement.uid).toBeNull();
    expect(result.settlement.attester).toBeNull();
  });

  describe('verifyBaseAgentSwapGuardSettlement', () => {
    it('verifies a genuine signed settlement', async () => {
      const decision = await signedDecision();
      const result = await settleBaseAgentSwapGuard({
        ...baseParams,
        decision,
        swapTxHash: SWAP_TX,
        client: fakeClient(baseChain()),
      });
      if (!result.ok) throw new Error(`expected ok, got ${result.code}`);

      await expect(
        verifyBaseAgentSwapGuardSettlement(result.settlement, {
          trustAttester: baseParams.trustAttester,
        })
      ).resolves.toMatchObject({
        valid: true,
        reason: 'verified',
        decisionHash: result.settlement.data.decisionHash,
        swapTxHash: SWAP_TX,
        attester: account.address.toLowerCase(),
      });
    });

    it('exposes the signed swapTxHash so two closures for one decision are detectably contradictory', async () => {
      const decision = await signedDecision();
      const first = await settleBaseAgentSwapGuard({
        ...baseParams,
        decision,
        swapTxHash: SWAP_TX,
        client: fakeClient(baseChain()),
      });
      if (!first.ok) throw new Error(`expected ok, got ${first.code}`);

      // The service is stateless: the same signed decision can also be closed
      // against a second transaction with byte-identical calldata. Honest
      // usage never produces this, so the verification output must surface
      // the signed binding that makes the contradiction checkable offline.
      const SWAP_TX_B = ('0x' + 'ef'.repeat(32)) as Hex;
      const fixtureB = baseChain();
      fixtureB.swapTx = { ...fixtureB.swapTx!, hash: SWAP_TX_B };
      fixtureB.receipt = {
        ...fixtureB.receipt!,
        transactionHash: SWAP_TX_B,
        logs: fixtureB.receipt!.logs.map((log) => ({ ...log, transactionHash: SWAP_TX_B })),
      };
      const second = await settleBaseAgentSwapGuard({
        ...baseParams,
        decision,
        swapTxHash: SWAP_TX_B,
        client: fakeClient(fixtureB),
      });
      if (!second.ok) throw new Error(`expected ok, got ${second.code}`);

      const trust = { trustAttester: baseParams.trustAttester };
      const v1 = await verifyBaseAgentSwapGuardSettlement(first.settlement, trust);
      const v2 = await verifyBaseAgentSwapGuardSettlement(second.settlement, trust);
      expect(v1).toMatchObject({ valid: true, reason: 'verified', swapTxHash: SWAP_TX });
      expect(v2).toMatchObject({ valid: true, reason: 'verified', swapTxHash: SWAP_TX_B });
      expect(v1.decisionHash).toBe(v2.decisionHash);
      expect(v1.swapTxHash).not.toBe(v2.swapTxHash);
    });

    it('rejects edited reason codes', async () => {
      const decision = await signedDecision();
      const result = await settleBaseAgentSwapGuard({
        ...baseParams,
        decision,
        swapTxHash: SWAP_TX,
        client: fakeClient(baseChain()),
      });
      if (!result.ok) throw new Error(`expected ok, got ${result.code}`);

      const tampered = {
        ...result.settlement,
        reasonCodes: [] as string[],
      };
      await expect(
        verifyBaseAgentSwapGuardSettlement(tampered, {
          trustAttester: baseParams.trustAttester,
        })
      ).resolves.toMatchObject({
        valid: false,
        reason: 'reason_codes_mismatch',
        swapTxHash: SWAP_TX,
      });
    });

    it('rejects an invalid signature', async () => {
      const decision = await signedDecision();
      const result = await settleBaseAgentSwapGuard({
        ...baseParams,
        decision,
        swapTxHash: SWAP_TX,
        client: fakeClient(baseChain()),
      });
      if (!result.ok) throw new Error(`expected ok, got ${result.code}`);

      const sig = result.settlement.signature!;
      // Flip one hex nibble inside the s-part (never the v recovery byte).
      const midChar = sig[10] === 'a' ? 'b' : 'a';
      const tampered = {
        ...result.settlement,
        signature: (sig.slice(0, 10) + midChar + sig.slice(11)) as Hex,
      };
      await expect(
        verifyBaseAgentSwapGuardSettlement(tampered, {
          trustAttester: baseParams.trustAttester,
        })
      ).resolves.toMatchObject({ valid: false });
    });

    it('rejects an untrusted attester', async () => {
      const decision = await signedDecision();
      const result = await settleBaseAgentSwapGuard({
        ...baseParams,
        decision,
        swapTxHash: SWAP_TX,
        client: fakeClient(baseChain()),
      });
      if (!result.ok) throw new Error(`expected ok, got ${result.code}`);

      await expect(
        verifyBaseAgentSwapGuardSettlement(result.settlement, { trustAttester: async () => false })
      ).resolves.toMatchObject({ valid: false, reason: 'untrusted_attester' });
    });
  });
});
