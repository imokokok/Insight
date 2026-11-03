import assert from 'node:assert/strict';
import test from 'node:test';

import { encodeFunctionData, keccak256, toBytes } from 'viem';

import {
  createPriorSealDefiSubmitter,
  InsightGuard,
  PriorSealGatewayExecutionError,
  PRIORSEAL_SWAP_APPROVAL_NAMESPACE,
  V3_SINGLE_SWAP_ABI,
  type PriorSealDefiExecutionGateway,
} from '../src/index';

import type { DecisionInputTrust } from '../src/types.ts';

const authorizationId = 'auth_1234567890abcdef1234567890abcdef';
const sender = '0x1111111111111111111111111111111111111111';
const router = '0x2222222222222222222222222222222222222222';
const routerCodeHash = `0x${'a'.repeat(64)}` as const;
const txHash = `0x${'b'.repeat(64)}`;
const approval = {
  schema: 'priorseal.swap-approval.v1',
  chainId: 8453,
  sender,
  router,
  routerCodeHash,
  inputToken: '0x3333333333333333333333333333333333333333',
  outputToken: '0x4444444444444444444444444444444444444444',
  maxInputAmount: '10',
  minOutputAmount: '1',
  recipient: '0x5555555555555555555555555555555555555555',
  fee: 3000,
  deadline: 2_000_000_000,
};
const acceptanceKey = {
  issuer: 'priorseal-test',
  keyId: 'acceptance-key-1',
  algorithm: 'Ed25519',
  publicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
  status: 'active',
  validFrom: null,
  validUntil: null,
} as const;
const decisionInputTrust: DecisionInputTrust = {
  keyRegistry: {
    public_keys: [
      {
        key_id: 'local-test-key',
        public_key: '0x1111111111111111111111111111111111111111',
        revoked: false,
        role: 'attester',
        validFrom: new Date(0).toISOString(),
        validUntil: null,
      },
    ],
  },
  policy: {
    policyId: 'local-test',
    version: '1',
    assetIds: {
      AAA: 'eip155:8453/erc20:0x3333333333333333333333333333333333333333',
      BBB: 'eip155:8453/erc20:0x4444444444444444444444444444444444444444',
    },
    maxReferenceDeviationBps: 100,
    maxSlippageBps: 100,
    maxQuoteAgeSeconds: 90,
  },
};
const authorization = {
  authorizationId,
  audience: 'priorseal/production',
  intent: { schema: 'priorseal.intent.v2' },
};
const call = {
  transaction: {
    chainId: 8453,
    from: sender,
    to: router,
    data: encodeFunctionData({
      abi: V3_SINGLE_SWAP_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: approval.inputToken as `0x${string}`,
          tokenOut: approval.outputToken as `0x${string}`,
          fee: approval.fee,
          recipient: approval.recipient as `0x${string}`,
          deadline: BigInt(approval.deadline),
          amountIn: 10n,
          amountOutMinimum: 1n,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }),
    nonce: 7n,
    value: 0n,
    sourceAmount: 10n,
  },
  priorSealAuthorization: { authorization },
} as unknown as Parameters<ReturnType<typeof createPriorSealDefiSubmitter>>[0];

function gateway(
  execute: PriorSealDefiExecutionGateway['execute'],
  status: PriorSealDefiExecutionGateway['status'] = async () => null
): PriorSealDefiExecutionGateway {
  return { execute, status };
}

function attempt(
  transaction: Parameters<PriorSealDefiExecutionGateway['execute']>[0]['transaction']
) {
  return { authorizationId, status: 'SUBMITTED', transaction, txHash };
}

test('submits the exact authorized call through PriorSeal and returns its transaction hash', async () => {
  let received: Parameters<PriorSealDefiExecutionGateway['execute']>[0] | undefined;
  const submit = createPriorSealDefiSubmitter({
    gateway: gateway(async (input) => {
      received = input;
      return { replay: false, attempt: attempt(input.transaction) };
    }),
    approval,
    routerAddress: router,
    routerCodeHash,
    acceptanceKey,
  });

  const result = await submit(call);

  assert.deepEqual(result, { txHash, taker: sender });
  assert.equal(received?.authorizationId, authorizationId);
  assert.equal(received?.audience, authorization.audience);
  assert.equal(received?.intent, authorization.intent);
  assert.equal(received?.adapter.kind, 'uniswap-v3-single');
  assert.deepEqual(received?.adapter.approval, approval);
  assert.ok(Object.isFrozen(submit));
  assert.ok(Object.isFrozen(submit.authorizationContextCommitments));
  assert.deepEqual(submit.authorizationContextCommitments, [
    {
      namespace: PRIORSEAL_SWAP_APPROVAL_NAMESPACE,
      algorithm: 'keccak256',
      digest: keccak256(toBytes(JSON.stringify(approval))),
    },
  ]);
  assert.doesNotThrow(() => submit.assertAuthorizationTransaction?.(call.transaction));
  assert.throws(
    () =>
      submit.assertAuthorizationTransaction?.({
        ...call.transaction,
        from: '0x6666666666666666666666666666666666666666',
      }),
    /does not satisfy the committed PriorSeal swap approval/
  );
  assert.deepEqual(received?.transaction, {
    chainId: 8453,
    from: sender,
    to: router,
    data: call.transaction.data,
    nonce: '7',
    value: '0',
  });
});

test('recovers an uncertain gateway response by authorization ID without resubmitting', async () => {
  const lookups: string[] = [];
  const submit = createPriorSealDefiSubmitter({
    gateway: gateway(
      async () => {
        throw new Error('broadcast response lost');
      },
      async (id) => {
        lookups.push(id);
        return attempt({
          chainId: 8453,
          from: sender,
          to: router,
          data: call.transaction.data,
          nonce: '7',
          value: '0',
        });
      }
    ),
    approval,
    routerAddress: router,
    routerCodeHash,
    acceptanceKey,
  });

  assert.deepEqual(await submit(call), { txHash, taker: sender });
  assert.deepEqual(lookups, [authorizationId]);
});

test('keeps an unresolved authorization identifiable when both execution and status lookup fail', async () => {
  const submit = createPriorSealDefiSubmitter({
    gateway: gateway(
      async () => {
        throw new Error('submit unavailable');
      },
      async () => {
        throw new Error('status unavailable');
      }
    ),
    approval,
    routerAddress: router,
    routerCodeHash,
    acceptanceKey,
  });

  await assert.rejects(
    submit(call),
    (error: unknown) =>
      error instanceof PriorSealGatewayExecutionError &&
      error.authorizationId === authorizationId &&
      error.attemptStatus === null
  );
});

test('rejects Insight and PriorSeal router profile mismatches before execution', () => {
  assert.throws(
    () =>
      createPriorSealDefiSubmitter({
        gateway: gateway(async () => {
          throw new Error('must not execute');
        }),
        approval,
        routerAddress: sender,
        routerCodeHash,
        acceptanceKey,
      }),
    /same reviewed router address and code hash/
  );
});

test('strict V3 joint entry refuses a submitter that cannot bind the gateway swap approval', async () => {
  const guard = new InsightGuard({ apiKey: 'test-key', decisionInputTrust });
  await assert.rejects(
    () =>
      guard.executeTrustedV3SwapWithPriorSeal({
        source: {
          asset: 'AAA',
          chainId: 8453,
          action: 'swap',
          tradeAmountUsd: 1,
          decisionInput: {},
        },
        destination: {
          asset: 'BBB',
          chainId: 8453,
          action: 'swap',
          tradeAmountUsd: 1,
          decisionInput: {},
        },
        submitTransaction: async () => ({ txHash, taker: sender }),
      } as never),
    /requires a submitter that binds and checks its swap approval/
  );
});
