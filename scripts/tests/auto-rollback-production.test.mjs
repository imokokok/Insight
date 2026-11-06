import assert from 'node:assert/strict';
import test from 'node:test';

import { guardAndRollback, projectIdFromDeployHook } from '../auto-rollback-production.mjs';

const previousSha = 'b'.repeat(40);

test('derives the Vercel project id from the deploy hook URL', () => {
  assert.equal(
    projectIdFromDeployHook('https://api.vercel.com/v1/integrations/deploy/prj_Abc123/hook-secret'),
    'prj_Abc123'
  );
});

test('rolls back while production still serves the deployment this run released', async () => {
  const calls = [];
  const logs = [];
  const outcome = await guardAndRollback({
    expectedDeploymentId: 'dpl_new',
    token: 'test-token',
    projectId: 'prj_Test',
    baseUrl: 'https://live.example.test',
    readProduction: async () => ({ id: 'dpl_new' }),
    rollback: async (options) => {
      calls.push(options);
      return { target: { id: 'dpl_previous', commitSha: previousSha }, timings: {} };
    },
    log: (line) => logs.push(line),
  });

  assert.equal(outcome.status, 'executed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, 'previous');
  assert.equal(calls[0].execute, true);
  assert.match(logs.join('\n'), /dpl_previous/);
});

test('does not roll back when a newer release already owns production', async () => {
  let rolledBack = false;
  const outcome = await guardAndRollback({
    expectedDeploymentId: 'dpl_new',
    token: 'test-token',
    projectId: 'prj_Test',
    readProduction: async () => ({ id: 'dpl_newer' }),
    rollback: async () => {
      rolledBack = true;
      return {};
    },
    log: () => {},
  });

  assert.equal(outcome.status, 'skipped');
  assert.equal(rolledBack, false);
});

test('refuses to act without the deployment this run released', async () => {
  await assert.rejects(
    guardAndRollback({
      expectedDeploymentId: '',
      token: 'test-token',
      projectId: 'prj_Test',
    }),
    /EXPECTED_DEPLOYMENT_ID/
  );
});
