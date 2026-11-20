import assert from 'node:assert/strict';
import test from 'node:test';

import { assertProductionDomainCommit } from '../assert-production-domain-commit.mts';

const commitSha = 'a'.repeat(40);
const staleSha = 'b'.repeat(40);

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function harness(releaseSha: string | null) {
  const requests: string[] = [];
  return {
    requests,
    fetcher: async (url: URL | string) => {
      requests.push(String(url));
      return response(releaseSha === null ? null : { releaseSha });
    },
  };
}

test('passes only when the production domain serves the released commit', async () => {
  const setup = harness(commitSha);
  const result = await assertProductionDomainCommit({
    commitSha,
    fetcher: setup.fetcher,
  });
  assert.equal(result.commitSha, commitSha);
  assert.equal(result.domain, 'https://www.oracleinsight.xyz');
  assert.equal(setup.requests.length, 1);
});

test('fails when the production domain still serves another commit', async () => {
  const setup = harness(staleSha);
  await assert.rejects(
    assertProductionDomainCommit({ commitSha, fetcher: setup.fetcher }),
    /serves b{40} instead of the released commit a{40}/
  );
});

test('fails when the release endpoint does not return a build identity', async () => {
  const setup = harness(null);
  await assert.rejects(
    assertProductionDomainCommit({ commitSha, fetcher: setup.fetcher }),
    /serves unavailable instead of the released commit/
  );
});
