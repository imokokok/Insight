import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as sdk from '../dist/index.js';

const vectors = JSON.parse(
  readFileSync(new URL('../../examples/rwa-v2/golden.json', import.meta.url), 'utf8')
);
test('frozen v1 and v2 EIP-712 digests and signatures remain compatible', async () => {
  const { v1, v2, execution, now } = vectors;
  assert.equal(sdk.rwaReportDigest(v1.proof.report), v1.proof.digest);
  assert.equal((await sdk.verifyRwaReport(v1.proof, v1.trust, now)).valid, true);
  for (const v of [v2, execution]) {
    assert.equal(sdk.rwaV2ReportDigest(v.proof.report), v.proof.digest);
    assert.equal((await sdk.verifyRwaReportV2(v.proof, v.trust, now)).valid, true);
  }
  assert.equal(execution.proof.report.previousDigest, v2.proof.digest);
});

test('v1 strict verification and inspection preserve distinct error gates', async () => {
  const { v1, now } = vectors;
  const cases = [
    {
      name: 'invalid clock',
      mutate: () => {},
      at: 0,
      verify: 'RWA_INVALID_TRUST',
      inspect: 'RWA_EXPIRED_OR_FUTURE',
    },
    {
      name: 'expired report',
      mutate: () => {},
      at: v1.proof.report.validUntil,
      verify: 'RWA_EXPIRED_OR_FUTURE',
      inspect: 'RWA_EXPIRED_OR_FUTURE',
    },
    {
      name: 'wrong trust policy ID',
      mutate: (x) => {
        x.trust.policyId = `0x${'0'.repeat(64)}`;
      },
      at: now,
      verify: 'RWA_INVALID_TRUST',
      inspect: 'RWA_SCOPE_MISMATCH',
    },
    {
      name: 'changed signed scope',
      mutate: (x) => {
        x.proof.report.environment = 'production';
      },
      at: now,
      verify: 'RWA_SCOPE_MISMATCH',
      inspect: 'RWA_INTEGRITY_INVALID',
    },
    {
      name: 'missing trusted signer',
      mutate: (x) => {
        x.trust.keys = [];
      },
      at: now,
      verify: 'RWA_SIGNER_UNTRUSTED',
      inspect: 'RWA_SIGNER_UNTRUSTED',
    },
    {
      name: 'malformed signature',
      mutate: (x) => {
        x.proof.signature = '0x';
      },
      at: now,
      verify: 'RWA_SIGNATURE_INVALID',
      inspect: 'RWA_INTEGRITY_INVALID',
    },
  ];
  for (const fixture of cases) {
    const x = structuredClone(v1);
    fixture.mutate(x);
    assert.deepEqual(
      (await sdk.verifyRwaReport(x.proof, x.trust, fixture.at)).reasons,
      [fixture.verify],
      fixture.name
    );
    assert.deepEqual(
      (await sdk.inspectRwaReport(x.proof, x.trust, fixture.at)).reasons,
      [fixture.inspect],
      fixture.name
    );
  }
});
