import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyVercelDeploy } from '../verify-vercel-deploy.mjs';

const commitSha = 'a'.repeat(40);
const projectId = 'prj_Test123';
const hookUrl = `https://api.vercel.com/v1/integrations/deploy/${projectId}/hook-secret`;
const hookResponse = { job: { id: 'job-1', createdAt: 1_000_000, state: 'PENDING' } };

function deployment(state, overrides = {}) {
  return {
    uid: 'dpl_test',
    projectId,
    target: 'production',
    meta: { githubCommitSha: commitSha },
    createdAt: hookResponse.job.createdAt + 1000,
    readyState: state,
    ...overrides,
  };
}

function harness(pages) {
  let time = 1_000_000;
  let calls = 0;
  return {
    fetcher: async (url, init) => {
      assert.equal(url.searchParams.get('sha'), commitSha);
      assert.equal(url.searchParams.get('projectId'), projectId);
      assert.equal(url.searchParams.get('since'), String(hookResponse.job.createdAt));
      assert.equal(init.headers.Authorization, 'Bearer test-token');
      const deployments = pages[Math.min(calls++, pages.length - 1)];
      return { ok: true, json: async () => ({ deployments }) };
    },
    now: () => time,
    sleep: async (ms) => {
      time += ms;
    },
    timeoutMs: 30,
    pollIntervalMs: 10,
  };
}

test('waits for the exact production commit to be ready and promoted', async () => {
  const result = await verifyVercelDeploy({
    hookResponse,
    hookUrl,
    token: 'test-token',
    commitSha,
    ...harness([
      [deployment('READY', { meta: { githubCommitSha: 'b'.repeat(40) }, aliasAssigned: 1 })],
      [deployment('BUILDING')],
      [deployment('READY', { aliasAssigned: 1 })],
    ]),
  });
  assert.equal(result.id, 'dpl_test');
  assert.equal(result.commitSha, commitSha);
});

test('fails when Vercel rejects the deployment', async () => {
  await assert.rejects(
    verifyVercelDeploy({
      hookResponse,
      hookUrl,
      token: 'test-token',
      commitSha,
      ...harness([[deployment('ERROR')]]),
    }),
    /deployment dpl_test failed: ERROR/
  );
});

test('never accepts an older deployment for the same commit', async () => {
  await assert.rejects(
    verifyVercelDeploy({
      hookResponse,
      hookUrl,
      token: 'test-token',
      commitSha,
      ...harness([[deployment('READY', { createdAt: 999_000, aliasAssigned: 1 })]]),
    }),
    /not ready before the timeout/
  );
});

test('requires credentials before accepting a queued job', async () => {
  await assert.rejects(
    verifyVercelDeploy({ hookResponse, hookUrl, token: '', commitSha }),
    /VERCEL_TOKEN is required/
  );
});
