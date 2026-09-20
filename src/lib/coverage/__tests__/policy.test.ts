import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { STRICT_COVERAGE_POLICY, coveragePolicyId } from '../../../../sdk/src/coverage';

it('published immutable policy bytes match the server and SDK default', () => {
  const artifact = JSON.parse(
    readFileSync(join(process.cwd(), 'protocol/coverage/policies/strict-300s.v1.json'), 'utf8')
  );
  expect(artifact.policy).toEqual(STRICT_COVERAGE_POLICY);
  expect(artifact.policyId).toBe(coveragePolicyId(STRICT_COVERAGE_POLICY));
});
