import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPromotionLineage } from '../lib/promotion-lineage.mjs';
const base = { promotionId: 'base', promotionVersion: 9 },
  a = { promotionId: 'a', promotionVersion: 10, predecessorPromotionId: 'base' },
  b = { promotionId: 'b', promotionVersion: 11, predecessorPromotionId: 'a' };
const all = (...xs) => new Map([base, a, b, ...xs].map((x) => [x.promotionId, x]));
test('governance accepts one or multiple consecutive immutable additions', () => {
  assert.equal(verifyPromotionLineage('base', 'a', [a], all()), a);
  assert.equal(verifyPromotionLineage('base', 'b', [a, b], all()), b);
});
for (const mode of ['gap', 'orphan', 'duplicate', 'rollback', 'wrong-base', 'cycle'])
  test('governance rejects ' + mode, () => {
    let added = [a, b],
      current = 'b',
      previous = 'base',
      map = all();
    if (mode === 'gap') {
      const bad = { ...b, promotionVersion: 12 };
      added = [a, bad];
      map = all(bad);
    }
    if (mode === 'orphan') current = 'a';
    if (mode === 'duplicate') added = [a, b, b];
    if (mode === 'rollback') current = 'base';
    if (mode === 'wrong-base') previous = 'other';
    if (mode === 'cycle') {
      const bad = { ...a, predecessorPromotionId: 'b' };
      added = [bad, b];
      map = all(bad);
    }
    assert.throws(() => verifyPromotionLineage(previous, current, added, map));
  });
