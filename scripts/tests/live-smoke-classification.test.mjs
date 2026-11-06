import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INFRASTRUCTURE_STATUSES,
  classifyStatusFailure,
  exitCodeForFailureKinds,
} from '../lib/live-smoke-classification.mjs';

test('rate limits and gateway statuses are infrastructure failures', () => {
  for (const status of INFRASTRUCTURE_STATUSES) {
    assert.equal(classifyStatusFailure(status), 'infrastructure');
  }
});

test('an answered contract mismatch is an application failure', () => {
  for (const status of [200, 201, 204, 400, 401, 403, 404, 500]) {
    assert.equal(classifyStatusFailure(status), 'application');
  }
});

test('application failures dominate and infrastructure-only runs exit 2', () => {
  assert.equal(exitCodeForFailureKinds([]), 0);
  assert.equal(exitCodeForFailureKinds(['infrastructure']), 2);
  assert.equal(exitCodeForFailureKinds(['application']), 1);
  assert.equal(exitCodeForFailureKinds(['infrastructure', 'application']), 1);
});
