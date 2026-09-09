import assert from 'node:assert/strict';
import test from 'node:test';

import { keccak256 } from 'viem';

import {
  buildInsightPriorSealContextCommitment,
  InsightGuard,
  PriorSealClient,
} from '../dist/index.js';

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
        verdict,
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

test('executeSwap rejects a top-level verdict that disagrees with the signed verdict', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const asset = new URL(url).searchParams.get('asset');
      const result = preTrade(asset);
      if (asset === 'ETH') result.attestation.data.verdict = 'BLOCK';
      return api(result);
    },
  });

  await assert.rejects(
    () =>
      guard.executeSwap({
        source: sourceRequest,
        destination: destinationRequest,
        receipt: { settlementChainId: 1 },
        submitTransaction: async () => {
          submitted = true;
          return { txHash };
        },
      }),
    /verdict does not match its signed attestation/
  );
  assert.equal(submitted, false);
});

test('executeSwap rejects expired signed evidence before broadcast', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const result = preTrade(new URL(url).searchParams.get('asset'));
      result.attestation.data.validUntil = 1757030401;
      return api(result);
    },
  });

  await assert.rejects(
    () =>
      guard.executeSwap({
        source: sourceRequest,
        destination: destinationRequest,
        receipt: { settlementChainId: 1 },
        submitTransaction: async () => {
          submitted = true;
          return { txHash };
        },
      }),
    /signed evidence has expired/
  );
  assert.equal(submitted, false);
});

test('assessment preserves a zero recommended position limit', async () => {
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const asset = new URL(url).searchParams.get('asset');
      const result = preTrade(asset);
      if (asset === 'ETH') result.recommendedMaxPositionUsd = 0;
      return api(result);
    },
  });

  const assessment = await guard.assessSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1 },
  });

  assert.equal(assessment.constraints.recommendedMaxPositionUsd, 0);
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
          verification: { valid: true, code: 'OK' },
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
        type: 'organization',
        id: 'treasury-1',
        account: '0x3333333333333333333333333333333333333333',
      },
      authorizer: {
        type: 'eip1271',
        address: '0x4444444444444444444444444444444444444444',
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
  assert.deepEqual(priorSealRequests[0].body.authorizer, {
    type: 'eip1271',
    address: '0x4444444444444444444444444444444444444444',
  });
  assert.equal(intent.schema, 'priorseal.intent.v2');
  assert.equal(intent.executionProfile, 'priorseal.execution-profile.exact-call.v1');
  assert.equal(intent.action, 'CONTRACT_CALL');
  assert.equal(intent.calldataHash, keccak256('0x1234'));
  assert.equal(intent.amount, '1000000');
  assert.equal(intent.nonce, '7');
  assert.deepEqual(intent.contextCommitments, [
    buildInsightPriorSealContextCommitment({
      sourceAttestation: preTrade('ETH').attestation,
      destinationAttestation: preTrade('USDC').attestation,
      maxSlippageBps: 50,
    }),
  ]);
  assert.deepEqual(insightRequests, [
    '/api/v1/safety/pre-trade',
    '/api/v1/safety/pre-trade',
    '/api/v1/execution/attestation/issue',
  ]);
});

test('non-intervening assessment can be authorized and verified after an external execution', async () => {
  const insightRequests = [];
  const priorSealRequests = [];
  let observedTxHash = txHash;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const parsed = new URL(url);
      insightRequests.push(parsed.pathname);
      if (parsed.pathname.endsWith('/safety/pre-trade')) {
        const asset = parsed.searchParams.get('asset');
        return api(preTrade(asset, asset === 'ETH' ? 'BLOCK' : 'PASS'));
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
              authorizationId: 'auth_advisory',
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
        return new Response(
          JSON.stringify({ authorization: body, acceptance: { status: 'ACCEPTED' } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          observation: { txHash: observedTxHash, status: 'CONFIRMED' },
          receipt: {
            receiptId: 'psr_advisory',
            execution: { txHash: observedTxHash },
            compliance: { status: 'COMPLIANT', reasonCodes: [] },
            binding: { bound: true, reasonCodes: [] },
          },
          verification: { valid: true, code: 'OK', complianceStatus: 'COMPLIANT' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });
  const transaction = {
    chainId: 1,
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    data: '0x1234',
    value: 0n,
    nonce: 7n,
    sourceAmount: 1000000n,
  };

  const assessment = await guard.assessSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1, maxSlippageBps: 50 },
  });
  assert.equal(assessment.recommendation, 'NOT_RECOMMENDED');
  assert.equal(assessment.contextCommitment?.namespace, 'insight.pretrade-pair.v1');

  const authorized = await guard.authorizeAssessedSwap({
    assessment,
    transaction,
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
      signAuthorization: async () => '0xabcdef',
    },
  });

  // Execution is deliberately external to Insight and PriorSeal.
  const result = await guard.verifyAssessedSwapExecution({
    assessment,
    transaction,
    priorSealAuthorization: authorized.priorSealAuthorization,
    txHash,
    priorSeal: { client: priorSeal, confirmations: 12 },
  });

  assert.equal(result.report.evidenceStatus, 'COMPLETE');
  assert.equal(result.report.exactCallMatched, true);
  assert.equal(result.report.priorSealReceiptValid, true);
  assert.equal(result.report.constraintsSatisfied, true);
  assert.equal(result.report.recommendationFollowed, false);
  assert.equal(result.report.conclusion, 'EXECUTED_AGAINST_RECOMMENDATION');
  assert.deepEqual(
    priorSealRequests.map((request) => request.path),
    ['/v1/authorizations/prepare', '/v1/authorizations', '/v1/executions/observe']
  );
  assert.deepEqual(insightRequests, [
    '/api/v1/safety/pre-trade',
    '/api/v1/safety/pre-trade',
    '/api/v1/execution/attestation/issue',
  ]);

  observedTxHash = `0x${'d'.repeat(64)}`;
  const mismatched = await guard.verifyAssessedSwapExecution({
    assessment,
    transaction,
    priorSealAuthorization: authorized.priorSealAuthorization,
    txHash,
    priorSeal: { client: priorSeal, confirmations: 12 },
  });
  assert.equal(mismatched.report.evidenceAvailability, 'COMPLETE');
  assert.equal(mismatched.report.evidenceStatus, 'PARTIAL');
  assert.equal(mismatched.report.transactionCorrelation, false);
  assert.equal(mismatched.report.assuranceValid, false);
  assert.equal(mismatched.report.conclusion, 'EVIDENCE_TRANSACTION_MISMATCH');

  observedTxHash = txHash;
  const danger = preTrade('ETH', 'DANGER');
  const reviewAssessment = {
    ...assessment,
    recommendation: 'REVIEW_REQUIRED',
    reasonCodes: ['SOURCE_DANGER'],
    sourcePreTrade: danger,
    receiptDraft: {
      ...assessment.receiptDraft,
      preTradeAttestations: {
        ...assessment.receiptDraft.preTradeAttestations,
        source: danger.attestation,
      },
    },
  };
  const reviewed = await guard.verifyAssessedSwapExecution({
    assessment: reviewAssessment,
    transaction,
    priorSealAuthorization: authorized.priorSealAuthorization,
    txHash,
    priorSeal: { client: priorSeal, confirmations: 12 },
  });
  assert.equal(reviewed.report.recommendationFollowed, null);
  assert.equal(reviewed.report.conclusion, 'EXECUTED_WITHOUT_REQUIRED_REVIEW_EVIDENCE');
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

test('executeSwapWithPriorSeal rejects an accepted authorization that differs from the signed draft', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => api(preTrade(new URL(url).searchParams.get('asset'))),
  });
  const priorSeal = {
    async prepareAuthorization(input) {
      return {
        authorization: {
          ...input,
          schema: 'priorseal.authorization.v2',
          domain: 'priorseal/authorization/v2',
          authorizationId: 'auth_mutated',
          intent: { ...input.intent, intentHash: `0x${'c'.repeat(64)}` },
          intentHash: `0x${'c'.repeat(64)}`,
          policyHash: `0x${'0'.repeat(64)}`,
        },
        typedData: { primaryType: 'PriorSealAuthorization' },
      };
    },
    async acceptAuthorization(authorization) {
      return {
        authorization: {
          ...authorization,
          delegate: {
            ...authorization.delegate,
            executor: '0x5555555555555555555555555555555555555555',
          },
        },
        acceptance: { status: 'ACCEPTED' },
      };
    },
    async observeExecution() {
      throw new Error('must not observe an unsubmitted transaction');
    },
  };

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
    /differs from the authorization presented for signing/
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

test('InsightClient bounds requests with a defaultable timeout', async () => {
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    timeoutMs: 5,
    fetch: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      }),
  });

  await assert.rejects(
    () => guard.client.preTrade(sourceRequest),
    (error) => error.options?.code === 'REQUEST_TIMEOUT' && error.options?.retryable === true
  );
});

test('PriorSealClient resumes a durable observation job until final evidence is available', async () => {
  let polls = 0;
  const priorSeal = new PriorSealClient({
    baseUrl: 'https://priorseal.test',
    fetch: async (url) => {
      const path = new URL(url).pathname;
      if (path === '/v1/executions/observe') {
        return new Response(
          JSON.stringify({
            observation: { txHash, status: 'PENDING' },
            receipt: null,
            observationJob: { jobId: 'job_joint', state: 'QUEUED', attempts: 0 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      assert.equal(path, '/v1/observation-jobs/job_joint');
      polls += 1;
      return new Response(
        JSON.stringify(
          polls === 1
            ? {
                jobId: 'job_joint',
                state: 'RETRY_WAIT',
                attempts: 1,
                observation: { txHash, status: 'PENDING' },
              }
            : {
                jobId: 'job_joint',
                state: 'COMPLETED',
                attempts: 2,
                observation: { txHash, status: 'CONFIRMED' },
                result: {
                  observation: { txHash, status: 'CONFIRMED' },
                  receipt: { receiptId: 'psr_resumed', execution: { txHash } },
                },
              }
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  const result = await priorSeal.observeExecutionUntilFinal(
    { authorizationId: 'auth_joint', chainId: 1, txHash },
    { pollIntervalMs: 10, timeoutMs: 100 }
  );

  assert.equal(result.receipt?.receiptId, 'psr_resumed');
  assert.equal(result.observationJob?.state, 'COMPLETED');
  assert.equal(polls, 2);
});
