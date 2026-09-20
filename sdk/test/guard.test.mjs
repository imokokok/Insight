import assert from 'node:assert/strict';
import test from 'node:test';

import { keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  buildInsightPriorSealContextCommitment,
  InsightGuard,
  PriorSealClient,
  buildCoverageReport,
  coveragePolicyId,
  coverageReportDigest,
  coverageSigningData,
  STRICT_COVERAGE_POLICY,
} from '../dist/index.js';

for (const scenario of [
  'pass',
  'insufficient',
  'expired-during-sign',
  'removed-binding',
  'scope-mismatch',
]) {
  test(`opt-in joint coverage guard: ${scenario}`, async () => {
    const signer = privateKeyToAccount(`0x${'12'.repeat(32)}`);
    const originalClock = Date.now;
    let now = 1800000000,
      submitted = 0,
      signed = 0;
    Date.now = () => now * 1000;
    try {
      const policy = STRICT_COVERAGE_POLICY;
      const pin = (asset) => ({
        asset,
        evidenceChainId: 1,
        policy,
        policyId: coveragePolicyId(policy),
        keys: [
          { address: signer.address, validFrom: now - 100, validUntil: now + 1000, revoked: false },
        ],
      });
      const guard = new InsightGuard({
        apiKey: 'test',
        coverage: {
          source: pin('ETH'),
          destination: pin(scenario === 'scope-mismatch' ? 'BTC' : 'USDC'),
        },
        fetch: async (url) => {
          const parsed = new URL(url),
            asset = parsed.searchParams.get('asset');
          if (parsed.pathname.endsWith('/pre-trade')) return api(preTrade(asset));
          if (parsed.pathname.endsWith('/coverage/assessment')) {
            const report = buildCoverageReport(
              {
                asset,
                evidenceChainId: 1,
                evaluatedAt: now,
                observations: (scenario === 'insufficient' && asset === 'USDC'
                  ? ['chainlink', 'api3']
                  : ['chainlink', 'api3', 'twap']
                ).map((provider) => ({
                  provider,
                  evidenceChainId: 1,
                  price: 1,
                  status: 'success',
                  observedAt: now - 10,
                  retrievedAt: now,
                  timestampProvenance: 'provider_timestamp',
                  excluded: false,
                })),
              },
              policy
            );
            return api({
              report,
              digest: coverageReportDigest(report),
              signer: signer.address,
              signature: await signer.signTypedData(coverageSigningData(report)),
            });
          }
          throw new Error('Simulated receipt outage after broadcast');
        },
      });
      const priorSeal = {
        async prepareAuthorization(body) {
          const authorization = {
            ...body,
            schema: 'priorseal.authorization.v2',
            domain: 'priorseal/authorization/v2',
            authorizationId: 'coverage',
            intentHash: hash,
            policyHash: hash,
          };
          if (scenario === 'removed-binding')
            authorization.intent.contextCommitments =
              authorization.intent.contextCommitments.filter(
                (c) => !c.namespace.startsWith('insight.coverage.')
              );
          return { authorization, typedData: {} };
        },
        async acceptAuthorization(authorization) {
          return { authorization, acceptance: { status: 'ACCEPTED' } };
        },
        async observeExecution() {
          throw new Error('Simulated evidence outage');
        },
      };
      const run = () =>
        guard.executeSwapWithPriorSeal({
          source: sourceRequest,
          destination: destinationRequest,
          receipt: { settlementChainId: 1, maxSlippageBps: 50 },
          prepareTransaction: async () => ({
            chainId: 1,
            from: signer.address,
            to: `0x${'22'.repeat(20)}`,
            data: '0x1234',
            nonce: 1n,
            sourceAmount: 1n,
          }),
          priorSeal: {
            client: priorSeal,
            principal: { type: 'user', id: 'test', account: signer.address },
            agentId: 'test',
            authorizationNonce: `0x${'99'.repeat(32)}`,
            signAuthorization: async () => {
              signed++;
              if (scenario === 'expired-during-sign') now += 60;
              return '0xabcd';
            },
          },
          submitTransaction: async ({ priorSealAuthorization }) => {
            submitted++;
            const intent = priorSealAuthorization.authorization.intent;
            assert.equal(intent.contextCommitments.length, 3);
            assert.equal(intent.validUntil, 1800000060);
            return { txHash };
          },
        });
      if (scenario === 'pass') {
        const result = await run();
        assert.equal(submitted, 1);
        assert.equal(result.status, 'executed');
        assert.equal(result.coverageReports.length, 2);
        assert.deepEqual(result.checkpoint.coverageReports, result.coverageReports);
      } else {
        await assert.rejects(run);
        assert.equal(submitted, 0);
        if (scenario !== 'expired-during-sign') assert.equal(signed, 0);
      }
    } finally {
      Date.now = originalClock;
    }
  });
}

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
      signature: '0xabcd',
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

test('executeSwap blocks expired signed evidence before broadcast', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const result = preTrade(new URL(url).searchParams.get('asset'));
      result.attestation.data.validUntil = 1757030401;
      return api(result);
    },
  });

  const decision = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1 },
    submitTransaction: async () => {
      submitted = true;
      return { txHash };
    },
  });
  assert.equal(decision.status, 'blocked');
  assert.equal(decision.stage, 'source_pre_trade');
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

test('assessSwap makes only two C3 calls and does not issue a C4 receipt', async () => {
  const requests = [];
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const parsed = new URL(url);
      requests.push(parsed.pathname);
      assert.equal(parsed.pathname, '/api/v1/safety/pre-trade');
      return api(preTrade(parsed.searchParams.get('asset')));
    },
  });

  const assessment = await guard.assessSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1, maxSlippageBps: 50 },
  });

  assert.deepEqual(requests, ['/api/v1/safety/pre-trade', '/api/v1/safety/pre-trade']);
  assert.equal(assessment.recommendation, 'RECOMMENDED');
  assert.ok(assessment.receiptDraft);
  assert.ok(assessment.contextCommitment);
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

test('check fails closed when the API returns an unknown verdict', async () => {
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async () => api({ ...preTrade('ETH'), verdict: 'NEW_UNKNOWN_VERDICT' }),
  });

  await assert.rejects(
    () => guard.check(sourceRequest),
    (error) => error.options?.code === 'INVALID_API_RESPONSE'
  );
});

test('executeSwap reports receipt recovery without rejecting after broadcast', async () => {
  let submissions = 0;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/safety/pre-trade')) {
        return api(preTrade(parsed.searchParams.get('asset')));
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'RECEIPT_UNAVAILABLE', message: 'signer unavailable', retryable: true },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  const result = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1 },
    submitTransaction: async () => {
      submissions += 1;
      return { txHash };
    },
  });

  assert.equal(submissions, 1);
  assert.equal(result.status, 'executed_receipt_pending');
  assert.equal(result.transaction.txHash, txHash);
  assert.equal(result.receiptRequest.txHash, txHash);
  assert.equal(result.evidenceError.code, 'RECEIPT_UNAVAILABLE');
});

test('watch stop wakes a pending polling delay and settles done', async () => {
  let firstSignal;
  const signalled = new Promise((resolve) => {
    firstSignal = resolve;
  });
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async () =>
      api({
        symbol: 'ETH',
        chain: 'ethereum',
        verdict: 'normal',
        recommendation: 'proceed',
        reason: 'healthy',
        reasonCodes: [],
        evaluatedAt: '2026-09-05T00:00:00.000Z',
      }),
  });
  const handle = guard.watch(
    { symbol: 'ETH', chain: 'ethereum' },
    { intervalMs: 10_000, allowFasterPolling: true, onSignal: () => firstSignal() }
  );

  await signalled;
  handle.stop();
  const outcome = await Promise.race([
    handle.done.then(() => 'settled'),
    new Promise((resolve) => setTimeout(() => resolve('pending'), 100)),
  ]);

  assert.equal(outcome, 'settled');
});

test('watch stop aborts an in-flight poll and settles done', async () => {
  let polling;
  const pollStarted = new Promise((resolve) => {
    polling = resolve;
  });
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (_url, init) => {
      polling();
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      });
    },
  });
  const handle = guard.watch({ symbol: 'ETH' }, { intervalMs: 10_000, allowFasterPolling: true });

  await pollStarted;
  handle.stop();

  await handle.done;
});

test('watch rejects zero, negative, non-integer and non-finite intervals', () => {
  const guard = new InsightGuard({ apiKey: 'ins_test', fetch: async () => api({}) });
  for (const intervalMs of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => guard.watch({ symbol: 'ETH' }, { intervalMs, allowFasterPolling: true }),
      /positive integer/
    );
  }
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
      issuedAt: Math.floor(Date.now() / 1000),
      validUntil: Math.floor(Date.now() / 1000) + 600,
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
  assert.deepEqual(insightRequests, ['/api/v1/safety/pre-trade', '/api/v1/safety/pre-trade']);
  assert.deepEqual(priorSealRequests, []);

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
      issuedAt: Math.floor(Date.now() / 1000),
      validUntil: Math.floor(Date.now() / 1000) + 600,
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
          issuedAt: Math.floor(Date.now() / 1000),
          validUntil: Math.floor(Date.now() / 1000) + 600,
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
          issuedAt: Math.floor(Date.now() / 1000),
          validUntil: Math.floor(Date.now() / 1000) + 600,
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

test('SDK clients normalize trailing base URL slashes before joining request paths', async () => {
  let insightRequestUrl;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    baseUrl: 'https://insight.test////',
    fetch: async (url) => {
      insightRequestUrl = String(url);
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

  await guard.client.oracleWatch({ symbol: 'ETH', chain: 'ethereum' });
  assert.match(insightRequestUrl, /^https:\/\/insight\.test\/api\/v1\/oracle-watch\?/);

  let priorSealRequestUrl;
  const priorSeal = new PriorSealClient({
    baseUrl: 'https://priorseal.test////',
    fetch: async (url) => {
      priorSealRequestUrl = String(url);
      return new Response(JSON.stringify({ jobId: 'job_1', state: 'QUEUED', attempts: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  await priorSeal.getObservationJob('job_1');
  assert.equal(priorSealRequestUrl, 'https://priorseal.test/v1/observation-jobs/job_1');
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
