import assert from 'node:assert/strict';
import test from 'node:test';

import { encodeAbiParameters, keccak256 } from 'viem';

import {
  InsightClient,
  InsightGuard,
  PriorSealClient,
  diagnosePreTrade,
  evaluateFreshness,
  estimateWorkflowBudget,
  exportReviewAttachments,
} from '../dist/index.js';

const hash = `0x${'a'.repeat(64)}`;
const txHash = `0x${'b'.repeat(64)}`;
const sourceId = 'eip155:1/erc20:0x0000000000000000000000000000000000000001';
const destinationId = 'eip155:1/erc20:0x0000000000000000000000000000000000000002';
const now = () => Math.floor(Date.now() / 1000);
const request = {
  source: {
    asset: 'ETH',
    destinationAsset: 'USDC',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
  },
  destination: {
    asset: 'USDC',
    destinationAsset: 'ETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
  },
  receipt: { settlementChainId: 1 },
};
const transaction = {
  chainId: 1,
  from: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  data: '0x1234',
  value: 0n,
  nonce: 7n,
  sourceAmount: 1000000n,
};
function result(asset, overrides = {}) {
  const source = asset === 'ETH';
  return {
    verdict: 'PASS',
    consensusPrice: source ? 2500 : 1,
    maxDeviationPct: 0.1,
    crossProviderAgreement: 0.99,
    recommendedMaxPositionUsd: 100000,
    participantCount: 3,
    warnings: [],
    contributingFactors: [],
    evaluatedAt: new Date().toISOString(),
    attestation: {
      uid: `0x${(source ? '1' : '2').repeat(64)}`,
      schemaVersion: 3,
      attester: '0x0000000000000000000000000000000000000003',
      signature: '0xabcd',
      data: {
        verdict: 'PASS',
        sourceAssetId: source ? sourceId : destinationId,
        destinationAssetId: source ? destinationId : sourceId,
        subjectChainId: 1,
        action: 'swap',
        tradeAmountUsd: 1000000000,
        participantCount: 3,
        sourceGroupCount: 2,
        requestHash: hash,
        consensusPrice: source ? 250000000000 : 100000000,
        checkedAt: now(),
        validUntil: now() + 600,
        maxDataAgeSeconds: 20,
        ...overrides,
      },
    },
  };
}
const api = (data, headers = {}) =>
  new Response(JSON.stringify({ success: true, data, meta: { requestId: 'req-1' } }), {
    headers: { 'content-type': 'application/json', ...headers },
  });
const receipt = () => ({
  attestation: { schemaVersion: 4, uid: hash, data: { txHash } },
  executionStatus: 'FAITHFUL',
  bindingMode: 'VERIFIED',
  binding: {},
});
const psEvidence = () => ({
  observation: { status: 'CONFIRMED', txHash },
  receipt: { receiptId: 'r1', execution: { txHash }, compliance: { status: 'COMPLIANT' } },
  verification: { valid: true, code: 'OK' },
});
function psClient(hooks = {}) {
  return {
    prepareAuthorization: async (input) => {
      await hooks.prepare?.();
      return {
        authorization: {
          ...input,
          schema: 'priorseal.authorization.v2',
          domain: 'priorseal/authorization/v2',
          authorizationId: 'auth-1',
          intentHash: hash,
          policyHash: hash,
        },
        typedData: {},
      };
    },
    acceptAuthorization: async (authorization) => {
      await hooks.accept?.();
      return { authorization, acceptance: { status: 'ACCEPTED' } };
    },
    observeExecution: hooks.observe ?? (async () => psEvidence()),
    getObservationJob: hooks.getJob,
  };
}
function psOptions(client, sign = async () => '0xabcd') {
  return {
    client,
    principal: { type: 'user', id: 'u1', account: transaction.from },
    agentId: 'a1',
    authorizationNonce: hash,
    signAuthorization: sign,
  };
}
function guard(fetcher, other = {}) {
  return new InsightGuard({
    apiKey: 'test',
    fetch: fetcher ?? (async (url) => api(result(new URL(url).searchParams.get('asset')))),
    ...other,
  });
}

// These fixtures advance a controlled clock without network or wallet execution.
for (const phase of ['prepare', 'sign', 'accept']) {
  test(`joint submit is never called if destination expires during ${phase}`, async (t) => {
    let time = 1_800_000_000_000;
    t.mock.method(Date, 'now', () => time);
    const initial = now();
    const g = guard(async (url) =>
      api(
        result(new URL(url).searchParams.get('asset'), {
          validUntil: initial + (new URL(url).searchParams.get('asset') === 'ETH' ? 600 : 20),
        })
      )
    );
    let submitted = 0;
    const advance = () => {
      time += 21_000;
    };
    const client = psClient({ ...(phase !== 'sign' ? { [phase]: advance } : {}) });
    await assert.rejects(
      () =>
        g.executeSwapWithPriorSeal({
          ...request,
          prepareTransaction: async () => transaction,
          priorSeal: psOptions(client, async () => {
            if (phase === 'sign') advance();
            return '0xabcd';
          }),
          submitTransaction: async () => {
            submitted++;
            return { txHash };
          },
        }),
      /expired|valid|complete signed evidence/
    );
    assert.equal(submitted, 0);
  });
}

test('authorization uses destination deadline when it is earlier', async () => {
  const initial = now();
  let prepared;
  const g = guard(async (url) =>
    api(
      result(new URL(url).searchParams.get('asset'), {
        validUntil: initial + (new URL(url).searchParams.get('asset') === 'ETH' ? 600 : 100),
      })
    )
  );
  const client = psClient();
  const prepare = client.prepareAuthorization;
  client.prepareAuthorization = (input) => {
    prepared = input;
    return prepare(input);
  };
  await g.executeSwapWithPriorSeal({
    ...request,
    prepareTransaction: async () => transaction,
    priorSeal: psOptions(client),
    submitTransaction: async () => ({ txHash }),
  });
  assert.equal(prepared.expiresAt, initial + 100);
});

test('freshness uses signed source age plus elapsed time and fails on unknown age', () => {
  const data = result('ETH', { checkedAt: 1000, validUntil: 2000, maxDataAgeSeconds: 290 });
  assert.deepEqual(evaluateFreshness(data, { maxSourceAgeSeconds: 300 }, 1020).reasons, [
    'SOURCE_TOO_OLD',
  ]);
  delete data.attestation.data.maxDataAgeSeconds;
  assert.deepEqual(evaluateFreshness(data, { maxSourceAgeSeconds: 300 }, 1020).reasons, [
    'SOURCE_AGE_UNKNOWN',
  ]);
  assert.throws(() => evaluateFreshness(data, { maxSourceAgeSeconds: -1 }), /non-negative/);
});

test('fresh signature cannot hide old source data from assessment or execution', async () => {
  const g = guard(
    async (url) => api(result(new URL(url).searchParams.get('asset'), { maxDataAgeSeconds: 400 })),
    { freshness: { maxSourceAgeSeconds: 300 } }
  );
  const assessment = await g.assessSwap(request);
  assert.equal(assessment.recommendation, 'UNASSESSABLE');
  assert(assessment.diagnostics.some((d) => d.code === 'SOURCE_TOO_OLD'));
  assert.equal((await g.check(request.source)).allowed, false);
});

test('diagnostics preserve simultaneous missing-evidence and market findings, verify reason hash only', () => {
  const data = result('ETH');
  data.verdict = 'BLOCK';
  data.attestation.data.verdict = 'BLOCK';
  data.reasonCodes = ['STABLECOIN_DEPEG', 'INSUFFICIENT_COVERAGE'];
  data.attestation.data.reasonCodesHash = keccak256(
    encodeAbiParameters([{ type: 'string[]' }], [[...data.reasonCodes].sort()])
  );
  const diagnostics = diagnosePreTrade(data, 'source');
  assert.deepEqual(
    diagnostics.map((d) => d.category),
    ['evidence_insufficient', 'market_risk']
  );
  assert(diagnostics.every((d) => d.origin === 'reason_codes_hash_bound'));
  assert.equal(data.verdict, 'BLOCK');
  data.reasonCodes.pop();
  assert(diagnosePreTrade(data, 'source').some((d) => d.code === 'REASON_CODES_HASH_MISMATCH'));
});

test('HTTP 402 is budget diagnostics rather than oracle danger', async () => {
  const g = guard(
    async () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'CREDITS_EXHAUSTED', message: 'Add credits' },
        }),
        { status: 402 }
      )
  );
  const assessment = await g.assessSwap(request);
  assert(assessment.diagnostics.every((d) => d.category === 'budget'));
});

test('successful response metadata survives a throwing observer and includes balance basis', async () => {
  let meta;
  const c = new InsightClient({
    apiKey: 'test',
    fetch: async () => api(result('ETH'), { 'x-credit-cost': '5', 'x-credit-balance': '100' }),
    onResponseMeta: (value) => {
      meta = value;
      throw Error('metrics down');
    },
  });
  assert.equal((await c.preTrade(request.source)).verdict, 'PASS');
  assert.equal(meta.creditCost, 5);
  assert.equal(meta.creditBalance, 100);
  assert.equal(meta.balanceBasis, 'before_request_snapshot');
  assert.equal(
    estimateWorkflowBudget({ balance: 100, feedCount: 4, intervalMs: 1_800_000 }).remainingCycles,
    5
  );
});

for (const signed of [false, true]) {
  test(`refresh distinguishes valid signal from portable continuity (${signed ? 'signed' : 'unsigned'})`, async () => {
    const bodies = [];
    const g = guard(async (url, init) => {
      if (init.method === 'GET') return api(result(new URL(url).searchParams.get('asset')));
      const body = JSON.parse(init.body);
      bodies.push(body);
      const fresh = result(body.asset);
      fresh.attestation.uid = `0x${(body.asset === 'ETH' ? '3' : '4').repeat(64)}`;
      return api({
        ...fresh,
        originalUid: body.originalUid,
        originalRequestHash: body.originalRequestHash,
        stillValid: true,
        stillValidReason: signed ? 'ok' : 'recheck_sign_failed',
        driftSinceOriginalPct: 0,
        recheck: signed
          ? {
              ...fresh.attestation,
              data: {
                ...fresh.attestation.data,
                originalUid: body.originalUid,
                originalRequestHash: body.originalRequestHash,
              },
            }
          : null,
      });
    });
    const old = await g.assessSwap(request);
    const before = JSON.stringify(old);
    const fresh = await g.refreshAssessment(old, {
      ...request,
      source: { ...request.source, targetProviders: ['chainlink', 'pyth'] },
    });
    assert.equal(fresh.signalValidity, true);
    assert.equal(fresh.proofAvailability, signed ? 'COMPLETE' : 'UNAVAILABLE');
    assert.equal(fresh.requiresReauthorization, true);
    assert.equal(fresh.assessment.receiptDraft === null, !signed);
    assert.equal(bodies[0].targetProviders, 'chainlink,pyth');
    assert.equal(JSON.stringify(old), before);
  });
}

test('recheck rejects a substituted continuity reference', async () => {
  const c = new InsightClient({
    apiKey: 'test',
    fetch: async () =>
      api({
        ...result('ETH'),
        originalUid: 'wrong',
        originalRequestHash: hash,
        stillValid: true,
        stillValidReason: 'ok',
        recheck: null,
      }),
  });
  await assert.rejects(
    () => c.recheck({ ...request.source, originalUid: hash, originalRequestHash: hash }),
    /continuity/
  );
});

test('evidence recovery after expiry polls existing job without repeating C4, signing or submission', async (t) => {
  let time = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => time);
  let c4 = 0;
  let observed = 0;
  let jobs = 0;
  const g = guard(async (url) =>
    new URL(url).pathname.endsWith('/issue')
      ? (c4++, api(receipt()))
      : api(result(new URL(url).searchParams.get('asset')))
  );
  const client = psClient({
    observe: async () => {
      observed++;
      return {
        observation: { status: 'PENDING', txHash },
        receipt: null,
        observationJob: {
          jobId: 'job-1',
          state: 'RUNNING',
          attempts: 1,
          observation: { status: 'PENDING', txHash },
        },
      };
    },
    getJob: async () => {
      jobs++;
      return {
        jobId: 'job-1',
        state: 'COMPLETED',
        attempts: 2,
        observation: { status: 'CONFIRMED', txHash },
        result: psEvidence(),
      };
    },
  });
  const assessment = await g.assessSwap(request);
  const authorized = await g.authorizeAssessedSwap({
    assessment,
    transaction,
    priorSeal: psOptions(client),
  });
  const initial = await g.verifyAssessedSwapExecution({
    ...authorized,
    txHash,
    priorSeal: { client },
  });
  assert.equal(initial.report.evidenceStatus, 'PRIORSEAL_PENDING');
  const checkpoint = JSON.parse(JSON.stringify(initial.checkpoint));
  time += 900_000;
  const recovered = await g.resumeAssessedSwapExecution(checkpoint, { client });
  assert.equal(c4, 1);
  assert.equal(observed, 1);
  assert.equal(jobs, 1);
  assert.equal(recovered.report.evidenceStatus, 'COMPLETE');
  assert.equal(recovered.report.verificationOrigin, 'service_response');
  assert.equal(recovered.report.independentVerificationPerformed, false);
  assert.equal(exportReviewAttachments(recovered.checkpoint).length, 3);
  await g.resumeAssessedSwapExecution(recovered.checkpoint, { client });
  assert.equal(c4, 1);
  assert.equal(jobs, 1);
  checkpoint.txHash = `0x${'9'.repeat(64)}`;
  await assert.rejects(
    () => g.resumeAssessedSwapExecution(checkpoint, { client }),
    /different transaction/
  );
});

test('Watch incident is durable and deduplicated; recovery needs samples and explicit acknowledgement', async () => {
  let healthy = false;
  let incidents = 0;
  let halts = 0;
  let recovered = 0;
  let saved = null;
  const g = guard(async () =>
    api({
      symbol: 'ETH',
      chain: 'ethereum',
      verdict: healthy ? 'normal' : 'danger',
      recommendation: healthy ? 'proceed' : 'halt',
      reason: 'fixture',
      reasonCodes: healthy ? [] : ['MAX_DEVIATION'],
      evaluatedAt: new Date().toISOString(),
    })
  );
  const options = {
    stateAdapter: {
      load: async () => saved,
      save: async (_key, state) => {
        saved = state;
      },
    },
    onIncident: () => {
      incidents++;
    },
    onHalt: () => {
      halts++;
    },
    onRecoveryReady: () => {
      recovered++;
    },
  };
  const handle = g.watch({ symbol: 'ETH' }, options);
  await handle.done;
  assert(g.isHalted({ symbol: 'ETH' }));
  const id = saved.incidentId;
  await handle.refresh();
  assert.equal(incidents, 1);
  assert.equal(halts, 1);
  assert.equal(saved.incidentId, id);
  healthy = true;
  await handle.refresh();
  await assert.rejects(() => handle.acknowledgeRecovery(), /consecutive/);
  await handle.refresh();
  assert.equal(recovered, 1);
  assert(g.isHalted({ symbol: 'ETH' }));
  await handle.acknowledgeRecovery();
  assert.equal(g.isHalted({ symbol: 'ETH' }), false);
  assert.equal(saved.status, 'running');
});

test('Watch restores halt before a fresh healthy sample and does not auto-resume', async () => {
  const stored = {
    schema: 'insight.watch-state.v1',
    targetKey: 'ETH@',
    status: 'halted',
    halted: true,
    incidentId: 'incident',
    incidentKind: 'market',
    consecutiveHealthy: 0,
    lastSuccessAt: Date.now(),
    nextCheckAt: null,
    lastSignalValidUntil: null,
    updatedAt: Date.now(),
  };
  let resolveSignal;
  const gotSignal = new Promise((resolve) => {
    resolveSignal = resolve;
  });
  const g = guard(async () =>
    api({
      symbol: 'ETH',
      chain: null,
      verdict: 'normal',
      recommendation: 'proceed',
      reason: 'ok',
      reasonCodes: [],
      evaluatedAt: new Date().toISOString(),
    })
  );
  const h = g.watch(
    { symbol: 'ETH' },
    { stateAdapter: { load: async () => stored, save: async () => {} }, onSignal: resolveSignal }
  );
  assert(g.isHalted({ symbol: 'ETH' }));
  await gotSignal;
  h.stop();
  await h.done;
  assert(g.isHalted({ symbol: 'ETH' }));
  assert.equal(h.getState().status, 'recovering');
});

test('observation wait timeout carries jobId and last known job', async (t) => {
  let time = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => time);
  const c = new PriorSealClient({
    baseUrl: 'https://example.test',
    fetch: async () => {
      time += 10;
      return new Response(
        JSON.stringify({
          jobId: 'job-1',
          state: 'RUNNING',
          attempts: 1,
          observation: { status: 'PENDING' },
        })
      );
    },
  });
  await assert.rejects(
    () => c.waitForObservationJob('job-1', { timeoutMs: 1 }),
    (error) => error.options.jobId === 'job-1' && error.options.lastJob.state === 'RUNNING'
  );
});

test('Watch budget failure preserves retry-after and never looks like a market signal', async () => {
  let resolveError;
  const failed = new Promise((resolve) => {
    resolveError = resolve;
  });
  const before = Date.now();
  const g = guard(
    async () =>
      new Response(JSON.stringify({ success: false, error: { code: 'CREDITS_EXHAUSTED' } }), {
        status: 402,
        headers: { 'Retry-After': '1800' },
      })
  );
  const h = g.watch(
    { symbol: 'ETH' },
    { intervalMs: 100, allowFasterPolling: true, onError: resolveError }
  );
  await failed;
  h.stop();
  await h.done;
  assert.equal(h.getState().incidentKind, 'budget');
  assert.equal(h.getState().status, 'monitor_unavailable');
  assert(h.getState().nextCheckAt >= before + 1800000);
});

test('unknown source freshness cannot be laundered through signed aggregate age zero', () => {
  const r = result('ETH', { maxDataAgeSeconds: 0 });
  r.assessmentScope = {
    requestedDimensions: ['source_freshness'],
    evaluatedDimensions: [],
    unavailableDimensions: [
      { dimension: 'source_freshness', reason: 'SOURCE_TIMESTAMPS_UNAVAILABLE' },
    ],
    actionRiskDirection: 'exchange',
  };
  assert.deepEqual(evaluateFreshness(r, { maxSourceAgeSeconds: 300 }).reasons, [
    'SOURCE_AGE_UNKNOWN',
  ]);
});

test('typed coverage and workflow labels reach the API explicitly', async () => {
  const urls = [];
  const c = new InsightClient({
    apiKey: 'test',
    fetch: async (url) => {
      urls.push(new URL(url));
      return new URL(url).pathname.endsWith('/coverage')
        ? api({ diagnostic: { signed: false } })
        : api(result('ETH'));
    },
  });
  await c.coverage({ asset: 'USDC', chainId: 1, probe: true, maxSourceAgeSeconds: 300 });
  await c.preTrade({
    ...request.source,
    workflowTag: 'treasury:1',
    baselineVerdict: 'allow',
    baselineVersion: 'rules-v1',
  });
  assert.equal(urls[0].searchParams.get('probe'), 'true');
  assert.equal(urls[0].searchParams.get('chainId'), '1');
  assert.equal(urls[1].searchParams.get('workflowTag'), 'treasury:1');
});

test('unsigned attestation object cannot become a receipt-ready assessment', async () => {
  const g = guard(async (url) => {
    const r = result(new URL(url).searchParams.get('asset'));
    delete r.attestation.signature;
    return api(r);
  });
  const assessment = await g.assessSwap(request);
  assert.equal(assessment.receiptDraft, null);
  assert.equal(assessment.recommendation, 'UNASSESSABLE');
  assert(assessment.diagnostics.some((d) => d.code === 'SIGNED_PROOF_UNAVAILABLE'));
});

test('an explicitly requested unavailable protocol cannot inherit a generic oracle PASS', async () => {
  const g = guard(async (url) => {
    const r = result(new URL(url).searchParams.get('asset'));
    r.assessmentScope = {
      requestedDimensions: ['oracle_consensus', 'protocol_parameters'],
      evaluatedDimensions: ['oracle_consensus'],
      unavailableDimensions: [{ dimension: 'protocol_parameters', reason: 'UNKNOWN_PROTOCOL' }],
      actionRiskDirection: 'exchange',
    };
    return api(r);
  });
  const source = { ...request.source, protocolId: 'unknown-protocol' };
  const a = await g.assessSwap({ ...request, source });
  assert.equal(a.recommendation, 'UNASSESSABLE');
  assert.equal(a.sourcePreTrade.verdict, 'PASS');
  assert(a.diagnostics.some((d) => d.category === 'scope_unavailable'));
  assert.equal((await g.check(source)).allowed, false);
});

for (const [name, fields, code] of [
  ['expired', { checkedAt: 1000, validUntil: 1020 }, 'INSUFFICIENT_REMAINING_VALIDITY'],
  ['reversed', { checkedAt: 1010, validUntil: 1000 }, 'INVALID_ASSESSMENT_TIME_WINDOW'],
  ['malformed', { checkedAt: 1000, validUntil: 'invalid' }, 'INVALID_ASSESSMENT_TIME_WINDOW'],
]) {
  test(`default freshness rejects ${name} time windows without a custom profile`, async (t) => {
    t.mock.method(Date, 'now', () => 1_020_000);
    const g = guard(async () => api(result('ETH', fields)));
    assert.equal((await g.check(request.source)).allowed, false);
    await assert.rejects(() => g.assertSafe(request.source));
    assert(evaluateFreshness(result('ETH', fields), {}, 1020).reasons.includes(code));
  });
}

test('legacy missing time fields remain unknown unless explicitly required', () => {
  const data = result('ETH');
  delete data.attestation.data.checkedAt;
  delete data.attestation.data.validUntil;
  assert.equal(evaluateFreshness(data).satisfied, true);
  assert.equal(evaluateFreshness(data, { minimumRemainingValiditySeconds: 0 }).satisfied, false);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function watchResult(healthy) {
  return {
    symbol: 'ETH',
    chain: null,
    verdict: healthy ? 'normal' : 'danger',
    recommendation: healthy ? 'proceed' : 'halt',
    reason: 'fixture',
    reasonCodes: healthy ? [] : ['MAX_DEVIATION'],
    evaluatedAt: new Date().toISOString(),
  };
}

test('a replaced Watch cannot clear a new halt when its durable load completes late', async () => {
  const load = deferred();
  const started = deferred();
  let obsoleteSignals = 0;
  const g = guard(async () => api(watchResult(false)));
  const old = g.watch(
    { symbol: 'ETH' },
    {
      stateAdapter: {
        load: () => {
          started.resolve();
          return load.promise;
        },
        save: async () => {},
      },
      onSignal: () => {
        obsoleteSignals++;
      },
    }
  );
  await started.promise;
  const current = g.watch({ symbol: 'ETH' });
  await current.done;
  load.resolve(null);
  await old.done;
  assert.equal(g.isHalted({ symbol: 'ETH' }), true);
  assert.equal(current.getState().halted, true);
  assert.equal(obsoleteSignals, 0);
  await assert.rejects(() => old.refresh(), /replaced/);
  await assert.rejects(() => old.acknowledgeRecovery(), /replaced/);
});

test('a replaced Watch cannot clear a new halt when an old HTTP request ignores abort', async () => {
  const response = deferred();
  const started = deferred();
  let calls = 0;
  let obsoleteSignals = 0;
  const g = guard(async () => {
    if (++calls === 1) {
      started.resolve();
      return response.promise;
    }
    return api(watchResult(false));
  });
  const old = g.watch(
    { symbol: 'ETH' },
    {
      onSignal: () => {
        obsoleteSignals++;
      },
    }
  );
  await started.promise;
  const current = g.watch({ symbol: 'ETH' });
  await current.done;
  response.resolve(api(watchResult(true)));
  await old.done;
  assert.equal(g.isHalted({ symbol: 'ETH' }), true);
  assert.equal(current.getState().status, 'halted');
  assert.equal(obsoleteSignals, 0);
});

test('replacement waits for an already-started durable write before restoring state', async () => {
  const saving = deferred();
  const release = deferred();
  let stored = null;
  let calls = 0;
  const adapter = {
    load: async () => stored,
    save: async (_key, state) => {
      if (++calls === 1) {
        saving.resolve();
        await release.promise;
      }
      stored = state;
    },
  };
  let requests = 0;
  const g = guard(async () => api(watchResult(++requests > 1)));
  const old = g.watch({ symbol: 'ETH' }, { stateAdapter: adapter });
  await saving.promise;
  const gotSignal = deferred();
  const current = g.watch(
    { symbol: 'ETH' },
    { stateAdapter: adapter, onSignal: gotSignal.resolve }
  );
  assert.equal(g.isHalted({ symbol: 'ETH' }), true);
  release.resolve();
  await old.done;
  await gotSignal.promise;
  current.stop();
  await current.done;
  assert.equal(current.getState().status, 'recovering');
  assert.equal(current.getState().halted, true);
  assert.equal(stored.halted, true);
  assert.equal(g.isHalted({ symbol: 'ETH' }), true);
});

for (const dimension of ['stablecoin_peg', 'source_freshness']) {
  test(`a PASS with a requested but unavailable ${dimension} dimension is unassessable`, async () => {
    const g = guard(async (url) => {
      const r = result(new URL(url).searchParams.get('asset'));
      r.assessmentScope = {
        requestedDimensions: ['oracle_consensus', dimension],
        evaluatedDimensions: ['oracle_consensus'],
        unavailableDimensions: [{ dimension, reason: 'EVIDENCE_UNAVAILABLE' }],
        actionRiskDirection: 'exchange',
      };
      return api(r);
    });
    const assessment = await g.assessSwap(request);
    assert.equal(assessment.recommendation, 'UNASSESSABLE');
    assert.equal(assessment.receiptDraft, null);
    assert.equal(assessment.sourcePreTrade.verdict, 'PASS');
    assert(assessment.diagnostics.some((d) => d.category === 'scope_unavailable'));
    assert.equal((await g.check(request.source)).allowed, false);
  });
}

for (const state of ['FAILED', 'UNDETERMINED', 'COMPLETED']) {
  for (const status of ['PENDING', 'RPC_ERROR']) {
    test(`terminal ${state} observation with stale ${status} status reports missing evidence, not pending`, async () => {
      let observed = 0;
      let c4 = 0;
      const g = guard(async (url) =>
        new URL(url).pathname.endsWith('/issue')
          ? (c4++, api(receipt()))
          : api(result(new URL(url).searchParams.get('asset')))
      );
      const client = psClient({
        observe: async () => {
          observed++;
          return {
            observation: { status, txHash },
            receipt: null,
            observationJob: {
              jobId: 'job-terminal',
              state,
              attempts: 3,
              observation: { status, txHash },
            },
          };
        },
        getJob: async () => {
          assert.fail('Terminal jobs must not be repolled or reissued.');
        },
      });
      const assessment = await g.assessSwap(request);
      const authorized = await g.authorizeAssessedSwap({
        assessment,
        transaction,
        priorSeal: psOptions(client),
      });
      const initial = await g.verifyAssessedSwapExecution({
        ...authorized,
        txHash,
        priorSeal: { client },
      });
      assert.equal(initial.report.evidenceStatus, 'PARTIAL');
      assert.equal(initial.report.assuranceValid, null);
      assert(initial.report.reasonCodes.includes(`PRIORSEAL_JOB_${state}_WITHOUT_RECEIPT`));
      const recovered = await g.resumeAssessedSwapExecution(initial.checkpoint, { client });
      assert.equal(recovered.report.evidenceStatus, 'PARTIAL');
      assert.equal(recovered.report.assuranceValid, null);
      assert.equal(observed, 1);
      assert.equal(c4, 1);
    });
  }
}
