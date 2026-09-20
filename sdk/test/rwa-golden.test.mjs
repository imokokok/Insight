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
