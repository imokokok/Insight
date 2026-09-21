import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = (text) =>
  text
    .replaceAll("from './insight-rwa.js';", "from './rwa';")
    .replaceAll("from './insight-rwa-call.js';", "from './rwa-call';");
const requiredPaths = [
  'sdk/src/rwa.ts',
  'sdk/src/rwa-call.ts',
  'sdk/src/rwa-v2.ts',
  'examples/rwa-v2/golden.json',
  'protocol/rwa-execution-profiles.v1.json',
].sort();
function check(at) {
  const prior = JSON.parse(readFileSync(resolve(at, 'package.json'), 'utf8')).name === 'priorseal';
  const lock = JSON.parse(readFileSync(resolve(at, 'protocol/rwa-source-lock.json'), 'utf8'));
  assert.equal(lock.schema, 'insight-priorseal.rwa-source-lock.v1');
  assert.deepEqual(Object.keys(lock.sha256 ?? {}).sort(), requiredPaths, 'RWA_LOCK_PATHS_INVALID');
  for (const [name, expected] of Object.entries(lock.sha256)) {
    assert.match(expected, /^[0-9a-f]{64}$/, 'RWA_LOCK_HASH_INVALID: ' + name);
    const path =
      name.startsWith('sdk/src/rwa') && prior
        ? name.replace('sdk/src/rwa', 'sdk/src/insight-rwa')
        : name;
    const actual = createHash('sha256')
      .update(canonical(readFileSync(resolve(at, path), 'utf8')))
      .digest('hex');
    assert.equal(actual, expected, 'RWA_SOURCE_DRIFT: ' + path);
  }
  return lock;
}
const lock = check(root),
  peerIndex = process.argv.indexOf('--peer');
if (peerIndex >= 0) {
  assert.ok(process.argv[peerIndex + 1], '--peer requires a repository directory');
  assert.deepEqual(check(resolve(process.argv[peerIndex + 1])), lock, 'RWA_LOCK_DIVERGENCE');
}
console.log(
  'RWA source lock and frozen vectors verified' +
    (peerIndex >= 0 ? ' across both repositories' : ' locally')
);
