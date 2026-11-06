import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePrerequisiteOrder } from '../lib/check-prerequisites.mjs';

test('returns nothing when the requested checks have no prerequisites', () => {
  assert.deepEqual(resolvePrerequisiteOrder(['lint', 'knip'], {}), []);
});

test('orders a producer before its consumer', () => {
  const graph = { 'rwa:execution-profiles': ['sdk:build:unchecked'] };
  assert.deepEqual(resolvePrerequisiteOrder(['lint', 'rwa:execution-profiles'], graph), [
    'sdk:build:unchecked',
  ]);
});

test('resolves transitive prerequisites depth-first', () => {
  const graph = {
    consumer: ['middle'],
    middle: ['producer'],
  };
  assert.deepEqual(resolvePrerequisiteOrder(['consumer'], graph), ['producer', 'middle']);
});

test('does not rerun a producer that is already requested', () => {
  const graph = { consumer: ['producer'] };
  assert.deepEqual(resolvePrerequisiteOrder(['producer', 'consumer'], graph), []);
});

test('rejects a cyclic prerequisite instead of silently dropping it', () => {
  const graph = { consumer: ['a'], a: ['b'], b: ['a'] };
  assert.throws(() => resolvePrerequisiteOrder(['consumer'], graph), /Cyclic check prerequisite/);
});
