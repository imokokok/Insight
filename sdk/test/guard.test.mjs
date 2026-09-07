import assert from 'node:assert/strict';
import test from 'node:test';

import { keccak256 } from 'viem';

import { InsightGuard, PriorSealClient } from '../dist/index.js';

const sourceId = 'eip155:1/erc20:0x0000000000000000000000000000000000000001';
const destinationId = 'eip155:1/erc20:0x0000000000000000000000000000000000000002';
const hash = `0x${'a'.repeat(64)}`;
const txHash = `0x${'b'.repeat(64)}`;

function api(data, status = 200) {
  return new Response(JSON.stringify({ success: status < 300, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function preTrade(asset, verdict = 'PASS') {
  const source = asset === 'ETH';
  return {
    verdict,
    consensusPrice: source ? 2500 : 1,
    maxDeviationPct: 0.1,
    crossProviderAgreement: 0.99,
    recommendedMaxPositionUsd: 100000,
    participantCount: 3,
    warnings: [],
    contributingFactors: [],
    evaluatedAt: '2026-09-05T00:00:00.000Z',
    attestation: {
      uid: `0x${(source ? '1' : '2').repeat(64)}`,
      schemaVersion: 3,
      attester: '0x0000000000000000000000000000000000000003',
      signedAt: '2026-09-05T00:00:00.000Z',
      data: {
        sourceAssetId: source ? sourceId : destinationId,
        destinationAssetId: source ? destinationId : sourceId,
        subjectChainId: 1,
        action: 'swap',
        tradeAmountUsd: 1000000000,
        participantCount: 3,
        sourceGroupCount: 2,
        requestHash: hash,
        consensusPrice: source ? 250000000000 : 100000000,
        checkedAt: 1757030400,
        validUntil: 2000000000,
      },
    },
  };
}

const sourceRequest = {
  asset: 'ETH',
  destinationAsset: 'USDC',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 1000,
};
const destinationRequest = {
  asset: 'USDC',
  destinationAsset: 'ETH',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 1000,
};

test('executeSwap never submits a trade when the source pre-trade gate blocks', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async () => api(preTrade('ETH', 'BLOCK')),
  });

  const result = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1 },
    submitTransaction: async () => {
      submitted = true;
      return { txHash };
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.stage, 'source_pre_trade');
  assert.equal(submitted, false);
});

test('executeSwap submits only after two gates and issues a verified receipt', async () => {
  const requests = [];
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url, init) => {
      const parsed = new URL(url);
      requests.push({ path: parsed.pathname, body: init?.body });
      if (parsed.pathname.endsWith('/safety/pre-trade')) {
        return api(preTrade(parsed.searchParams.get('asset')));
      }
      assert.equal(parsed.pathname, '/api/v1/execution/attestation/issue');
      return api({
        attestation: { uid: `0x${'3'.repeat(64)}`, schemaVersion: 4, attester: '0x4', data: {} },
        executionStatus: 'FAITHFUL',
        bindingMode: 'VERIFIED',
        binding: {},
      });
    },
  });

  const result = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1, maxSlippageBps: 50 },
    submitTransaction: async () => ({ txHash }),
  });

  assert.equal(result.status, 'executed');
  assert.equal(result.receipt.bindingMode, 'VERIFIED');
  assert.deepEqual(
    requests.map((request) => request.path),
    ['/api/v1/safety/pre-trade', '/api/v1/safety/pre-trade', '/api/v1/execution/attestation/issue']
  );
  const receiptPayload = JSON.parse(requests[2].body);
  assert.equal(receiptPayload.txHash, txHash);
  assert.equal(receiptPayload.preTradeSignedAt, 1757030400);
  assert.equal(receiptPayload.preTradeAttestations.source.uid, preTrade('ETH').attestation.uid);
  assert.equal(
    receiptPayload.preTradeAttestations.destination.uid,
    preTrade('USDC').attestation.uid
  );
});

test('executeSwapWithPriorSeal authorizes exact calldata before submission and returns both receipts', async () => {
  const insightRequests = [];
  const priorSealRequests = [];
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const parsed = new URL(url);
      insightRequests.push(parsed.pathname);
      if (parsed.pathname.endsWith('/safety/pre-trade')) {
        return api(preTrade(parsed.searchParams.get('asset')));
      }
      return api({
        attestation: {
          uid: `0x${'3'.repeat(64)}`,
          schemaVersion: 4,
          attester: '0x4',
          data: { txHash },
        },
        executionStatus: 'FAITHFUL',
        bindingMode: 'VERIFIED',
        binding: {},
      });
    },
  });
  const priorSeal = new PriorSealClient({
    baseUrl: 'https://priorseal.test',
    fetch: async (url, init) => {
      const path = new URL(url).pathname;
      const body = JSON.parse(init.body);
      priorSealRequests.push({ path, body });
      if (path === '/v1/authorizations/prepare') {
        return new Response(
          JSON.stringify({
            authorization: {
              ...body,
              schema: 'priorseal.authorization.v2',
              domain: 'priorseal/authorization/v2',
              authorizationId: 'auth_joint',
              intent: { ...body.intent, intentHash: `0x${'c'.repeat(64)}` },
              intentHash: `0x${'c'.repeat(64)}`,
              policyHash: `0x${'0'.repeat(64)}`,
            },
            typedData: { primaryType: 'PriorSealAuthorization' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (path === '/v1/authorizations') {
        assert.equal(body.signature, '0xabcdef');
        return new Response(
          JSON.stringify({ authorization: body, acceptance: { status: 'ACCEPTED' } }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      assert.equal(path, '/v1/executions/observe');
      assert.equal(body.txHash, txHash);
      return new Response(
        JSON.stringify({
          observation: { txHash, status: 'CONFIRMED' },
          receipt: { receiptId: 'psr_joint', execution: { txHash } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  const result = await guard.executeSwapWithPriorSeal({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1, maxSlippageBps: 50 },
    priorSeal: {
      client: priorSeal,
      principal: {
        type: 'user',
        id: 'user-1',
        account: '0x3333333333333333333333333333333333333333',
      },
      agentId: 'insight:swap-agent',
      issuedAt: 1900000000,
      validUntil: 1900000600,
      authorizationNonce: `0x${'9'.repeat(64)}`,
      confirmations: 12,
      signAuthorization: async ({ typedData }) => {
        assert.equal(typedData.primaryType, 'PriorSealAuthorization');
        return '0xabcdef';
      },
    },
    prepareTransaction: async () => ({
      chainId: 1,
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      data: '0x1234',
      value: 0n,
      nonce: 7n,
      sourceAmount: 1000000n,
    }),
    submitTransaction: async ({ priorSealAuthorization }) => {
      submitted = true;
      assert.equal(priorSealAuthorization.authorization.authorizationId, 'auth_joint');
      return { txHash, taker: '0x1111111111111111111111111111111111111111' };
    },
  });

  assert.equal(submitted, true);
  assert.equal(result.status, 'executed');
  if (result.status !== 'executed') return;
  assert.equal(result.evidenceStatus, 'COMPLETE');
  assert.equal(result.insightReceipt?.executionStatus, 'FAITHFUL');
  assert.equal(result.priorSealEvidence?.receipt?.receiptId, 'psr_joint');
  assert.deepEqual(
    priorSealRequests.map((request) => request.path),
    ['/v1/authorizations/prepare', '/v1/authorizations', '/v1/executions/observe']
  );
  const intent = priorSealRequests[0].body.intent;
  assert.equal(intent.schema, 'priorseal.intent.v2');
  assert.equal(intent.executionProfile, 'priorseal.execution-profile.exact-call.v1');
  assert.equal(intent.action, 'CONTRACT_CALL');
  assert.equal(intent.calldataHash, keccak256('0x1234'));
  assert.equal(intent.amount, '1000000');
  assert.equal(intent.nonce, '7');
  assert.deepEqual(insightRequests, [
    '/api/v1/safety/pre-trade',
    '/api/v1/safety/pre-trade',
    '/api/v1/execution/attestation/issue',
  ]);
});

test('executeSwapWithPriorSeal does not broadcast when exact-call authorization fails', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => api(preTrade(new URL(url).searchParams.get('asset'))),
  });
  const priorSeal = new PriorSealClient({
    baseUrl: 'https://priorseal.test',
    fetch: async () =>
      new Response(JSON.stringify({ error: { code: 'POLICY_REJECTED', message: 'not allowed' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
  });

  await assert.rejects(
    () =>
      guard.executeSwapWithPriorSeal({
        source: sourceRequest,
        destination: destinationRequest,
        receipt: { settlementChainId: 1 },
        priorSeal: {
          client: priorSeal,
          principal: {
            type: 'user',
            id: 'user-1',
            account: '0x3333333333333333333333333333333333333333',
          },
          agentId: 'insight:swap-agent',
          issuedAt: 1900000000,
          validUntil: 1900000600,
          authorizationNonce: `0x${'9'.repeat(64)}`,
          signAuthorization: async () => '0xabcdef',
        },
        prepareTransaction: async () => ({
          chainId: 1,
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          data: '0x1234',
          nonce: 7,
          sourceAmount: 1000000,
        }),
        submitTransaction: async () => {
          submitted = true;
          return { txHash };
        },
      }),
    (error) => error.options?.code === 'POLICY_REJECTED'
  );
  assert.equal(submitted, false);
});

test('executeSwap cannot be configured to submit a BLOCK verdict', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    policy: { blockedPreTradeVerdicts: [] },
    fetch: async () => api(preTrade('ETH', 'BLOCK')),
  });
  const result = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1 },
    submitTransaction: async () => {
      submitted = true;
      return { txHash };
    },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(submitted, false);
});

test('oracleWatch sends the attestation flag in the API query', async () => {
  let requestUrl;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      requestUrl = new URL(url);
      return api({
        symbol: 'ETH',
        chain: 'ethereum',
        verdict: 'normal',
        recommendation: 'proceed',
        reason: 'healthy',
        reasonCodes: [],
        evaluatedAt: '2026-09-05T00:00:00.000Z',
      });
    },
  });

  const result = await guard.client.oracleWatch({ symbol: 'ETH', chain: 'ethereum' });

  assert.equal(result.recommendation, 'proceed');
  assert.equal(requestUrl.pathname, '/api/v1/oracle-watch');
  assert.equal(requestUrl.searchParams.get('attest'), 'true');
});
