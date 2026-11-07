import assert from 'node:assert/strict';
import test from 'node:test';

import { assertProductionDomainCommit } from '../assert-production-domain-commit.mts';

const commitSha = 'a'.repeat(40);
const staleSha = 'b'.repeat(40);

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function harness({
  domainCommit,
  deploymentId = 'dpl_domain',
}: {
  domainCommit: string | null;
  deploymentId?: string | null;
}) {
  const requests: string[] = [];
  return {
    requests,
    fetcher: async (url: URL | string) => {
      const endpoint = String(url);
      requests.push(endpoint);
      if (endpoint.includes('/v4/aliases')) {
        return response({
          aliases: deploymentId
            ? [{ alias: 'www.oracleinsight.xyz', deploymentId }]
            : [],
        });
      }
      return response({
        uid: 'dpl_domain',
        readyState: 'READY',
        meta: { githubCommitSha: domainCommit },
      });
    },
  };
}

test('passes only when the production domain serves the released commit', async () => {
  const setup = harness({ domainCommit: commitSha });
  const result = await assertProductionDomainCommit({
    token: 'test-token',
    commitSha,
    fetcher: setup.fetcher,
  });
  assert.equal(result.commitSha, commitSha);
  assert.equal(result.deploymentId, 'dpl_domain');
});

// Regression for the STAGED release: a READY deployment with aliasAssigned=true
// passed the old check while the domain still served the previous commit.
test('fails when the production domain still serves another commit', async () => {
  const setup = harness({ domainCommit: staleSha });
  await assert.rejects(
    assertProductionDomainCommit({ token: 'test-token', commitSha, fetcher: setup.fetcher }),
    /serves b{40} \(dpl_domain\) instead of the released commit a{40}/
  );
});

test('fails when the production domain has no deployment alias', async () => {
  const setup = harness({ domainCommit: staleSha, deploymentId: null });
  await assert.rejects(
    assertProductionDomainCommit({ token: 'test-token', commitSha, fetcher: setup.fetcher }),
    /has no deployment alias/
  );
});
