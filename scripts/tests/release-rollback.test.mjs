import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ReleaseRollbackError,
  configFromEnv,
  parseArgs,
  runReleaseRollback,
} from '../release-rollback.mjs';

const projectId = 'prj_TestRollback';
const currentId = 'dpl_current';
const previousId = 'dpl_previous';
const olderId = 'dpl_older';
const currentSha = 'a'.repeat(40);
const previousSha = 'b'.repeat(40);
const olderSha = 'c'.repeat(40);
const baseUrl = 'https://rollback.example.test';

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  };
}

function deployment({ id, sha, createdAt, target = 'production', readyState = 'READY' }) {
  return {
    id,
    uid: id,
    projectId,
    target,
    readyState,
    createdAt,
    url: `${id.replaceAll('_', '-')}.vercel.app`,
    meta: { githubCommitSha: sha, githubCommitRef: 'main' },
    alias: [],
  };
}

function projectPayload(productionDeployment, plan = 'hobby') {
  return {
    id: projectId,
    name: 'insight',
    targets: {
      production: { ...productionDeployment, plan, alias: ['www.example.test'] },
    },
  };
}

function harness({
  deployments = [
    deployment({ id: currentId, sha: currentSha, createdAt: 300 }),
    deployment({ id: previousId, sha: previousSha, createdAt: 200 }),
    deployment({ id: olderId, sha: olderSha, createdAt: 100 }),
  ],
  switchAfterPolls = 1,
  postResponse,
  smokeStatus,
  singleDeployment,
} = {}) {
  let productionId = deployments[0].id;
  const postPaths = [];
  const logs = [];
  const fetcher = async (url, init = {}) => {
    const endpoint = String(url);
    const method = init.method ?? 'GET';
    if (endpoint.startsWith(`${baseUrl}/`)) {
      const path = new URL(endpoint).pathname;
      if (smokeStatus && smokeStatus[path]) return response({}, smokeStatus[path]);
      if (path === '/api/v1/health') return response({ success: true });
      return response({ ok: true });
    }
    if (endpoint.includes(`/v9/projects/${projectId}`)) {
      const production = deployments.find((candidate) => candidate.id === productionId) ?? {
        id: productionId,
        target: 'production',
        readyState: 'READY',
        createdAt: 300,
        url: 'promoted.vercel.app',
        meta: {},
      };
      return response(projectPayload(production));
    }
    if (endpoint.includes('/v6/deployments')) {
      return response({ deployments });
    }
    if (endpoint.includes('/v13/deployments/')) {
      if (!singleDeployment) return response({}, 404);
      return response(singleDeployment);
    }
    if (method === 'POST' && endpoint.includes('/rollback/')) {
      postPaths.push(endpoint);
      if (postResponse) return postResponse();
      return acceptSwitch(endpoint.split('/rollback/')[1]);
    }
    if (method === 'POST' && endpoint.includes('/promote/')) {
      postPaths.push(endpoint);
      if (postResponse) return postResponse();
      return acceptSwitch(endpoint.split('/promote/')[1]);
    }
    throw new Error(`Unexpected request: ${method} ${endpoint}`);
  };
  let time = 1_000;
  return {
    postPaths,
    logs,
    fetcher,
    get productionId() {
      return productionId;
    },
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    log: (line) => logs.push(String(line)),
  };

  function acceptSwitch(targetId) {
    if (switchAfterPolls !== Infinity) productionId = targetId;
    return response({ status: 'ok' });
  }
}

async function run(overrides = {}, options = {}) {
  const setup = harness(options);
  const result = await runReleaseRollback({
    token: 'test-token',
    projectId,
    baseUrl,
    execute: true,
    ...setup,
    ...overrides,
  });
  return { result, setup };
}

test('parses the documented flags and rejects invalid input', () => {
  assert.deepEqual(parseArgs([]), {
    to: 'previous',
    yes: false,
    method: 'auto',
    baseUrl: undefined,
    timeoutMs: 120_000,
    help: false,
  });
  assert.equal(parseArgs(['--to', 'dpl_x', '--yes', '--method', 'promote']).method, 'promote');
  assert.throws(() => parseArgs(['--wat']), ReleaseRollbackError);
  assert.throws(() => parseArgs(['--method', 'guess']), /--method must be/);
  assert.throws(() => parseArgs(['--to']), /--to requires a value/);
});

test('reports missing credentials instead of failing silently', () => {
  assert.throws(() => configFromEnv({}), /VERCEL_TOKEN is missing/);
  assert.throws(() => configFromEnv({ VERCEL_TOKEN: 'token' }), /VERCEL_PROJECT_ID is missing/);
});

test('prints the plan without mutating production unless --yes is supplied', async () => {
  const setup = harness();
  const result = await runReleaseRollback({
    token: 'test-token',
    projectId,
    baseUrl,
    to: 'previous',
    execute: false,
    ...setup,
  });
  assert.equal(result.executed, false);
  assert.equal(setup.postPaths.length, 0);
  assert.equal(setup.productionId, currentId);
  assert.match(setup.logs.join('\n'), /current production: dpl_current/);
  assert.match(setup.logs.join('\n'), /target: dpl_previous/);
  assert.match(setup.logs.join('\n'), /Dry run only/);
});

test('rolls back to the previous production deployment and verifies the switch', async () => {
  const { result, setup } = await run();
  assert.equal(result.method, 'rollback');
  assert.equal(result.target.id, previousId);
  assert.equal(setup.productionId, previousId);
  assert.equal(setup.postPaths.length, 1);
  assert.match(setup.postPaths[0], new RegExp(`/v1/projects/${projectId}/rollback/${previousId}$`));
  assert.equal(result.smokeFailures.length, 0);
  assert.ok(result.timings.verifiedMs >= result.timings.switchedMs);
  assert.match(setup.logs.join('\n'), /live verification: passed/);
  assert.match(setup.logs.join('\n'), /total:/);
});

test('uses promote when an explicit target is newer than the current deployment', async () => {
  const deployments = [
    deployment({ id: previousId, sha: previousSha, createdAt: 200 }),
    deployment({ id: olderId, sha: olderSha, createdAt: 100 }),
  ];
  const setup = harness({ deployments });
  const result = await runReleaseRollback({
    token: 'test-token',
    projectId,
    baseUrl,
    to: currentId,
    execute: true,
    ...setup,
    fetcher: async (url, init) => {
      const endpoint = String(url);
      if (endpoint.includes(`/v13/deployments/${currentId}`)) {
        return response(deployment({ id: currentId, sha: currentSha, createdAt: 300 }));
      }
      return setup.fetcher(url, init);
    },
  });
  assert.equal(result.method, 'promote');
  assert.equal(setup.postPaths.length, 1);
  assert.match(setup.postPaths[0], new RegExp(`/v10/projects/${projectId}/promote/${currentId}$`));
  assert.equal(setup.productionId, currentId);
});

test('surfaces the Hobby-plan 402 rejection with an actionable message', async () => {
  const setup = harness({
    postResponse: () =>
      response({ error: { message: 'Rollback is not allowed on this plan' } }, 402),
  });
  await assert.rejects(
    runReleaseRollback({
      token: 'test-token',
      projectId,
      baseUrl,
      to: olderId,
      method: 'rollback',
      execute: true,
      ...setup,
    }),
    /HTTP 402.*only the immediately previous production deployment/s
  );
  assert.equal(setup.productionId, currentId);
});

test('refuses a deployment that is not a ready production deployment', async () => {
  const setup = harness({
    singleDeployment: deployment({
      id: 'dpl_preview',
      sha: currentSha,
      createdAt: 400,
      target: null,
      readyState: 'READY',
    }),
  });
  await assert.rejects(
    runReleaseRollback({
      token: 'test-token',
      projectId,
      baseUrl,
      to: 'dpl_preview',
      execute: false,
      ...setup,
    }),
    /not a production deployment/
  );
});

test('fails after switching when the live site does not pass smoke checks', async () => {
  const setup = harness({
    smokeStatus: { '/api/v1/health': 503 },
  });
  await assert.rejects(
    runReleaseRollback({
      token: 'test-token',
      projectId,
      baseUrl,
      to: 'previous',
      execute: true,
      ...setup,
    }),
    /Production now serves dpl_previous, but live verification failed/
  );
  assert.equal(setup.productionId, previousId);
});

test('fails clearly when production never reaches the target deployment', async () => {
  const setup = harness({ switchAfterPolls: Infinity });
  await assert.rejects(
    runReleaseRollback({
      token: 'test-token',
      projectId,
      baseUrl,
      to: 'previous',
      execute: true,
      timeoutMs: 10,
      pollIntervalMs: 5,
      ...setup,
    }),
    /did not switch to dpl_previous/
  );
  assert.equal(setup.productionId, currentId);
});
