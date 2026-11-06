import assert from 'node:assert/strict';
import test from 'node:test';

import { deployVercelProduction } from '../deploy-vercel-production.mts';

const commitSha = 'a'.repeat(40);
const staleSha = 'b'.repeat(40);
const projectId = 'prj_Test123';
const hookUrl = `https://api.vercel.com/v1/integrations/deploy/${projectId}/hook-secret`;

function deployment(state: string, overrides: Record<string, unknown> = {}) {
  return {
    uid: 'dpl_test',
    projectId,
    target: 'production',
    meta: { githubCommitSha: commitSha, githubCommitRef: 'main', deployHookId: 'hook-1' },
    createdAt: 1_001_000,
    buildingAt: 1_002_000,
    ready: 1_004_000,
    readyState: state,
    ...overrides,
  };
}

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function harness(
  pages: unknown[][],
  options: { runtimeNode?: string | null; runtimeHtml?: boolean } = {}
) {
  let time = 1_000_000;
  let listCalls = 0;
  const verifiedMajor = process.versions.node.split('.')[0];
  const runtimeNode =
    options.runtimeNode === undefined ? process.versions.node : options.runtimeNode;
  const requests: Array<{ url: URL | string; init?: RequestInit }> = [];
  return {
    requests,
    fetcher: async (url: URL | string, init?: RequestInit) => {
      requests.push({ url, init });
      const endpoint = String(url);
      if (endpoint === hookUrl) return response({ job: { id: 'job-1', createdAt: 1_000_000 } });
      if (endpoint.includes('/v13/deployments/')) {
        return response({ nodeVersion: `${verifiedMajor}.x` });
      }
      if (endpoint.includes('/api/v1/health/ready')) {
        if (options.runtimeHtml) {
          return {
            ok: true,
            status: 200,
            json: async () => {
              throw new SyntaxError('Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON');
            },
          } as unknown as Response;
        }
        if (runtimeNode === null) return response({}, 404);
        return response({ success: true, data: { runtime: { node: runtimeNode } } });
      }
      if (endpoint.includes('/cancel')) return response({});
      const deployments = pages[Math.min(listCalls++, pages.length - 1)] ?? [];
      return response({ deployments });
    },
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
    timeoutMs: 30,
    pollIntervalMs: 10,
  };
}

test('reuses an already promoted deployment for the exact commit', async () => {
  const setup = harness([
    [deployment('READY', { aliasAssigned: 1 })],
    [deployment('READY', { aliasAssigned: 1 })],
  ]);
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.mode, 'reused');
  assert.equal(result.id, 'dpl_test');
  assert.equal(result.nodeVersion, `${process.versions.node.split('.')[0]}.x`);
  assert.equal(result.queueMs, 1_000);
  assert.equal(result.buildMs, 2_000);
  assert.equal(
    setup.requests.some((request) => String(request.url) === hookUrl),
    false
  );
});

test('waits for an active same-SHA deploy hook build instead of creating a duplicate', async () => {
  const running = deployment('BUILDING', { buildingAt: undefined, ready: undefined });
  const ready = deployment('READY', { aliasAssigned: 1 });
  const setup = harness([[running], [running], [ready]]);
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.mode, 'reused');
  assert.equal(
    setup.requests.some((request) => String(request.url) === hookUrl),
    false
  );
  assert.equal(
    setup.requests.some((request) => String(request.url).includes('/cancel')),
    false
  );
});

test('cancels an obsolete hook build before creating and verifying the current deployment', async () => {
  const stale = deployment('BUILDING', {
    uid: 'dpl_stale',
    meta: { githubCommitSha: staleSha, githubCommitRef: 'main', deployHookId: 'hook-1' },
  });
  const current = deployment('READY', { aliasAssigned: 1, createdAt: 1_001_000 });
  const setup = harness([[stale], [], [current]]);
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.mode, 'created');
  assert.deepEqual(result.canceledDeploymentIds, ['dpl_stale']);
  assert.equal(
    setup.requests.some(
      (request) =>
        String(request.url).includes('/v12/deployments/dpl_stale/cancel') &&
        request.init?.method === 'PATCH'
    ),
    true
  );
  assert.equal(
    setup.requests.some((request) => String(request.url) === hookUrl),
    true
  );
});

test('waits for an exact-SHA deployment when the accepted deploy hook response times out', async () => {
  const building = deployment('BUILDING', {
    buildingAt: undefined,
    ready: undefined,
    createdAt: 1_000_000,
  });
  const ready = deployment('READY', { aliasAssigned: 1, createdAt: 1_000_000 });
  const setup = harness([[], [], [building], [ready]]);
  const fetcher = setup.fetcher;
  setup.fetcher = async (url, init) => {
    if (String(url) === hookUrl) {
      setup.requests.push({ url, init });
      throw Object.assign(new Error('The operation was aborted due to timeout'), {
        name: 'TimeoutError',
      });
    }
    return fetcher(url, init);
  };

  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });

  assert.equal(result.mode, 'created');
  assert.equal(result.id, 'dpl_test');
  assert.equal(setup.requests.filter((request) => String(request.url) === hookUrl).length, 1);
});

test('does not cancel an active build that is not a main-branch deploy hook build', async () => {
  const unrelated = deployment('BUILDING', {
    uid: 'dpl_preview',
    meta: { githubCommitSha: staleSha, githubCommitRef: 'feature/keep-me' },
  });
  const current = deployment('READY', { aliasAssigned: 1, createdAt: 1_001_000 });
  const setup = harness([[unrelated], [], [current]]);
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.deepEqual(result.canceledDeploymentIds, []);
  assert.equal(
    setup.requests.some((request) => String(request.url).includes('/cancel')),
    false
  );
});

test('fails when the created deployment reaches a terminal error', async () => {
  const setup = harness([[], [], [deployment('ERROR')]]);
  await assert.rejects(
    deployVercelProduction({ hookUrl, token: 'test-token', commitSha, ...setup }),
    /deployment dpl_test failed: ERROR/
  );
});

test('requires a Vercel token before reading or mutating deployments', async () => {
  await assert.rejects(
    deployVercelProduction({ hookUrl, token: '', commitSha }),
    /VERCEL_TOKEN is required/
  );
});

test('fails when production runs a different Node.js major than CI', async () => {
  const ready = deployment('READY', { aliasAssigned: 1 });
  const setup = harness([[], [], [ready]]);
  const fetcher = setup.fetcher;
  const verifiedMajor = process.versions.node.split('.')[0];
  const otherMajor = verifiedMajor === '22' ? '24' : '22';
  setup.fetcher = async (url, init) => {
    if (String(url).includes('/v13/deployments/')) {
      setup.requests.push({ url, init });
      return response({ nodeVersion: `${otherMajor}.x` });
    }
    return fetcher(url, init);
  };
  await assert.rejects(
    deployVercelProduction({ hookUrl, token: 'test-token', commitSha, ...setup }),
    /ran Node .* but CI verified Node/
  );
});

test('fails when the deployment does not report a Node.js version', async () => {
  const ready = deployment('READY', { aliasAssigned: 1 });
  const setup = harness([[], [], [ready]]);
  const fetcher = setup.fetcher;
  setup.fetcher = async (url, init) => {
    if (String(url).includes('/v13/deployments/')) {
      setup.requests.push({ url, init });
      return response({});
    }
    return fetcher(url, init);
  };
  await assert.rejects(
    deployVercelProduction({ hookUrl, token: 'test-token', commitSha, ...setup }),
    /did not report its Node.js version/
  );
});

test('reports the exact runtime Node.js version with no drift', async () => {
  const ready = deployment('READY', { aliasAssigned: 1, url: 'dpl-test.vercel.app' });
  const setup = harness([[ready]], { runtimeNode: process.versions.node });
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.runtimeNodeVersion, process.versions.node);
  assert.equal(result.runtimeNodeDrift, false);
  assert.ok(setup.requests.some((request) => String(request.url).endsWith('/api/v1/health/ready')));
});

test('marks a minor or patch drift without blocking the release', async () => {
  const major = process.versions.node.split('.')[0];
  const ready = deployment('READY', { aliasAssigned: 1, url: 'dpl-test.vercel.app' });
  const setup = harness([[ready]], { runtimeNode: `${major}.0.1` });
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.runtimeNodeVersion, `${major}.0.1`);
  assert.equal(result.runtimeNodeDrift, true);
});

test('keeps the release when readiness cannot report the runtime version', async () => {
  const ready = deployment('READY', { aliasAssigned: 1, url: 'dpl-test.vercel.app' });
  const setup = harness([[ready]], { runtimeNode: null });
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.runtimeNodeVersion, null);
  assert.equal(result.runtimeNodeDrift, null);
});

test('keeps the release when readiness returns an HTML page instead of JSON', async () => {
  const ready = deployment('READY', { aliasAssigned: 1, url: 'dpl-test.vercel.app' });
  const setup = harness([[ready]], { runtimeHtml: true });
  const result = await deployVercelProduction({
    hookUrl,
    token: 'test-token',
    commitSha,
    ...setup,
  });
  assert.equal(result.runtimeNodeVersion, null);
  assert.equal(result.runtimeNodeDrift, null);
});
